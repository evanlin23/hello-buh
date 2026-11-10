"""Read the HelloBuh shared world's surveyed region files (stunts/_world_survey.js copies them to the world cache) into
a compact top-down grid, and list what the seed generated: heights, top blocks, water, biomes and structure starts.

    python3 scripts/world_survey.py [--cache ~/.cache/hellobuh/world/survey] [--out docs/world/survey.json]

Writes <cache>/grid.npz (per block column: top y, top block id, water depth, biome id; the lookup tables beside them)
for scripts/world_map.py, and docs/world/survey.json (small, committed): the seed, the area, the structures and
biomes found, and height stats per canonical place in docs/world/map.json. Region files are never committed.
"""
import argparse
import io
import json
import math
import os
import pathlib
import struct
import zlib

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent.parent
MIN_Y = -64


# --- a minimal NBT reader (big-endian, the Anvil chunk format) ---
def _read(buf, t):
    if t == 1:
        return struct.unpack(">b", buf.read(1))[0]
    if t == 2:
        return struct.unpack(">h", buf.read(2))[0]
    if t == 3:
        return struct.unpack(">i", buf.read(4))[0]
    if t == 4:
        return struct.unpack(">q", buf.read(8))[0]
    if t == 5:
        return struct.unpack(">f", buf.read(4))[0]
    if t == 6:
        return struct.unpack(">d", buf.read(8))[0]
    if t == 7:
        n = struct.unpack(">i", buf.read(4))[0]
        return buf.read(n)
    if t == 8:
        n = struct.unpack(">H", buf.read(2))[0]
        return buf.read(n).decode("utf-8", "replace")
    if t == 9:
        et = buf.read(1)[0]
        n = struct.unpack(">i", buf.read(4))[0]
        return [_read(buf, et) for _ in range(n)]
    if t == 10:
        out = {}
        while True:
            et = buf.read(1)[0]
            if et == 0:
                return out
            n = struct.unpack(">H", buf.read(2))[0]
            name = buf.read(n).decode("utf-8", "replace")
            out[name] = _read(buf, et)
    if t == 11:
        n = struct.unpack(">i", buf.read(4))[0]
        return np.frombuffer(buf.read(4 * n), dtype=">i4")
    if t == 12:
        n = struct.unpack(">i", buf.read(4))[0]
        return np.frombuffer(buf.read(8 * n), dtype=">i8")
    raise ValueError(f"nbt tag {t}")


def nbt(data):
    buf = io.BytesIO(data)
    t = buf.read(1)[0]
    n = struct.unpack(">H", buf.read(2))[0]
    buf.read(n)
    return _read(buf, t)


def unpack(longs, bits, count):
    """Values packed `bits` wide, 64 // bits per long, no spanning (1.16+)."""
    per = 64 // bits
    a = np.asarray(longs).astype(">i8").view(">u8").astype(np.uint64)
    out = np.zeros(len(a) * per, dtype=np.uint64)
    mask = np.uint64((1 << bits) - 1)
    for i in range(per):
        out[i::per] = (a >> np.uint64(i * bits)) & mask
    return out[:count].astype(np.int64)


def chunks(path):
    with open(path, "rb") as f:
        head = f.read(8192)
        for i in range(1024):
            off = int.from_bytes(head[i * 4:i * 4 + 3], "big")
            if not off:
                continue
            f.seek(off * 4096)
            n, comp = struct.unpack(">iB", f.read(5))
            raw = f.read(n - 1)
            if comp == 2:
                raw = zlib.decompress(raw)
            elif comp == 1:
                import gzip
                raw = gzip.decompress(raw)
            yield nbt(raw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=os.path.expanduser(os.environ.get("HB_WORLD_CACHE", "~/.cache/hellobuh/world")) + "/survey")
    ap.add_argument("--out", default=str(HERE / "docs" / "world" / "survey.json"))
    a = ap.parse_args()
    cache = pathlib.Path(a.cache)
    meta = json.loads((cache / "survey.json").read_text())
    x0, z0, x1, z1 = meta["area"]
    W, H = x1 - x0, z1 - z0
    top = np.full((H, W), -9999, np.int16)        # the top block's y (WORLD_SURFACE: leaves and water count)
    ground = np.full((H, W), -9999, np.int16)     # the top solid ground (OCEAN_FLOOR: under water, leaves count)
    block = np.zeros((H, W), np.int16)            # the top block (index into names)
    biome = np.zeros((H, W), np.int16)
    names, bnames = ["unknown"], ["unknown"]
    nid, bid = {"unknown": 0}, {"unknown": 0}
    structs = []
    n = 0
    for path in sorted((cache / "region").glob("r.*.mca")):
        for c in chunks(path):
            cx, cz = c.get("xPos"), c.get("zPos")
            if cx is None or not str(c.get("Status", "")).endswith("full"):
                continue
            bx, bz = cx * 16 - x0, cz * 16 - z0
            if bx + 16 <= 0 or bz + 16 <= 0 or bx >= W or bz >= H:
                continue
            n += 1
            hm = c.get("Heightmaps", {})
            ws = unpack(hm["WORLD_SURFACE"], 9, 256).reshape(16, 16) + MIN_Y - 1 if "WORLD_SURFACE" in hm else None
            of = unpack(hm["OCEAN_FLOOR"], 9, 256).reshape(16, 16) + MIN_Y - 1 if "OCEAN_FLOOR" in hm else None
            secs = {}
            for s in c.get("sections", []):
                secs[s["Y"]] = s
            for (dz, dx) in np.ndindex(16, 16):
                X, Z = bx + dx, bz + dz
                if not (0 <= X < W and 0 <= Z < H) or ws is None:
                    continue
                y = int(ws[dz, dx])
                top[Z, X] = y
                ground[Z, X] = int(of[dz, dx]) if of is not None else y
            # top block per column, and the biome at the surface
            cache_states = {}
            for (dz, dx) in np.ndindex(16, 16):
                X, Z = bx + dx, bz + dz
                if not (0 <= X < W and 0 <= Z < H) or ws is None:
                    continue
                y = int(ws[dz, dx])
                sy = y >> 4
                s = secs.get(sy)
                name = "air"
                if s is not None:
                    bs = s.get("block_states", {})
                    pal = bs.get("palette", [])
                    if sy not in cache_states:
                        if "data" in bs and len(pal) > 1:
                            bits = max(4, math.ceil(math.log2(len(pal))))
                            cache_states[sy] = unpack(bs["data"], bits, 4096)
                        else:
                            cache_states[sy] = None
                    st = cache_states[sy]
                    i = 0 if st is None else int(st[((y & 15) * 256) + dz * 16 + dx])
                    if i < len(pal):
                        name = pal[i]["Name"].replace("minecraft:", "")
                if name not in nid:
                    nid[name] = len(names); names.append(name)
                block[Z, X] = nid[name]
                # biome (4x4x4 cells)
                bname = "unknown"
                if s is not None:
                    bb = s.get("biomes", {})
                    bpal = bb.get("palette", [])
                    if bpal:
                        if "data" in bb and len(bpal) > 1:
                            bits = math.ceil(math.log2(len(bpal)))
                            arr = unpack(bb["data"], bits, 64)
                            j = int(arr[((y & 15) >> 2) * 16 + (dz >> 2) * 4 + (dx >> 2)])
                        else:
                            j = 0
                        bname = str(bpal[j]).replace("minecraft:", "")
                if bname not in bid:
                    bid[bname] = len(bnames); bnames.append(bname)
                biome[Z, X] = bid[bname]
            st = c.get("structures", {}).get("starts", {})
            for sid, s in st.items():
                if s.get("id", "INVALID") == "INVALID":
                    continue
                kids = s.get("Children", [])
                bbs = [list(map(int, k["BB"])) for k in kids if "BB" in k]
                if bbs:
                    bx0 = min(b[0] for b in bbs); bz0 = min(b[2] for b in bbs); bx1 = max(b[3] for b in bbs); bz1 = max(b[5] for b in bbs)
                else:
                    bx0 = bx1 = cx * 16 + 8; bz0 = bz1 = cz * 16 + 8
                structs.append({"id": sid.replace("minecraft:", ""), "chunk": [cx, cz], "x": (bx0 + bx1) // 2, "z": (bz0 + bz1) // 2, "box": [bx0, bz0, bx1, bz1], "pieces": len(kids)})
    np.savez_compressed(cache / "grid.npz", top=top, ground=ground, block=block, biome=biome, names=np.array(names), bnames=np.array(bnames), origin=np.array([x0, z0]))
    known = top > -9999
    water = np.isin(block, [nid[k] for k in ("water",) if k in nid]) & known
    counts = {}
    for i, b in enumerate(bnames):
        k = int((biome == i).sum())
        if k:
            counts[b] = round(k / max(1, known.sum()), 4)
    out = {
        "_": "What seed hellobuh generates over the surveyed area (scripts/world_survey.py from the region files stunts/_world_survey.js saved). Regenerate after changing the seed or the area.",
        "seed": meta["seed"], "area": meta["area"], "chunks": n, "coverage": round(float(known.mean()), 4),
        "water_share": round(float(water.sum() / max(1, known.sum())), 4),
        "height": {"min": int(top[known].min()) if known.any() else None, "max": int(top[known].max()) if known.any() else None, "median": int(np.median(top[known])) if known.any() else None},
        "biomes": dict(sorted(counts.items(), key=lambda kv: -kv[1])),
        "structures": sorted(structs, key=lambda s: (s["id"], s["x"], s["z"])),
    }
    pathlib.Path(a.out).write_text(json.dumps(out, indent=1) + "\n")
    print(f"{n} chunks, coverage {out['coverage']}, {len(structs)} structures -> {a.out}, {cache / 'grid.npz'}")


if __name__ == "__main__":
    main()
