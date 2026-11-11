"""The dwell check (r:r188b46): after each action's result reads on screen, cut and go straight to the next beat.

Owner, 2026-11-11: "we need to have faster cuts. Like, after the stunt is done, we just cut. It can't be too fast,
but it can't be so slow either... right now, we blow up the TNT, wait for what feels like forever, then we cut...
boom, boom, boom, fast pace." Rule r:r188b46: cut about 0.3-0.6 s after an action's result reads and go straight to
the next beat; the end lands about 0.5-0.8 s after the payoff's result. Smoke, particles and drifting debris never
hold a cut (only the action itself: a block mid-fall, a mob mid-death, a blast going off).

Called from scripts/pace.py (so ./hb check, ./hb review, publish and the gates all see it); pure functions here.

  results  the action results, in output seconds: from the recording (a place, a break, a blast, a hit, a death, a
           falling block landing in view) and the edit's hits (a mark it puts an impact, boom, hit or ding sound, a
           flash or a shake on, and the endAfter mark). Each has `at` (it happens) and `reads` (its result reads on
           screen: a place/break/hit at once, a blast after its blast frame, a death after the 1 s fall-over and poof).
  news     what counts as "something new" after a result: another result, any mark the edit hangs anything on (a
           card, a caption, a whoosh, a riser's start...), a cut, a line, a caption change, a block in a steady build.
  busy     the action still going on (the recording's entities, never the pixels: smoke and particles don't count): a
           primed TNT or a falling block in view, a death or a blast frame, a mob moving in view nearby, the player
           falling. A result followed by more action is continuous, not a dwell (a chain of blasts, a fuse burning,
           the creeper walking up, a drop).
  dwell    for every result: the time from it reading to the first new thing or busy moment. Mid-video over
           DWELL_WARN = WARN. The end: from the payoff's result (or a later result's) to the last frame: over END_WARN
           = WARN, over END_BLOCK = BLOCK. A text payoff (a death screen, a card) keeps the payoff check's 1.2-1.8 s
           reading time instead.

    python3 scripts/dwell.py <stunt> <rec.json[.gz]>      # the results and the dwell after each (debugging)
"""
from __future__ import annotations

import math
import re

# thresholds, tuned 2026-11-11 on the queued Shorts (docs/lessons.md, "Fast cuts after each action")
DWELL_WARN = 1.0       # s from a mid-video result to the next new thing (owner: cut 0.3-0.6 s after it reads)
END_WARN = 0.9         # s from the payoff's result to the end (owner: 0.5-0.8 s)
END_BLOCK = 1.2        # s: "wait for what feels like forever"
BLAST_READ = 0.3       # s: a blast's result reads after its blast frame (lib/settle.js BLAST_TICKS)
DEATH_READ = 1.0       # s: a death reads after the fall-over and the poof (DEATH_TICKS)
HIT_READ = 0.1         # s: a place, break or hit reads at once (the block / the red flash)
MERGE = 0.02           # s: a new thing must come this much after the result
STEP = 0.05            # s: the busy scan's step (output time)

ACTIONS = {"place": "place", "place_on": "place", "dig_end": "break", "hurt": "hit", "mob_hurt": "hit",
           "mob_death": "death", "death": "death"}
HIT_SFX = {"impact", "boom", "hit", "ding"}     # an edit sound on a mark that is a result (sfx.py kinds)
HIT_FX = ("flash", "shake")                     # the edit's picture hits
NEWS_FX = ("flash", "shake", "punch", "cards", "subs", "captions")
NOT_BEATS = {"start", "end", "story_end", "settle", "motion_start", "motion_settled"}
BED_SFX = {"air", "room", "bed", "ambience"}    # a bed under a span: not a beat
NOT_BUSY = {"item", "experience_orb", "arrow", "spectral_arrow", "trident", "firework_rocket", "snowball", "egg",
            "ender_pearl", "potion", "area_effect_cloud", "marker", "text_display", "item_display", "block_display",
            "interaction", "armor_stand", "item_frame", "glow_item_frame", "painting", "lightning_bolt"}
MOB_V = 0.06           # blocks/tick: a mob moving faster than this is doing something (walk ~0.1, idle sway ~0)
MOB_DIST = 20          # blocks from the camera
MOB_WIN = 10           # ticks the mob's motion is measured over
FALL_V = 0.3           # blocks/tick down: the player is falling (a drop builds past 0.5 within 6 ticks)
FALL_WIN = 6           # ticks the fall is measured over (stepping down a block drops 1 block in ~4)
BLAST_TICKS = 6        # = lib/settle.js BLAST_TICKS
DEATH_TICKS = 20


def _spec(s):
    """'boom:1.4' / 'boom+1.4' / 'boom' -> ('boom', 1.4)."""
    m = re.fullmatch(r"([A-Za-z_][\w]*)(?:[:+](-?[\d.]+)|(-[\d.]+))?", str(s))
    if not m:
        return None, 0.0
    return m.group(1), float(m.group(2) or m.group(3) or 0)


def edit_marks(edit) -> list:
    """[(event, offset, why, is_hit)]: every mark the edit hangs something on; is_hit: it marks a result (an impact /
    boom / hit / ding sound, a flash, a shake, the endAfter mark)."""
    out = []
    def add(spec, why, hit):
        ev, off = _spec(spec)
        if ev and ev not in NOT_BEATS:
            out.append((ev, off, why, hit))
    for s in edit.get("sfx") or []:
        if isinstance(s, list) and len(s) > 1 and s[0] not in BED_SFX:
            for i, x in enumerate(s[1:3]):
                if isinstance(x, str):
                    add(x, f"sfx {s[0]}", s[0] in HIT_SFX and i == 0)
    for k in NEWS_FX:
        items = edit.get(k) or []
        for it in items if isinstance(items, list) else []:
            spec = it[0] if isinstance(it, list) and it else it if isinstance(it, str) else None
            if spec:
                add(spec, k, k in HIT_FX)
    if edit.get("dropAt"):
        add(edit["dropAt"], "dropAt", False)
    for ev in edit.get("keySounds") or []:
        add(ev, "keySounds", False)
    if edit.get("endAfter"):
        ev, _ = _spec(edit["endAfter"])
        if ev and ev not in NOT_BEATS:
            out.append((ev, 0.0, "endAfter", True))
    return out


def beats(rec, clock, edit, cam=None, in_view=None) -> list:
    """[{at, reads, kind, name, why, result}] in output seconds, sorted by `reads`; result False = news only.
    clock: hb_time.Clock (out_of_src); cam/in_view: owner_checks.pose_cam / in_view (a falling block landing out of
    view is not a result)."""
    tl = rec.get("timeline", [])
    out = []
    def put(src_s, kind, name, read, why, result=True):
        o = clock.out_of_src(src_s)
        if o is not None:
            out.append({"at": round(o, 2), "reads": round(o + read, 2), "kind": kind, "name": name, "why": why, "result": result})
    for e in tl:
        ev = e.get("event")
        if ev in ACTIONS:
            k = ACTIONS[ev]
            put(e["t"] / 1000, k, ev, DEATH_READ if k == "death" else HIT_READ, "recording")
        elif ev == "particles" and e.get("type") == "explosion":
            put(e["t"] / 1000, "blast", "explosion", BLAST_READ, "recording")
    rows = {}
    for r in rec.get("entities") or []:
        if r[2] == "falling_block":
            rows.setdefault(r[1], []).append(r)
    for rs in rows.values():
        t1, p = rs[-1][0], tuple(rs[-1][3:6])
        if cam is None or in_view is None or in_view(cam(t1), p):
            put(t1 / 20, "landing", "falling_block", 0.0, "recording")
    for ev, off, why, hit in edit_marks(edit):
        hits = [e for e in tl if e.get("event") == ev or (e.get("event") == "line" and e.get("id") == ev)]
        if hits:
            put(hits[0]["t"] / 1000 + off, "edit", ev, 0.0, why, hit)
    # one row per (time, name): an edit mark named twice is one beat, a result if any use is
    merged = {}
    for b in out:
        k = (b["at"], b["kind"], b["name"])
        if k in merged:
            merged[k]["result"] = merged[k]["result"] or b["result"]
        else:
            merged[k] = b
    return sorted(merged.values(), key=lambda b: (b["reads"], b["at"]))


def busy_ticks(rec, cam=None, in_view=None) -> set:
    """The source ticks where the action is still going on, from the recording's entities (never the pixels: smoke and
    particles are not action, r:r188b46): a primed TNT or a falling block in view, a blast frame, a death, a mob moving
    in view within MOB_DIST, the player falling."""
    busy = set()
    tl = rec.get("timeline", [])
    for e in tl:
        k = int(round(e["t"] / 50))
        if e.get("event") == "particles" and e.get("type") == "explosion":
            busy.update(range(k, k + BLAST_TICKS))
        elif e.get("event") in ("mob_death", "death"):
            busy.update(range(k, k + DEATH_TICKS))
    def seen(t, p, near=None):
        if cam is None or in_view is None:
            return True
        c = cam(t)
        if near is not None and math.dist(p, c[:3]) > near:
            return False
        return in_view(c, p)
    mobs = {}
    for r in rec.get("entities") or []:
        t, eid, name = r[0], r[1], r[2]
        p = (r[3], r[4], r[5])
        if name in ("falling_block", "tnt", "tnt_minecart"):
            if seen(t, p):
                busy.add(t)
        elif name not in NOT_BUSY:
            mobs.setdefault(eid, {})[t] = p
    # a mob doing something: it moves over MOB_WIN ticks at more than MOB_V (the server sends positions in steps, so
    # one step is not a walk), near and in view
    for pos in mobs.values():
        ts = sorted(pos)
        for i, t in enumerate(ts):
            j = i
            while j + 1 < len(ts) and ts[j + 1] - t <= MOB_WIN:
                j += 1
            if ts[j] - t >= MOB_WIN // 2 and math.dist(pos[ts[j]], pos[t]) / MOB_WIN > MOB_V and seen(t, pos[t], MOB_DIST):
                busy.update(range(t, ts[j] + 1))
    P = rec.get("poses") or []   # the player falling: down more than FALL_V a tick over FALL_WIN ticks (a step down a
    for a, b in zip(P, P[FALL_WIN:]):   # block or a jump is not a fall)
        if b[2] - a[2] < -FALL_V * max(1, b[0] - a[0]):
            busy.update(range(int(a[0]), int(b[0]) + 1))
    return busy


def dwells(bts, news, dur, busy_at=None):
    """Every result's dwell: [{beat, at, reads, next, to, dwell}], `to` = what came next ('end' at the end). news:
    [(t, label)] (cuts, lines, captions, build blocks); every beat's `at` counts too. busy_at(out_s) -> bool: the
    action still going on there (the dwell stops where it is)."""
    ev = sorted([(b["at"], f"{b['kind']} {b['name']}") for b in bts] + list(news))
    rows = []
    for b in bts:
        r = b["reads"]
        if not b.get("result", True) or not (0 <= r < dur):
            continue
        nxt = next(((t, lab) for t, lab in ev if t > r + MERGE and t < dur - 0.01), None)
        t, lab = nxt if nxt else (dur, "end")
        if busy_at is not None and lab != "end":
            x = r + STEP
            while x < t:
                if busy_at(x):
                    t, lab = x, "the action going on (recording)"
                    break
                x += STEP
        rows.append({"beat": f"{b['kind']} {b['name']}", "at": b["at"], "reads": r, "next": round(t, 2), "to": lab, "dwell": round(t - r, 2)})
    return rows


def check(bts, news, dur, payoff=None, payoff_reads=None, text_payoff=False, guessed=False, busy_at=None):
    """-> (findings [(level, out_s, msg, fix)], summary dict). pace adds them as check 'dwell'."""
    rows = dwells(bts, news, dur, busy_at)
    F = []
    res = [b for b in bts if b.get("result", True) and b["reads"] < dur]
    end_from, end_what = None, ""
    if payoff_reads is not None:
        end_from, end_what = payoff_reads, "the payoff's result"
        later = [b for b in res if b["reads"] > payoff_reads and b["at"] >= (payoff or 0) - 1e-6]
        if later:
            lb = max(later, key=lambda b: b["reads"])
            end_from, end_what = lb["reads"], f"the last result ({lb['kind']} {lb['name']} at {lb['at']:.2f} s)"
    elif res:
        lb = max(res, key=lambda b: b["reads"])
        end_from, end_what = lb["reads"], f"the last result ({lb['kind']} {lb['name']})"
    end_tail = None if end_from is None else round(dur - end_from, 2)
    mid = [r for r in rows if r["to"] != "end" and (end_from is None or r["reads"] < end_from - 1e-6)]
    over = [r for r in mid if r["dwell"] > DWELL_WARN + 1e-6]
    seen = set()   # one finding per dead stretch (results reading together share it)
    for r in sorted(over, key=lambda r: -r["dwell"]):
        if r["next"] in seen:
            continue
        seen.add(r["next"])
        F.append(("WARN", r["reads"], f"{r['dwell']:.2f} s after the {r['beat']} result ({r['reads']:.2f} s) with nothing new ({r['to']} at {r['next']:.2f} s): "
                  "owner r:r188b46, cut 0.3-0.6 s after the result reads (\"we blow up the TNT, wait for what feels like forever, then we cut\")",
                  f"an edit cut span from ~{r['reads'] + 0.5:.2f} s to just before {r['next']:.2f} s (or speed it up), so the next beat lands ~0.5 s after the result"))
    if end_tail is not None and not text_payoff:   # (a death screen or a card: the payoff check's 1.2-1.8 s reading time)
        if end_tail > END_BLOCK + 1e-6:
            F.append(("WARN" if guessed else "BLOCK", end_from, f"the Short runs {end_tail:.2f} s past {end_what} ({end_from:.2f} s): over {END_BLOCK:g} s "
                      "(owner r:r188b46: the end lands 0.5-0.8 s after the payoff's result; smoke and particles never hold it)",
                      f"end ~0.6 s after it ({end_from + 0.6:.2f} s): lower the endAfter offset by {end_tail - 0.6:.2f} s"))
        elif end_tail > END_WARN + 1e-6:
            F.append(("WARN", end_from, f"the Short runs {end_tail:.2f} s past {end_what} ({end_from:.2f} s): aim for 0.5-0.8 s (r:r188b46)",
                      f"end ~0.6 s after it ({end_from + 0.6:.2f} s): lower the endAfter offset by {end_tail - 0.6:.2f} s"))
    worst = max(mid, key=lambda r: r["dwell"]) if mid else None
    summary = {"results": len(res), "worst_mid": worst, "over": sorted(over, key=lambda r: r["reads"]),
               "end_from": None if end_from is None else round(end_from, 2), "end_what": end_what, "end_tail": end_tail, "text_payoff": text_payoff}
    return F, summary


def note(s) -> str:
    over = ", ".join(f"{r['dwell']:.1f} s after {r['beat']} at {r['reads']:.1f}" for r in s["over"]) or f"none over {DWELL_WARN:g} s"
    w = s["worst_mid"]
    return (f"dwell (r:r188b46): {s['results']} results; mid-video dwells {over}"
            + (f" (longest {w['dwell']:.2f} s after {w['beat']} at {w['reads']:.1f})" if w and not s["over"] else "")
            + ("" if s["end_tail"] is None else f"; the end {s['end_tail']:.2f} s after {s['end_what']}"
               + (" (a text payoff: the payoff check's reading time)" if s["text_payoff"] else "")))


def busy_fn(rec, clock, cam=None, in_view=None):
    """out_s -> bool, through the clock (speed spans, cuts)."""
    B = busy_ticks(rec, cam, in_view)
    def at(o):
        r = clock.at_out(o)
        k = r.get("tick")
        return k is not None and int(round(k)) in B
    return at


if __name__ == "__main__":
    import os
    import pathlib
    import sys
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    os.chdir(pathlib.Path(__file__).resolve().parent.parent)
    import owner_checks as OC
    import pace
    clock, rec, _ = pace.from_recording(sys.argv[1], sys.argv[2])
    cam = OC.pose_cam(rec)
    bts = beats(rec, clock, pace.edit_of(sys.argv[1]), cam, OC.in_view)
    for r in dwells(bts, [], clock.total, busy_fn(rec, clock, cam, OC.in_view)):
        print(f"{r['at']:7.2f} -> {r['reads']:7.2f}  {r['beat']:<28} dwell {r['dwell']:5.2f} -> {r['to']} at {r['next']:.2f}")
