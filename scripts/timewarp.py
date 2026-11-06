"""Time-lapse spans for the edit: speed a stretch of the recording up, or cut it out.

A stunt's `edit.speed` is a list of [START_EVENT, END_EVENT, FACTOR]: the footage between the two
timeline events plays FACTOR times faster (an integer keeps the frame steps even), or is dropped
when FACTOR is "cut" (a teleport cut without the wait around it). Every timeline time goes through
the same map, so the HUD, subtitles, timers, clocks, the death screen, start/end trims and the
song's drop all stay on their events. Times are seconds since the recording started.
"""
import json
import math


def _load(x):
    return (json.loads(x) if isinstance(x, str) else x) or []


def edit_spans(speed=None, slowmo=None, freeze=None):
    """One span list for the time map: the stunt's `edit.speed` spans plus its `edit.slowmo`
    windows ([EVENT, BEFORE_S, AFTER_S, FACTOR=0.5]: FACTOR-times speed from BEFORE_S ahead of the
    event to AFTER_S after it, e.g. ["splash5", 0.15, 0.35] plays 0.5 s of footage over 1 s)."""
    out = [list(s) for s in _load(speed)]
    for s in _load(slowmo):
        out.append([f"{s[0]}:{-abs(float(s[1]))}", f"{s[0]}:{float(s[2])}", float(s[3]) if len(s) > 3 else 0.5])
    for s in _load(freeze):   # freeze frame: [EVENT, SECONDS, ...] holds one frame (a 1-frame span stretched)
        f = 1 / 60
        out.append([f"{s[0]}:0", f"{s[0]}:{f:.6f}", f / float(s[1] if len(s) > 1 else 0.6)])
    return out


def edit_timeline(edit, timeline):
    """The recording's timeline in output time for a stunt's `edit` block (speed + slowmo)."""
    spans = edit_spans(edit.get("speed"), edit.get("slowmo"), edit.get("freeze"))
    return Warp(spans, timeline).timeline(timeline) if spans else timeline


class Warp:
    def __init__(self, spec, timeline):
        ev = {}
        for e in timeline:
            ev.setdefault(e["event"], e["t"] / 1000)

        def at(name):                       # "EVENT" or "EVENT:OFFSET_S"
            if name in ev:
                return ev[name]
            k, _, off = str(name).rpartition(":")
            try:
                return ev[k] + float(off) if k in ev else None
            except ValueError:
                return None
        self.spans = []                     # (src_a, src_b, factor) with factor inf for cuts
        for a, b, f in _load(spec):
            ta, tb = at(a), at(b)
            if ta is None or tb is None or tb <= ta:
                print(f"speed span {a}..{b} skipped (event missing or empty)")
                continue
            self.spans.append((ta, tb, math.inf if f == "cut" else float(f)))
        self.spans.sort()
        for (a0, b0, _), (a1, _, _) in zip(self.spans, self.spans[1:]):
            if a1 < b0:
                raise ValueError("speed spans overlap")

    def __bool__(self):
        return bool(self.spans)

    def out(self, t):
        """Source time -> output time."""
        lost = 0.0
        for a, b, f in self.spans:
            if t <= a:
                break
            lost += (min(t, b) - a) * (1 - 1 / f)
        return t - lost

    def src(self, t_out):
        """Output time -> source time (the start of a cut span maps to its end)."""
        lost = 0.0
        for a, b, f in self.spans:
            oa = a - lost                    # output time where the span starts
            ob = oa + (b - a) / f
            if t_out < oa:
                break
            if t_out < ob:
                return a + (t_out - oa) * f
            lost += (b - a) * (1 - 1 / f)
        return t_out + lost

    def timeline(self, timeline):
        return [{**e, "t": self.out(e["t"] / 1000) * 1000} for e in timeline]

    def segments(self, end):
        """[(src_a, src_b, factor)] covering 0..end, for rebuilding the audio."""
        out, t = [], 0.0
        for a, b, f in self.spans:
            if a > t:
                out.append((t, a, 1.0))
            out.append((a, b, f))
            t = b
        if end > t:
            out.append((t, end, 1.0))
        return out


def atempo(f):
    """An atempo chain for factor f (each stage kept within 0.5..2)."""
    stages = []
    while f > 2:
        stages.append(2.0)
        f /= 2
    while f < 0.5:
        stages.append(0.5)
        f /= 0.5
    stages.append(f)
    return ",".join(f"atempo={s:.6f}" for s in stages)
