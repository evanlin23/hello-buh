"""Time-lapse spans for the edit: speed a stretch of the recording up, or cut it out.

A stunt's `edit.speed` is a list of [START_EVENT, END_EVENT, FACTOR]: the footage between the two
timeline events plays FACTOR times faster (an integer keeps the frame steps even), or is dropped
when FACTOR is "cut" (a teleport cut without the wait around it). Every timeline time goes through
the same map, so the HUD, subtitles, timers, clocks, the death screen, start/end trims and the
song's drop all stay on their events. Times are seconds since the recording started.
"""
import json
import math


class Warp:
    def __init__(self, spec, timeline):
        ev = {}
        for e in timeline:
            ev.setdefault(e["event"], e["t"] / 1000)
        self.spans = []                     # (src_a, src_b, factor) with factor inf for cuts
        for a, b, f in (json.loads(spec) if isinstance(spec, str) else spec):
            if a not in ev or b not in ev or ev[b] <= ev[a]:
                print(f"speed span {a}..{b} skipped (event missing or empty)")
                continue
            self.spans.append((ev[a], ev[b], math.inf if f == "cut" else float(f)))
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
    stages.append(f)
    return ",".join(f"atempo={s:.6f}" for s in stages)
