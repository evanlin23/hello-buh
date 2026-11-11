"""Time-lapse camera jumps (owner r:r200cfe, 2026-11-11, lapse_rocket: "The rocket time lapse has a ton for jerking
around between shots"): a time-lapse holds one steady camera, or one smooth move, across its shots.

A time-lapse jump cut is an edit `speed` "cut" span with a sped-up span (factor > 1) on both sides and no teleport of
the stunt's own inside it (a timeline `cut` mark: a cut between two builds or places is a new shot on purpose). Across
it the camera may only carry on its own slow move: the view turns at most TURN_MAX deg, the eye moves at most MOVE_MAX
blocks, and its height at most RISE_MAX blocks. lib/time_lapse.js's 1-hour rail with bigCuts swung 5-15 deg and 4-15
blocks across its cuts on lapse_rocket (and up to 28 deg / 18 blocks on lapse_statue).

The limit holds only between consecutive shots from the SAME angle (owner r:r66efa4, 2026-11-11: "we should have more
angles when we're showing the last thing"): a jump cut to a clearly different angle is a new shot, not a jerk of the
old one. A new angle is an `angle` timeline mark inside the cut (lib/time_lapse.js big.angles marks every change), or,
unmarked, a pose change too big to read as the same view (NEW_TURN deg or NEW_MOVE blocks: the old rails' jerks were
5-28 deg and 4-18 blocks, under both).

Run from scripts/rec_check.py (check "cuts"), so `./hb check` and `./hb record` report it.

    python3 scripts/lapse_cuts.py <stunt> <recording>     # the table of every time-lapse jump cut
"""
import math

TURN_MAX = 6.0     # deg of view direction across the cut
MOVE_MAX = 3.0     # blocks the eye moves across the cut
RISE_MAX = 1.5     # blocks of height across the cut
NEW_TURN = 35.0    # deg: a turn this big across an unmarked cut is a different angle (a new shot)
NEW_MOVE = 25.0    # blocks: so is a move this far


def view_dir(yaw, pitch):
    return (-math.sin(yaw) * math.cos(pitch), math.sin(pitch), -math.cos(yaw) * math.cos(pitch))


def pose_at(P, s):
    """The pose row at source second s (poses are one per tick: [tick, x, y, z, yaw, pitch, ...])."""
    return P[min(len(P) - 1, max(0, int(round(s * 20))))]


def lapse_cuts(spans, timeline, P):
    """spans: the Warp's [(src_a, src_b, factor)] (inf = a cut), sorted. -> one row per time-lapse jump cut:
    {a, b, turn, move, rise, angle: None | 'marked' | 'pose', problems: [...]} (a new angle has no problems)"""
    teleports = [e["t"] / 1000 for e in timeline if e.get("event") == "cut"]
    angles = [e["t"] / 1000 for e in timeline if e.get("event") == "angle"]
    rows = []
    for k, (a, b, f) in enumerate(spans):
        if f != math.inf:
            continue
        before = spans[k - 1] if k > 0 else None
        after = spans[k + 1] if k + 1 < len(spans) else None
        if not (before and after and before[2] not in (math.inf,) and after[2] not in (math.inf,)
                and before[2] > 1.0 and after[2] > 1.0 and abs(before[1] - a) < 1e-3 and abs(after[0] - b) < 1e-3):
            continue
        marked = any(a - 0.05 <= t <= b + 0.05 for t in angles)
        if not marked and any(a - 0.05 <= t <= b + 0.05 for t in teleports):
            continue
        A, B = pose_at(P, a), pose_at(P, b)
        va, vb = view_dir(A[4], A[5]), view_dir(B[4], B[5])
        turn = math.degrees(math.acos(max(-1.0, min(1.0, sum(x * y for x, y in zip(va, vb))))))
        move = math.dist(A[1:4], B[1:4])
        rise = B[2] - A[2]
        probs = []
        angle = "marked" if marked else "pose" if (turn >= NEW_TURN or move >= NEW_MOVE) else None
        if angle:
            pass   # a cut to another angle: a new shot (r:r66efa4)
        elif turn > TURN_MAX:
            probs.append(f"the view turns {turn:.0f} deg")
        if not angle and move > MOVE_MAX:
            probs.append(f"the camera jumps {move:.1f} blocks")
        if not angle and abs(rise) > RISE_MAX:
            probs.append(f"its height jumps {rise:+.1f} blocks")
        rows.append({"a": a, "b": b, "turn": round(turn, 1), "move": round(move, 2), "rise": round(rise, 2), "angle": angle, "problems": probs})
    return rows


def message(r):
    return (f"time-lapse camera jump: across the jump cut at {r['a']:.2f}-{r['b']:.2f} s of the recording "
            f"{', '.join(r['problems'])} (max {TURN_MAX:g} deg, {MOVE_MAX:g} blocks, {RISE_MAX:g} up/down). Owner r:r200cfe: "
            f"\"a ton for jerking around between shots\": hold one steady camera or one slow smooth move across the lapse "
            f"(lib/time_lapse.js big.keys: a few keys, a slow crane), cut to a clearly different angle (big.angles: an `angle` "
            f"mark, r:r66efa4), or drop the jump cuts")


if __name__ == "__main__":
    import contextlib
    import io
    import sys
    sys.path.insert(0, __import__("pathlib").Path(__file__).resolve().parent.as_posix())
    import hb_time
    with contextlib.redirect_stdout(io.StringIO()):
        rec = hb_time.load_rec(sys.argv[2])
        c = hb_time.Clock(sys.argv[1], rec)
    spans = c.p.warp.spans if c.p.warp else []
    for r in lapse_cuts(spans, rec.get("timeline", []), rec["poses"]):
        print(f"{r['a']:7.2f}-{r['b']:7.2f} s  turn {r['turn']:5.1f} deg  move {r['move']:5.2f}  rise {r['rise']:+5.2f}  {'; '.join(r['problems']) or ('new angle (' + r['angle'] + ')' if r['angle'] else 'ok')}")
