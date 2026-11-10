"""The cast's motion in a recording (docs/STANDARDS.md 3b.2): the safety net behind lib/story.js K.actor / K.cutShot,
which make it smooth by construction. rec_check.py reports both as BLOCKers.

  late_landings(ents, tl, P)   a cast member that jumps more than 0.5 block 1-4 ticks after a cut's frame: the new
                               shot's first frames show it in its old spot, then it pops or glides (dog_hill: the cast
                               landed 1-2 ticks after every shot mark)
  stepped(ents, tl, P)         a cast member that moves in stair steps: it holds still 2+ ticks, then moves, again and
                               again while it is moving (under 20 Hz). The server's tracker sends a mob's move every
                               3rd tick unless its synced data changed, so a stunt's own per-tick /tp reached the
                               recording at 6.7 Hz (dog_hill's beg hop: "the villager keeps teleporting")

The cast: the entities the kit marked ('actor' marks: K.actor), else (older recordings) the staged mobs: a jump of 4+
blocks in one tick (from or to a park) or K.actor's +-0.002 keep-alive jitter. Ambient mobs also move every 3rd tick (vanilla's
tracker), but render.js eases those like the vanilla client, and they are not checked.
Rows: rec.entities [tick, id, name, x, y, z, yaw, pitch, headYaw, extra]; P: rec.poses [tick, x, y, z, yaw, pitch, ...].
"""
import math
import statistics

JUMP = 0.5        # blocks in one tick: a jump, not a step (K.actor walks at <= 0.3)
LATE = 4          # ticks after the cut's frame a jump still counts as the cast landing late
PARK = 4.0        # (older recordings) a jump this long in one tick is a staged teleport, not a mob's walk
MOVE = 0.01       # blocks: smaller changes are K.actor's +-0.002 keep-alive jitter, not motion
TURN = math.radians(3)
SKIP = {"item", "experience_orb", "arrow", "spectral_arrow", "trident", "snowball", "egg", "ender_pearl", "potion",
        "splash_potion", "lingering_potion", "experience_bottle", "falling_block", "moving_block", "firework_rocket",
        "fishing_bobber", "player", "tnt", "area_effect_cloud", "lightning_bolt", "marker"}


def tracks(ents):
    """id -> rows sorted by tick (players, items and projectiles left out)"""
    out = {}
    for r in ents:
        if r[2] in SKIP:
            continue
        out.setdefault(r[1], []).append(r)
    for rows in out.values():
        rows.sort(key=lambda r: r[0])
    return out


def _wrap(a):
    while a > math.pi:
        a -= 2 * math.pi
    while a <= -math.pi:
        a += 2 * math.pi
    return a


def cut_frames(tl, P):
    """[(tick, kind)]: the tick the new shot's picture starts. A camera 'shot' mark switches the picture on its own
    tick; a 'cut' (K.cut / a /tp of the player) when the player's pose lands (the first jump within 10 ticks)."""
    out = []
    for e in tl:
        ev = e.get("event")
        if ev not in ("shot", "cut"):
            continue
        t = int(round(e["t"] / 50))
        if ev == "cut" and P:
            for i in range(max(1, t), min(len(P), t + 11)):
                a, b = P[i - 1], P[i]
                if math.dist(a[1:4], b[1:4]) > 0.3 or abs(_wrap(b[4] - a[4])) > 0.2 or abs(b[5] - a[5]) > 0.2:
                    t = i
                    break
        out.append((t, ev if ev == "cut" else f"shot '{e.get('name')}'"))
    seen, uniq = set(), []
    for t, k in sorted(out):
        if t not in seen:
            seen.add(t)
            uniq.append((t, k))
    return uniq


def _by_tick(rows):
    return {r[0]: r for r in rows}


def cast_ids(tr, tl):
    """the cast: the 'actor' marks; in older recordings, the staged mobs: an entity that jumps PARK+ blocks in one tick
    (in from or out to a park: no mob walks that) or carries K.actor's keep-alive jitter (x alone moving +-0.004)"""
    marked = {e["id"]: e.get("tag") for e in tl if e.get("event") == "actor" and e.get("id") is not None}
    if marked:
        return {i: marked[i] for i in marked if i in tr}
    out = {}
    for eid, rows in tr.items():
        if rows[0][2] == "enderman":
            continue
        jit = 0
        for a, b in zip(rows, rows[1:]):
            if b[0] != a[0] + 1:
                continue
            if math.dist(a[3:6], b[3:6]) >= PARK:
                out[eid] = None
                break
            if 0.003 <= abs(b[3] - a[3]) <= 0.005 and b[4] == a[4] and b[5] == a[5]:
                jit += 1
                if jit >= 6:
                    out[eid] = None
                    break
    return out


def late_landings(ents, tl, P):
    """-> [{tick, id, name, tag, blocks, late, cut, kind}]: one per cut and cast member that lands 1-4 ticks late"""
    tr = tracks(ents)
    cuts = cut_frames(tl, P)
    cast = cast_ids(tr, tl)
    out = []
    for c, kind in cuts:
        for eid, tag in cast.items():
            bt = _by_tick(tr[eid])
            for t in range(c + 1, c + LATE + 1):
                if t in bt and t - 1 in bt:
                    d = math.dist(bt[t][3:6], bt[t - 1][3:6])
                    if d > JUMP:
                        out.append({"tick": t, "id": eid, "name": bt[t][2], "tag": tag, "blocks": round(d, 2), "late": t - c, "cut": c, "kind": kind})
                        break
    return out


def stepped(ents, tl, P, min_moves=6, min_steps=4, share=0.5, gap=4):
    """-> [{tick, end, id, name, tag, moves, steps, every}]: a cast member's stretches of motion (moves no more than `gap`
    ticks apart) where `min_steps`+ moves, and `share` of them, come after a hold of 2+ ticks"""
    tr = tracks(ents)
    cast = cast_ids(tr, tl)
    out = []
    for eid, tag in cast.items():
        rows = tr[eid]
        mv = []
        for a, b in zip(rows, rows[1:]):
            if b[0] != a[0] + 1:
                continue
            if math.dist(a[3:6], b[3:6]) > MOVE or abs(_wrap((b[6] or 0) - (a[6] or 0))) > TURN:
                mv.append(b[0])
        runs, cur = [], []
        for t in mv:
            if cur and t - cur[-1] > gap:
                runs.append(cur)
                cur = []
            cur.append(t)
        if cur:
            runs.append(cur)
        for run in runs:
            if len(run) < min_moves:
                continue
            gaps = [b - a for a, b in zip(run, run[1:])]
            steps = sum(1 for g in gaps if g >= 3)
            if steps >= min_steps and steps >= share * len(gaps):
                out.append({"tick": run[0], "end": run[-1], "id": eid, "name": rows[0][2], "tag": tag, "moves": len(run),
                            "steps": steps, "every": statistics.median(gaps)})
    return sorted(out, key=lambda f: f["tick"])


def who(f):
    return f"{f['name']} #{f['id']}" + (f" ('{f['tag']}')" if f.get("tag") else "")


def messages(ents, tl, P):
    """-> [(tick, msg)] for rec_check (BLOCKers)"""
    out = []
    for f in late_landings(ents, tl, P):
        out.append((f["tick"], f"cast {who(f)} jumps {f['blocks']:.2f} blocks {f['late']} tick(s) after the cut ({f['kind']}, tick {f['cut']}): "
                    "the new shot's first frames show it in its old spot (or not there yet). Place the cast with K.cutShot(name, moves) or K.cut(..., { after }) "
                    "(the cut waits until they land), never a K.shot right after moving them"))
    for f in stepped(ents, tl, P):
        secs = (f["end"] - f["tick"]) / 20
        out.append((f["tick"], f"cast {who(f)} moves in stair steps for {secs:.1f}s: {f['steps']} of its {f['moves']} moves come after a "
                    f"2+ tick hold (every ~{f['every']:.0f} ticks, {20 / max(1, f['every']):.1f} Hz; it reads as teleporting). Move it with "
                    "K.actor (20 Hz by construction), never a stunt's own /tp loop"))
    return sorted(out)
