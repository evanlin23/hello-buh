"""How long render.js will take on each frame of a recording, so parallel renders (Actions slices,
scripts/preview.py's jobs) can split the frames into runs of equal cost instead of equal length.

render.js's time is not spread evenly over a recording. It walks the frames in order and, besides drawing
each one (fixed cost per pixel), it:
  - re-lights after block changes (at once for 24+ changes, else at most every 4 ticks): ~0.8 s each
  - re-meshes the WHOLE world when the lightmap's sky factor changes (time of day, rain): ~12-25 s each for a
    20x20-chunk recording, scaling with the column count. story_nitwit's sunset ending (14 such steps in
    3.5 s) took 12 min on one Actions runner while its other 10 slices took 2.5-7 min
  - starts: Chromium, the first mesh of the whole world, light (~30-40 s), plus a re-mesh if the slice's
    first frame is at a different sky factor than tick 0, plus one relight if blocks changed before it
The constants are seconds on a 4-core box (this container and GitHub's ubuntu-24.04 runners are close),
from PROFILE=1 runs of story_nitwit (2026-11-10). They only have to be right relative to each other.

  python3 scripts/render_cost.py <rec.json> [slices]     print the per-second cost profile and the split
"""
import bisect
import json
import math
import os
import sys

FRAME_PX = 0.5           # s per frame at 1080x1011 (SwiftShader draw + PNG capture), scales with the pixels
FRAME_MIN = 0.03         # s per frame regardless of size (the frame loop, entities, page call)
RELIGHT = 0.8            # s per relight (light propagate over the area + diff + re-mesh of the changed sections)
PER_BLOCK = 0.002        # s per changed block (setBlock, section re-mesh)
PER_ENTITY = 0.002       # s per entity drawn
REMESH_PER_COLUMN = 0.05  # s per chunk column for a whole-world re-mesh (391 columns: ~20 s)
START = 12.0             # s to start render.js (Chromium, page, assets)
START_PER_COLUMN = 0.07  # s per chunk column for the first mesh + light


def day_dark(day_time, rain=0.0, thunder=0.0):
    """renderer/models.js dayInfo().dark (Level.getSkyDarken): 0.2 at night .. 1 by day."""
    d = (((day_time / 24000) - 0.25) % 1 + 1) % 1
    angle = (d * 2 + (0.5 - math.cos(d * math.pi) / 2)) / 3
    c = math.cos(angle * math.pi * 2)
    cl = lambda v: min(1.0, max(0.0, v))
    return (1 - cl(1 - (c * 2 + 0.2))) * (1 - rain * 5 / 16) * (1 - thunder * 5 / 16) * 0.8 + 0.2


class Model:
    def __init__(self, rec, fps=60, w=1080, h=1011):
        self.rec, self.fps = rec, fps
        self.poses = len(rec["poses"])
        self.frames = int((self.poses - 1) / 20 * fps)
        tl = rec.get("timeline") or []
        self.times = [(0.0, rec.get("time", 6000) if rec.get("time") is not None else 6000)] + \
            [(e["t"] / 50, e["time"]) for e in tl if e.get("event") == "time"]
        # weather levels as render.js builds them (0.01 a tick toward the target), 1/16 steps
        w0 = "clear" if (rec.get("dimension") or "overworld").replace("minecraft:", "") != "overworld" else (rec.get("weather") or "clear")
        marks = [(e["t"] / 50, e["weather"]) for e in tl if e.get("event") == "weather"]
        r, th, wx, k = (1.0 if w0 != "clear" else 0.0), (1.0 if w0 == "thunder" else 0.0), w0, 0
        self.rain, self.thunder = [], []
        for i in range(self.poses + 3):
            while k < len(marks) and marks[k][0] <= i:
                wx = marks[k][1]; k += 1
            if i > 0:
                r = max(0.0, min(1.0, r + (0.01 if wx != "clear" else -0.01)))
                th = max(0.0, min(1.0, th + (0.01 if wx == "thunder" else -0.01)))
            self.rain.append(r); self.thunder.append(th)
        self.blocks = sorted(b[0] for b in rec.get("blocks") or [])
        ents = {}
        for row in rec.get("entities") or []:
            ents[row[0]] = ents.get(row[0], 0) + 1
        self.ents = ents
        cols = len(rec.get("columns") or []) or 300
        self.remesh = REMESH_PER_COLUMN * cols
        self.start = START + START_PER_COLUMN * cols
        self.px = FRAME_PX * (w * h) / (1080 * 1011) + FRAME_MIN

    def _level(self, a, t):
        i = max(0, min(len(a) - 2, int(math.floor(t))))
        f = min(1.0, max(0.0, t - i))
        return a[i] + (a[i + 1] - a[i]) * f

    def sky_key(self, t):
        day = self.times[0][1]
        for a, d in self.times:
            if t >= a:
                day = d
        rain = round(self._level(self.rain, t) * 16) / 16
        thunder = round(self._level(self.thunder, t) * 16) / 16
        # render.js skyKey: the darkening (rounded to DAY_LIGHT_STEP if set) plus the rain/thunder 1/16 steps
        d = day_dark(day, rain, thunder)
        step = float(os.environ.get("DAY_LIGHT_STEP") or 0)
        return f"{round(d / step) if step else f'{d:.6f}'}|{round(rain * 16)},{round(thunder * 16)}"

    def costs(self, frames):
        """Per-frame seconds for rendering `frames` (sorted frame numbers) in one render.js run, in order;
        and the run's start cost."""
        out = []
        bi, pending, last_relight = 0, False, -99.0
        key0 = self.sky_key(0)
        cur = key0
        start = self.start
        for n, f in enumerate(frames):
            t = f * 20 / self.fps
            c = self.px + self.ents.get(int(t), 0) * PER_ENTITY
            nb = bisect.bisect_right(self.blocks, t)
            changed, bi = nb - bi, nb
            c += changed * PER_BLOCK
            if changed:
                pending = True
            if pending and (changed >= 24 or t - last_relight >= 4):
                pending, last_relight = False, t
                c += RELIGHT
            k = self.sky_key(t)
            if k != cur:
                cur = k
                c += self.remesh
            out.append(c)
        return start, out


def split(costs, start_cost, n):
    """Cut a run of per-frame costs into at most n contiguous ranges [a, b) with the smallest maximum
    total (start_cost(a) + sum of its frames). Returns the ranges."""
    m = len(costs)
    if m == 0:
        return []
    pre = [0.0]
    for c in costs:
        pre.append(pre[-1] + c)

    def greedy(limit):
        out, a = [], 0
        while a < m:
            b = a + 1   # at least one frame each
            base = start_cost(a) - pre[a]
            while b < m and base + pre[b + 1] <= limit:
                b += 1
            out.append((a, b))
            a = b
            if len(out) > n:
                return None
        return out

    lo, hi = max(start_cost(0), max(costs)), start_cost(0) + pre[m]
    best = greedy(hi)
    for _ in range(50):
        mid = (lo + hi) / 2
        g = greedy(mid)
        if g is not None:
            best, hi = g, mid
        else:
            lo = mid
    return best


def slice_plan(rec, n, fps=60, w=1080, h=1011, min_frames=30):
    """Actions slices: n ranges of the recording's frames with about equal render time each (a slice that
    starts after blocks changed or at another sky factor pays a relight / a re-mesh on its first frame)."""
    m = Model(rec, fps, w, h)
    frames = list(range(m.frames))
    start, costs = m.costs(frames)
    # what a slice starting at frame a pays up front beyond the first frame's own cost
    first = {}

    def start_cost(a):
        if a not in first:
            s, c = m.costs([a])
            first[a] = s + c[0] - costs[a]
        return first[a]
    n = max(1, min(n, len(frames) // min_frames or 1))
    ranges = split(costs, start_cost, n)
    est = [start_cost(a) + sum(costs[a:b]) for a, b in ranges]
    return ranges, est, sum(costs) + start


if __name__ == "__main__":
    rec = json.load(open(sys.argv[1]))
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 16
    m = Model(rec)
    _, costs = m.costs(list(range(m.frames)))
    per_s = [sum(costs[i:i + 60]) for i in range(0, len(costs), 60)]
    print("cost per video second (s):", " ".join(f"{c:.0f}" for c in per_s))
    ranges, est, total = slice_plan(rec, n)
    eq = [(i * m.frames // n, (i + 1) * m.frames // n) for i in range(n)]
    s0, _ = m.costs([0])
    eq_est = [m.costs(list(range(a, b)))[0] + sum(m.costs(list(range(a, b)))[1]) for a, b in eq]
    print(f"{m.frames} frames, total {total / 60:.1f} min of one-process render")
    print(f"equal frames: slowest slice {max(eq_est) / 60:.1f} min ({', '.join(f'{e / 60:.1f}' for e in eq_est)})")
    print(f"by cost     : slowest slice {max(est) / 60:.1f} min ({', '.join(f'{e / 60:.1f}' for e in est)})")
    print("ranges:", ranges)
