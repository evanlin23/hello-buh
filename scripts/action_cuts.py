"""No cut in the middle of an action (owner r:r52f94c, 2026-11-11, pickaxe_race: "why is there a cut when we are using
the wooden pick?" "actually theres a cut for all."): an edit cut lands BETWEEN actions, never inside one.

An action is a dig (the harness's `dig` mark with its block, to its `dig_end`), or a place / use (lib/act.js
`place_on`, a stunt's `place` / `use` / `use_on` / `use_entity` / `light` mark: the click, then the hand's swing,
SWING s). An edit cut (a `speed` span of "cut": the Warp's inf spans) whose first frame or last frame falls inside
one (between its start and finish) BLOCKs: the viewer sees the action jump. A cut that skips whole actions is fine.

A run of digs is one action too: the same tool's digs back to back (each next dig within RUN_GAP s of the last one's
finish, the same hotbar slot). pickaxe_race's jump cuts sat on short rests between two digs of one wall and the owner
still saw "a cut when we are using the wooden pick": a cut with both edges inside one run BLOCKs as well. Cuts between
two sped-up spans (a time-lapse's jump cuts, r:r66efa4 / r:r200cfe) are left to scripts/lapse_cuts.py.

Run from scripts/rec_check.py (check "cuts"), so `./hb check` and `./hb record` report it.

    python3 scripts/action_cuts.py <stunt> <recording>     # every action an edit cut lands in
"""
import math

SWING = 0.3        # s: a click's hand swing (6 ticks), the finish of a place or use
EPS = 0.025        # s: half a tick of slack at either edge
RUN_GAP = 0.75     # s: a dig that starts within this of the last one's finish (same slot) continues the run
CLICKS = ("place", "place_on", "use", "use_on", "use_entity", "light")


def actions(timeline):
    """-> [(start_s, finish_s, what)] for every dig, place and use in the timeline."""
    tl = sorted(timeline, key=lambda e: e["t"])
    out = []
    for i, e in enumerate(tl):
        ev, t = e.get("event"), e["t"] / 1000
        if ev == "dig" and e.get("x") is not None:
            end = next((x for x in tl[i + 1:] if x.get("event") == "dig_end" or (x.get("event") == "dig" and x.get("x") is not None)), None)
            if end is None or end.get("event") != "dig_end":
                continue
            out.append((t, end["t"] / 1000, f"the dig of {e.get('x')} {e.get('y')} {e.get('z')}"))
        elif ev in CLICKS and not e.get("eye"):
            where = f" at {e.get('x')} {e.get('y')} {e.get('z')}" if e.get("x") is not None else ""
            out.append((t, t + SWING, f"the {ev}{where}"))
    return out


def dig_runs(timeline):
    """-> [(start_s, finish_s, n_digs, slot)]: runs of 2+ back-to-back digs with the same hotbar slot."""
    tl = sorted(timeline, key=lambda e: e["t"])
    digs = []
    for i, e in enumerate(tl):
        if e.get("event") == "dig" and e.get("x") is not None:
            end = next((x for x in tl[i + 1:] if x.get("event") == "dig_end" or (x.get("event") == "dig" and x.get("x") is not None)), None)
            if end is not None and end.get("event") == "dig_end" and end.get("ok", True) is not False:
                digs.append((e["t"] / 1000, end["t"] / 1000, e.get("slot")))
    runs, cur = [], None
    for s, e, slot in digs:
        if cur and slot == cur[3] and s - cur[1] <= RUN_GAP:
            cur = (cur[0], e, cur[2] + 1, slot)
        else:
            if cur and cur[2] > 1:
                runs.append(cur)
            cur = (s, e, 1, slot)
    if cur and cur[2] > 1:
        runs.append(cur)
    return runs


def action_cuts(spans, timeline):
    """spans: the Warp's [(src_a, src_b, factor)] (inf = a cut). -> [{a, b, edge, at, start, finish, what}], one per
    cut edge that falls inside an action."""
    acts = actions(timeline)
    rows = []

    def lapse(k):
        a, b, _ = spans[k]
        before = spans[k - 1] if k > 0 else None
        after = spans[k + 1] if k + 1 < len(spans) else None
        return bool(before and after and before[2] != math.inf and after[2] != math.inf and before[2] > 1.0 and after[2] > 1.0
                    and abs(before[1] - a) < 1e-3 and abs(after[0] - b) < 1e-3)
    for k, (a, b, f) in enumerate(spans):
        if f != math.inf:
            continue
        for edge, t in (("starts", a), ("ends", b)):
            for s, e, what in acts:
                # a time-lapse's jump cuts (between two sped-up spans) fall on the swing of one of its many places by
                # nature: those are scripts/lapse_cuts.py's (r:r66efa4 / r:r200cfe); a dig is still a dig
                if lapse(k) and not what.startswith("the dig"):
                    continue
                if s + EPS < t < e - EPS:
                    rows.append({"a": a, "b": b, "edge": edge, "at": t, "start": s, "finish": e, "what": what})
    runs = dig_runs(timeline)
    for k, (a, b, f) in enumerate(spans):
        if f != math.inf or lapse(k):
            continue   # (a time-lapse jump cut: lapse_cuts.py)
        if any(r["a"] == a and r["b"] == b for r in rows):
            continue
        for s, e, n, slot in runs:
            if s + EPS < a and b < e - EPS:
                rows.append({"a": a, "b": b, "edge": "sits", "at": a, "start": s, "finish": e,
                             "what": f"one run of {n} back-to-back digs (slot {slot})"})
    return rows


def message(r):
    return (f"an edit cut {r['edge']} in the middle of {r['what']} (src {r['start']:.2f}-{r['finish']:.2f}s; the cut "
            f"{r['a']:.2f}-{r['b']:.2f}s): no cut mid-action, cut between actions (owner r:r52f94c: \"why is there a cut "
            f"when we are using the wooden pick?\"). Move the cut's edges onto rests between digs/places, or drop the cut")


if __name__ == "__main__":
    import gzip
    import json
    import pathlib
    import sys
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    from beat_audit import edit_config  # noqa: E402
    from timewarp import Warp, edit_spans  # noqa: E402
    stunt, recp = sys.argv[1], pathlib.Path(sys.argv[2])
    rec = json.loads((gzip.open(recp, "rt") if recp.suffix == ".gz" else open(recp)).read())
    ed = edit_config(stunt, None)
    tl = sorted(rec.get("timeline", []), key=lambda e: e["t"])
    sp = edit_spans(ed.get("speed"), ed.get("slowmo"), ed.get("freeze"))
    rows = action_cuts(Warp(sp, tl).spans if sp else [], tl)
    for r in rows:
        print(message(r))
    print(f"{len(rows)} cut edge(s) mid-action")
    sys.exit(1 if rows else 0)
