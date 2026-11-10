"""On-screen sounds: every visible event that makes a sound in vanilla gets that sound, on its frame.

Owner, 2026-11-10: "on screen sfx as well, if needed/maybe". The harness logs the sounds the client plays
itself (steps, rain, the stunt's ctx.sound calls) but not the ones a real client would add for what the bot
does: a block broken (story_torch: 15 digs, 14 pickups, no break or pickup sound), a block placed, a door
opened, a mob hit, an item picked up, a bell rung, food eaten, TNT lit, thunder. This reads the recording's
marks and block changes, finds each such event within hearing (16 blocks, vanilla's attenuation distance) of
the camera, and checks for a `sound` mark of the right kind near it.

  python3 scripts/onscreen_sfx.py work/<stunt>.rec.json [--story stories/<name>]   # the check: events with no sound
  python3 scripts/onscreen_sfx.py <stunt>                                          # (the package's recording on hb-videos)

audio.py calls fills() for story recordings (a `line` mark), so a story's game track gets the missing sounds.
Not under the narrator's key words (the caption chunks with a capitalised key word): there a minor sound
(pickup, place, dig ticks) is dropped and a causal one (a break, a door, a hit, a death, a fuse) goes in 6 dB
down. Non-story Shorts are untouched.
"""
import gzip
import json
import pathlib
import random
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
HEAR = 16.0          # blocks: vanilla sounds fade to nothing at 16 blocks (volume 1.0)
NEAR_MS = 150        # an existing sound mark within this of the event counts as its sound
FOOD = re.compile(r"apple|bread|beef|pork|chicken|mutton|rabbit|cod|salmon|cookie|melon_slice|carrot|potato|beetroot|stew|soup|pie|berries|kelp|honey_bottle|chorus_fruit|rotten_flesh|spider_eye")
DRINK = re.compile(r"potion|milk_bucket|honey_bottle")

# vanilla SoundType by block name (the common ones; anything else falls back to stone)
GROUPS = [
    (r"^(grass_block|dirt|coarse_dirt|podzol|mycelium|farmland|dirt_path|clay|short_grass|tall_grass|fern|large_fern|.*_leaves|.*_sapling|hay_block|sugar_cane|dead_bush|.*_flower|dandelion|poppy|.*tulip|allium|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony)$", "grass"),
    (r"^(wheat|carrots|potatoes|beetroots|melon_stem|pumpkin_stem)$", "crop"),
    (r"gravel", "gravel"),
    (r"sand$|^sandstone|sand_", "sand"),
    (r"snow", "snow"),
    (r"wool|carpet", "wool"),
    (r"^(bamboo_.*)$", "bamboo_wood"),
    (r"^cherry_", "cherry_wood"),
    (r"^(crimson|warped)_(planks|stem|hyphae|door|trapdoor|fence|fence_gate|slab|stairs|sign|button|pressure_plate)", "nether_wood"),
    (r"planks|_log$|_wood$|fence|_door$|trapdoor|chest|barrel|crafting_table|bookshelf|_stairs$|_slab$|sign|lectern|composter|note_block|jukebox|loom|cartography|fletching|smithing|beehive|bee_nest", "wood"),
    (r"glass|ice$|sea_lantern|beacon", "glass"),
    (r"^(iron_block|gold_block|diamond_block|emerald_block|iron_bars|iron_door|iron_trapdoor|cauldron|hopper|anvil|chipped_anvil|damaged_anvil|bell|blast_furnace|smoker|lightning_rod)$", "metal"),
    (r"copper", "copper"),
    (r"^deepslate|cobbled_deepslate|polished_deepslate", "deepslate"),
    (r"netherrack", "netherrack"),
    (r"nether_brick", "nether_bricks"),
    (r"ladder", "ladder"),
    (r"lantern", "lantern"),
    (r"moss", "moss"),
    (r"mud", "mud"),
    (r"slime", "slime_block"),
    (r"honey_block", "honey_block"),
    (r"scaffolding", "scaffolding"),
    (r"^tuff", "tuff"),
    (r"amethyst", "amethyst_block"),
    (r"sculk", "sculk"),
]
FLUIDS = {"water", "lava", "bubble_column"}
AIRS = {"air", "cave_air", "void_air", "unknown"}
# a sound mark of this kind near the event means it already has its sound
HAS = {"break": r"\.break$|explode", "place": r"\.place$", "door": r"door|gate", "pickup": r"pickup", "hurt": r"\.hurt|attack",
       "death": r"\.death", "bell": r"bell", "chest": r"chest", "eat": r"eat|drink|burp", "primed": r"primed|fuse", "thunder": r"thunder",
       "hit": r"\.hit$"}
MINOR = {"pickup", "place", "hit"}


def defs():
    sys.path.insert(0, str(ROOT))
    import audio
    return json.loads(audio.asset("minecraft/sounds.json").read_text())


def group(name):
    for rx, g in GROUPS:
        if re.search(rx, name):
            return g
    return "stone"


def block_sound(name, act, known):
    for ev in (f"block.{name}.{act}", f"block.{group(name)}.{act}"):
        if ev in known:
            return ev
    return f"block.stone.{act}"


def door_sound(name, opening, known):
    kind = "trapdoor" if "trapdoor" in name else "fence_gate" if "fence_gate" in name else "door"
    mat = "iron" if name.startswith("iron_") else "copper" if "copper" in name else {"bamboo_wood": "bamboo_wood", "cherry_wood": "cherry_wood", "nether_wood": "nether_wood"}.get(group(name), "wooden")
    act = "open" if opening else "close"
    for ev in (f"block.{mat}_{kind}.{act}", f"block.wooden_{kind}.{act}", f"block.{kind}.{act}", f"block.fence_gate.{act}"):
        if ev in known:
            return ev
    return f"block.wooden_door.{act}"


def load_rec(path):
    p = pathlib.Path(path)
    if not p.exists():   # a stunt name: the package on the videos branch
        p = ROOT.parent / "hb-videos" / "shorts" / str(path) / "recording.json.gz"
    raw = p.read_bytes()
    return json.loads(gzip.decompress(raw) if p.suffix == ".gz" else raw), p


def _pose_at(poses, tick):
    if not poses:
        return None
    i = min(max(0, tick - poses[0][0]), len(poses) - 1)
    return poses[i]


def _dist(p, x, y, z):
    return ((p[1] - x) ** 2 + (p[2] + 1.62 - y) ** 2 + (p[3] - z) ** 2) ** 0.5


def _ent_at(ents, eid, tick):
    best = None
    for r in ents.get(eid, ()):
        if r[0] <= tick or best is None:
            best = r
        if r[0] > tick:
            break
    return best


def key_windows(rec, story_dir):
    """[(t0, t1)] seconds (recording time) of every caption chunk that holds a key word (CAPITALISED or a number)."""
    if not story_dir or not (pathlib.Path(story_dir) / "voice" / "voice.json").exists():
        return []
    voice = json.loads((pathlib.Path(story_dir) / "voice" / "voice.json").read_text())["lines"]
    out = []
    for e in rec["timeline"]:
        if e["event"] != "line" or e.get("id") not in voice:
            continue
        v, t = voice[e["id"]], e["t"] / 1000
        for cap, (a, b) in zip(v.get("captions", []), v.get("chunks", [])):
            if any((len(c) > 1 and c.isupper()) or c.isdigit() for c in ("".join(ch for ch in w if ch.isalnum()) for w in cap.split())):
                out.append((t + a - 0.05, t + b + 0.05))
    return out


def story_dir_of(rec):
    """stories/<name> for a story stunt (edit.story in the stunt module), or None."""
    st = rec.get("stunt") or ""
    js = ROOT / "stunts" / f"{st}.js"
    if js.exists():
        m = re.search(r"story:\s*'([^']+)'", js.read_text())
        if m and (ROOT / m.group(1)).exists():
            return str(ROOT / m.group(1))
    cand = ROOT / "stories" / st.replace("story_", "", 1)
    return str(cand) if cand.exists() else None


def events(rec, known=None):
    """Every visible event that makes a sound in vanilla: dicts {t (s), kind, sound, volume, pitch, what, dist, has}."""
    known = known or defs()
    tl, poses = rec["timeline"], rec.get("poses") or []
    rng = random.Random(len(poses))
    sounds = [(e["t"], e.get("sound", "")) for e in tl if e["event"] == "sound"]
    lines = [e["t"] for e in tl if e["event"] in ("line", "start")]
    t_from = (min(lines) - 1000) if lines else 0
    t_to = max([e["t"] for e in tl if e["event"] in ("end", "story_end")] or [len(poses) * 50])
    ents = {}
    for r in rec.get("entities") or []:
        ents.setdefault(r[1], []).append(r)
    digs = [e for e in tl if e["event"] == "dig"]
    acts = [e for e in tl if e["event"] == "block_action"]
    q = [[e["t"] // 50, e["x"], e["y"], e["z"]] for e in digs] + [[e["t"] // 50, e["x"], e["y"], e["z"]] for e in acts]
    rb = json.loads(subprocess.run(["node", str(ROOT / "scripts" / "rec_blocks.js")], input=json.dumps({"rec": rec["_path"], "at": q}),
                                   capture_output=True, text=True, check=True, cwd=ROOT).stdout)
    dig_name = {id(e): n for e, n in zip(digs, rb["at"][:len(digs)])}
    act_name = {id(e): n for e, n in zip(acts, rb["at"][len(digs):])}
    out = []

    def add(t_ms, kind, sound, what, xyz=None, volume=1.0, pitch=1.0):
        if not (t_from <= t_ms <= t_to):
            return
        p = _pose_at(poses, t_ms // 50)
        d = _dist(p, *xyz) if (p and xyz) else 0.0
        if d > HEAR:
            return
        rx = re.compile(HAS[kind])
        has = any(abs(st - t_ms) <= NEAR_MS and rx.search(sn) for st, sn in sounds)
        out.append({"t": t_ms / 1000, "kind": kind, "sound": sound, "volume": volume, "pitch": pitch, "what": what, "dist": round(d, 1), "has": has})

    # player digging: the hit sound every 4 ticks while mining, then the break (dig_end ok)
    broken = set()
    for i, e in enumerate(tl):
        if e["event"] != "dig":
            continue
        end = next((x for x in tl[i + 1:] if x["event"] == "dig_end"), None)
        name = dig_name.get(id(e), "stone")
        xyz = (e["x"] + 0.5, e["y"] + 0.5, e["z"] + 0.5)
        if end and end.get("ok"):
            for t in range(e["t"] + 200, end["t"] - 50, 200):
                add(t, "hit", block_sound(name, "hit", known), f"digging {name}", xyz, 0.25, 0.5)
            add(end["t"], "break", block_sound(name, "break", known), f"broke {name}", xyz, 1.0, 0.8)
            broken.add((e["x"], e["y"], e["z"]))
    # block changes: places, breaks the bot didn't dig, doors; a tick with many changes is staging (/fill), not an action
    per_tick = {}
    for c in rb["changes"]:
        per_tick[c[0]] = per_tick.get(c[0], 0) + 1
    seen_doors = set()
    for tick, x, y, z, a, b, pa, pb in rb["changes"]:
        if per_tick[tick] > 4 or a in FLUIDS or b in FLUIDS or "fire" in (a + b):
            continue
        xyz, t = (x + 0.5, y + 0.5, z + 0.5), tick * 50
        if a in AIRS and "anvil" in b:   # a falling anvil landing (the stunt drops them)
            add(t, "place", "block.anvil.land", f"{b} landed", xyz, 0.3, rng.random() * 0.1 + 0.9)
        elif a in AIRS and b not in AIRS:
            add(t, "place", block_sound(b, "place", known), f"placed {b}", xyz, 1.0, 0.8)
        elif b in AIRS and a not in AIRS and (x, y, z) not in broken:
            add(t, "break", block_sound(a, "break", known), f"{a} broke", xyz, 1.0, 0.8)
        elif a == b and "open" in pa and pa.get("open") != pb.get("open"):
            k = (tick, a, x, z)
            if k in seen_doors:
                continue
            seen_doors.add(k)
            opening = pb.get("open") == "true"
            add(t, "door", door_sound(b, opening, known), f"{b} {'opened' if opening else 'closed'}", xyz, 1.0, rng.random() * 0.1 + 0.9)
    for e in tl:
        ev, t = e["event"], e["t"]
        if ev == "collect" and e.get("by") == "self":
            p = _pose_at(poses, t // 50)
            add(t, "pickup", "entity.item.pickup", "picked up an item", p[1:4] if p else None, 0.2, ((rng.random() - rng.random()) * 0.7 + 1.0) * 2.0)
        elif ev in ("mob_hurt", "mob_death"):
            r = _ent_at(ents, e.get("id"), t // 50)
            typ = r[2] if r else "generic"
            snd = f"entity.{typ}.{'hurt' if ev == 'mob_hurt' else 'death'}"
            if snd not in known:
                snd = f"entity.generic.{'hurt' if ev == 'mob_hurt' else 'death'}"
            add(t, "hurt" if ev == "mob_hurt" else "death", snd, f"{typ} {'hit' if ev == 'mob_hurt' else 'died'}", r[3:6] if r else None, 1.0, (rng.random() - rng.random()) * 0.2 + 1.0)
        elif ev == "block_action":
            name = act_name.get(id(e), "")
            xyz = (e["x"] + 0.5, e["y"] + 0.5, e["z"] + 0.5)
            if name == "bell":
                add(t, "bell", "block.bell.use", "bell rung", xyz, 2.0, 1.0)
            elif name in ("chest", "trapped_chest", "ender_chest", "barrel") and e.get("a") == 1:
                pre = "ender_chest" if name == "ender_chest" else "barrel" if name == "barrel" else "chest"
                add(t, "chest", f"block.{pre}.{'open' if e.get('b', 0) > 0 else 'close'}", f"{name} {'opened' if e.get('b', 0) > 0 else 'closed'}", xyz, 0.5, rng.random() * 0.1 + 0.9)
        elif ev == "use_start" and e.get("item"):
            stop = next((x["t"] for x in tl if x["event"] == "use_stop" and x["t"] > t), t + 1600)
            item = e["item"]
            p = _pose_at(poses, t // 50)
            if DRINK.search(item):
                for tt in range(t + 350, stop, 200):
                    add(tt, "eat", "entity.generic.drink", f"drinking {item}", p[1:4] if p else None, 0.5, rng.random() * 0.1 + 0.9)
            elif FOOD.search(item):
                for tt in range(t + 350, stop, 200):
                    add(tt, "eat", "entity.generic.eat", f"eating {item}", p[1:4] if p else None, 0.5 + 0.5 * rng.randint(0, 1), (rng.random() - rng.random()) * 0.2 + 1.0)
        elif ev == "cart_primed":
            r = _ent_at(ents, e.get("id"), t // 50)
            add(t, "primed", "entity.tnt.primed", "TNT lit", r[3:6] if r else None)
        elif ev == "lightning":
            add(t, "thunder", "entity.lightning_bolt.thunder", "lightning", None, 2.0, 0.8 + rng.random() * 0.2)
    # TNT entities that appear (lit TNT) with no fuse sound
    first_seen = {}
    for r in rec.get("entities") or []:
        if r[2] == "tnt" and r[1] not in first_seen:
            first_seen[r[1]] = r
    for r in first_seen.values():
        add(r[0] * 50, "primed", "entity.tnt.primed", "TNT lit", r[3:6])
    return sorted(out, key=lambda o: o["t"])


def fills(rec, story_dir=None, known=None):
    """The missing sounds to play: (t, sound, volume, pitch, note), with the key-word rule applied."""
    keys = key_windows(rec, story_dir)
    out = []
    for o in events(rec, known):
        if o["has"]:
            continue
        on_key = any(a <= o["t"] <= b for a, b in keys)
        if on_key and o["kind"] in MINOR:
            continue
        out.append((o["t"], o["sound"], o["volume"] * (0.5 if on_key else 1.0), o["pitch"], o["what"] + (" (under a key word: -6 dB)" if on_key else "")))
    return out


def report(rec, story_dir=None):
    ev = events(rec)
    keys = key_windows(rec, story_dir)
    miss = [o for o in ev if not o["has"]]
    print(f"{len(ev)} visible sound-making events, {len(ev) - len(miss)} with a sound mark, {len(miss)} without")
    for o in miss:
        tag = "key word" if any(a <= o["t"] <= b for a, b in keys) else ""
        print(f"  {o['t']:7.2f}s  {o['what']:<34} -> {o['sound']:<32} {o['dist']:5.1f} blocks  {tag}")
    return miss


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("rec")
    ap.add_argument("--story")
    a = ap.parse_args()
    rec, p = load_rec(a.rec)
    rec["_path"] = str(p)   # rec_blocks.js reads the file itself (gzipped or not)
    report(rec, a.story or story_dir_of(rec))
