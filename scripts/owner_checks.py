"""Owner notes as automatic checks (docs/lessons.md "Process lessons (2026-11-11)": owner notes become checks).
Shared by scripts/rec_check.py (./hb check, on the recording, before the render) and scripts/pace.py (on the finished
Short; scripts/gates.py stamps pace on every package, so the uploader skips a Short that fails them).

  aim     (r:rffba12, owner 2026-11-11: "for the torch, we need to look where we are placing/breaking, its fine to be
          fast but right now it just looks like hacking"; "the rainbow sheep we are not looking at the right sheep when
          we dye"; heart_art and sword_art "doesn't really track"; creeper_art "tracks where we're placing the blocks
          the best"). Every player action in the Short (a place, a break, a block used, an entity used: dye, shear,
          name tag...) and its aim error: the angle between the crosshair's ray and the target (lib/aim.js, measured by
          scripts/rec_sight.js). BLOCK: an action over AIM_BLOCK_DEG or off-screen, or more than AIM_SHARE_MAX of the
          actions over AIM_MAX_DEG (a build that doesn't track). Not counted: F1 (the drone camera) and camera shots
          (the picture isn't the player's eye), cut spans, outside the edit.
  settle  (r:r24d99a, owner 2026-11-11: "for the torch sand falling, we should let the last pillar of sand all fall
          before we end/cut"). Falling blocks (sand, gravel, anvils, concrete powder), explosion debris (items and
          blocks thrown by a blast) and a mob's death (the 1 s fall-over and the poof) still moving in view on the last
          frames before a hard cut or the end: BLOCK. settle_after() gives the time it all comes to rest, so pace's
          "1 s after the payoff" counts from there.

    python3 scripts/owner_checks.py <rec.json[.gz]>       # the raw aim table and the debris tracks (debugging)
"""
from __future__ import annotations

import json
import math
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------- aim
# Tuned 2026-11-11 on the packages (in the edit, first person): creeper_art (owner's reference) median 0, 5% over 6 deg,
# worst 12; skull_art / looks_wrong worst 7-9; against heart_art (72% over 6, median 11), sword_art (67%, median 11),
# sand_tower's torches (up to 19) and rainbow_sheep's dyes (11-21 deg: the wrong sheep in the crosshair).
AIM_MAX_DEG = 6.0      # an action over this is off the target ("~6 deg" in the owner rule's check)
AIM_BLOCK_DEG = 15.0   # one action this far off (or off-screen) blocks on its own (creeper_art's worst: 12.1)
AIM_SHARE_MAX = 0.10   # more than this share of the actions over AIM_MAX_DEG blocks (a build that doesn't track)
AIM_SHARE_MIN_N = 5    # the share rule needs this many actions (1 of 3 at 7 deg is one slightly-off dig, not a build)
AIM_LIST = 5           # one-off blockers listed one by one (the rest counted)


def sight_json(rec_p) -> dict:
    """scripts/rec_sight.js --json over the recording -> {digs, places, found, aim} or {error}."""
    try:
        res = subprocess.run(["node", str(HERE / "scripts" / "rec_sight.js"), str(pathlib.Path(rec_p).resolve()), "--json"],
                             capture_output=True, text=True, cwd=HERE)
    except OSError as e:
        return {"error": str(e)}
    if res.returncode != 0:
        err = (res.stderr or "").strip().splitlines() or ["?"]
        why = next((ln.strip() for ln in reversed(err) if "Cannot find module" in ln or "Error" in ln), err[-1].strip())
        return {"error": why + (" (run `npm ci`)" if "Cannot find module" in why else "")}
    try:
        return json.loads((res.stdout or "").strip().splitlines()[-1])
    except (ValueError, IndexError):
        return {"error": "rec_sight.js printed no JSON"}


def f1_spans(tl):
    out, on = [], None
    for e in sorted(tl, key=lambda e: e["t"]):
        if e["event"] == "f1_on" and on is None:
            on = e["t"] / 50
        elif e["event"] == "f1_off" and on is not None:
            out.append((on, e["t"] / 50)); on = None
    if on is not None:
        out.append((on, 1e9))
    return out


def aim_report(sight_res: dict, keep) -> dict:
    """The aim check over the actions `keep(tick)` lets in (in the Short, first person) -> {n, median, p90, worst,
    over, share, onAim, ok, findings: [(level, tick, msg)], summary}."""
    acts = [a for a in (sight_res.get("aim") or {}).get("actions", []) if keep(a["tick"])]
    D = sorted(a["deg"] for a in acts)
    q = lambda p: D[min(len(D) - 1, int(p * len(D)))] if D else None
    over = [a for a in acts if a["deg"] > AIM_MAX_DEG]
    share = len(over) / len(acts) if acts else 0.0
    F = []
    def what(a):
        verb = {"place": "placing", "break": "breaking", "use": "using", "entity": "using"}[a["kind"]]
        at = f" at {a['x']} {a['y']} {a['z']}" if a.get("x") is not None else ""
        return f"{verb} {a['what']}{at}"
    bad = [a for a in acts if not a["onScreen"] or a["deg"] > AIM_BLOCK_DEG]
    for a in bad[:AIM_LIST]:
        F.append(("BLOCK", a["tick"], f"{what(a)} " + (f"with the target off-screen ({a['deg']:.1f} deg off the crosshair)" if not a["onScreen"]
                  else f"{a['deg']:.1f} deg off the crosshair (max {AIM_BLOCK_DEG:g}): it reads as hacking")))
    if len(bad) > AIM_LIST:
        F.append(("BLOCK", bad[AIM_LIST]["tick"], f"{len(bad) - AIM_LIST} more action(s) over {AIM_BLOCK_DEG:g} deg or off-screen (python3 scripts/owner_checks.py <rec> lists them all)"))
    if share > AIM_SHARE_MAX and len(acts) >= AIM_SHARE_MIN_N:
        worst = sorted(over, key=lambda a: -a["deg"])[:3]
        F.append(("BLOCK", over[0]["tick"], f"{len(over)}/{len(acts)} actions ({share * 100:.0f}%, max {AIM_SHARE_MAX * 100:.0f}%) land over "
                  f"{AIM_MAX_DEG:g} deg off the crosshair (median {q(0.5):.1f}): the view doesn't track the action. Worst: "
                  + "; ".join(f"src {a['tick'] / 20:.2f}s {what(a)} {a['deg']:.1f} deg" for a in worst)))
    elif over and not bad:
        w = max(over, key=lambda a: a["deg"])
        F.append(("WARN", w["tick"], f"{len(over)}/{len(acts)} actions over {AIM_MAX_DEG:g} deg off the crosshair (under the "
                  f"{AIM_SHARE_MAX * 100:.0f}% that blocks); worst {what(w)} {w['deg']:.1f} deg"))
    fix = (" (aim before the action: lib/act.js A.place / A.dig / A.use / A.useOn, or K.place / K.dig / K.use / K.useOn in a story;"
           " a factory's own packet through A.click / A.breakStart / A.strike, gated on the crosshair; STANDARDS r:rffba12)")
    F = [(lvl, t, m + (fix if lvl == "BLOCK" else "")) for lvl, t, m in F]
    nb = sum(1 for f in F if f[0] == "BLOCK")
    summ = (f"{len(acts)} action(s): median {q(0.5):.1f} deg, p90 {q(0.9):.1f}, worst {D[-1]:.1f}, {len(over)} over {AIM_MAX_DEG:g} deg "
            f"({share * 100:.0f}%), {sum(1 for a in acts if a['deg'] == 0)} dead on" if acts else "no player actions in the Short")
    return {"n": len(acts), "median": q(0.5), "p90": q(0.9), "worst": D[-1] if D else None, "over": len(over), "share": round(share, 3),
            "ok": nb == 0, "blockers": nb, "findings": F, "summary": summ}


# ---------------------------------------------------------------- settle
FALLING = ("falling_block",)
SETTLE_DIST = 32       # blocks from the camera
SETTLE_CONE = 40       # degrees off the view axis (rec_check in_view)
DEBRIS_V = 0.1         # blocks/tick (2 b/s): an item moving faster than this is still flying (slower: sliding to rest)
DEATH_TICKS = 20       # LivingEntity death: 20 ticks of falling over, then the poof
SETTLE_GRACE = 0.15    # s of motion left after a cut/end that still passes (a last bounce as it lands)


def debris_tracks(rec) -> list:
    """Things whose motion is a payoff: [{kind, name, id, t0, t1 (ticks), pos: {tick: (x, y, z)}}].
    falling blocks (alive = falling), items/falling blocks thrown by an explosion (while they still move), a mob's death
    (its mark to +DEATH_TICKS)."""
    tl = rec.get("timeline", [])
    rows = {}
    for r in rec.get("entities") or []:
        rows.setdefault(r[1], []).append(r)
    booms = sorted(e["t"] / 50 for e in tl if e["event"] == "particles" and e.get("type") == "explosion")
    out = []
    for eid, rs in rows.items():
        name = rs[0][2]
        if name in FALLING:
            out.append({"kind": "falling", "name": (rs[0][9] or {}).get("block") or name, "id": eid, "t0": rs[0][0], "t1": rs[-1][0],
                        "pos": {r[0]: (r[3], r[4], r[5]) for r in rs}})
        elif name == "item" and booms:
            t0 = rs[0][0]
            if not any(0 <= t0 - b <= 10 for b in booms):
                continue
            last = t0
            for a, b in zip(rs, rs[1:]):
                if math.dist(a[3:6], b[3:6]) / max(1, b[0] - a[0]) > DEBRIS_V:
                    last = b[0]
            if last > t0:
                out.append({"kind": "debris", "name": (rs[0][9] or {}).get("item") or "item", "id": eid, "t0": t0, "t1": last,
                            "pos": {r[0]: (r[3], r[4], r[5]) for r in rs}})
    for e in tl:
        if e["event"] == "mob_death" and e.get("id") in rows:
            k = e["t"] / 50
            rs = rows[e["id"]]
            out.append({"kind": "death", "name": rs[0][2], "id": e["id"], "t0": k, "t1": k + DEATH_TICKS, "pos": {r[0]: (r[3], r[4], r[5]) for r in rs}})
    return out


def _pos(tr, k):
    ks = [t for t in tr["pos"] if t <= k]
    return tr["pos"][max(ks)] if ks else tr["pos"][min(tr["pos"])]


def in_view(cam, p, max_d=SETTLE_DIST, cone=SETTLE_CONE):
    """cam (x, y, z, yaw, pitch, eye_h) as rec_check's Camera.at."""
    dx, dy, dz = p[0] - cam[0], p[1] + 0.5 - (cam[1] + cam[5]), p[2] - cam[2]
    d = math.sqrt(dx * dx + dy * dy + dz * dz)
    if d > max_d:
        return False
    if d < 1.5:
        return True
    v = (-math.sin(cam[3]) * math.cos(cam[4]), math.sin(cam[4]), -math.cos(cam[3]) * math.cos(cam[4]))
    return (dx * v[0] + dy * v[1] + dz * v[2]) / d >= math.cos(math.radians(cone))


def pose_cam(rec):
    """A camera from the recorded poses (rec_check's Camera without the cut extrapolation): tick -> (x, y, z, yaw, pitch, eye)."""
    P = rec["poses"]
    def at(k):
        q = P[max(0, min(len(P) - 1, int(round(k))))]
        return (q[1], q[2], q[3], q[4], q[5], 1.27 if (len(q) > 7 and (q[7] or 0) & 1) else 1.62)
    return at


def moving(tracks, k, cam_at, any_view=False, seen=0):
    """The tracks still in motion at tick k and in view of the camera there (any_view: within SETTLE_DIST, any way).
    seen: only those moving for at least this many ticks by k (a mob /kill'ed on the cut's own tick is never seen)."""
    out = []
    for tr in tracks:
        if not (tr["t0"] <= k - seen and tr["t0"] <= k <= tr["t1"]):
            continue
        p = _pos(tr, k)
        c = cam_at(k)
        if (math.dist(p, c[:3]) <= SETTLE_DIST) if any_view else in_view(c, p):
            out.append(tr)
    return out


def settle_after(tracks, k, cam_at, horizon=200, any_view=False):
    """The first tick >= k from which nothing is in motion in view for 3 ticks (None: still moving at k + horizon).
    Only what is in view at k (or comes into it) counts."""
    quiet = 0
    for t in range(int(math.floor(k)), int(k) + horizon):
        if moving(tracks, t, cam_at, any_view):
            quiet = 0
        else:
            quiet += 1
            if quiet >= 3:
                return t - 2
    return None


def describe(trs) -> str:
    by = {}
    for t in trs:
        key = {"falling": "falling " + ("block" if t["name"] == "falling_block" else t["name"]), "debris": f"flying {t['name']} (explosion debris)", "death": f"{t['name']} dying"}[t["kind"]]
        by[key] = by.get(key, 0) + 1
    return ", ".join(f"{n} {k}" if n > 1 else k for k, n in by.items())


if __name__ == "__main__":
    import gzip
    p = pathlib.Path(sys.argv[1])
    rec = json.loads(gzip.decompress(p.read_bytes()) if p.suffix == ".gz" else p.read_bytes())
    tr = debris_tracks(rec)
    print(f"{len(tr)} debris track(s): " + describe(tr))
    s = sight_json(p)
    print(aim_report(s, lambda t: True)["summary"] if "aim" in s else s)
