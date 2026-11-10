"""The Short's clock for the hb tools: turn time specs into source ticks and list the marks and shots in output time.

    python3 scripts/hb_time.py <stunt> <rec.json[.gz]> [SPEC ...]      -> JSON on stdout

Output time = seconds of the finished Short (the edit's startAt/endAfter trims, speed/slow-mo/freeze spans and the
hook all applied, exactly as edit.py and scripts/preview.py build it). SPEC forms:
    12.5          output seconds
    L03           a story line (its `line` mark), L03+1.2 / L03-0.5 for an offset in seconds
    cut#3         the 3rd `cut` mark (from 1), any timeline event works: flash, hmm, story_end, shot#2 ...
    end           the last frame of the Short; 'start' is 0
    tick:450      a source tick (20 a second), src:22.5 a source second
Each resolved spec: {spec, out (s or null outside the Short), tick (source tick), frame (60 fps source frame),
part ('hook'|'body'|'replay'|null)}. Exit 2 on a spec that names nothing (the error says what exists).
Also printed: the Short's length, the marks (story lines, cuts, shots, cards...) and the shots (spans between
cuts) in output time, which hb describe / continuity / sheet build on.
"""
import gzip
import json
import math
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
import preview  # noqa: E402  (Plan: the output-frame -> source-frame map, shared with the preview)

FPS = 60
CUT_EVENTS = ("cut", "respawn", "shot")
SKIP = preview.NOISE | {"meter", "hotbar"}


def load_rec(p):
    p = pathlib.Path(p)
    raw = p.read_bytes()
    if p.suffix == ".gz":
        raw = gzip.decompress(raw)
    return json.loads(raw)


def plan_for(stunt, rec):
    eargs = subprocess.run(["node", "scripts/edit_args.js", stunt], cwd=HERE, capture_output=True, text=True)
    if eargs.returncode:
        sys.exit(f"hb_time: stunts/{stunt}.js failed to load:\n{eargs.stderr.strip()[-1500:]}")
    eargs = eargs.stdout.rstrip("\n").split("\n")
    edit = json.loads(subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{stunt}').edit||{{}}))"],
                                     cwd=HERE, capture_output=True, text=True, check=True).stdout)
    return preview.Plan(stunt, rec, preview.edit_parse(eargs), edit)


class Clock:
    def __init__(self, stunt, rec):
        self.rec = rec
        self.p = plan_for(stunt, rec)
        self.tl_src = rec.get("timeline", [])
        self.total = self.p.total / FPS

    def out_of_src(self, src_s):
        """Source seconds -> output seconds (body only; None outside)."""
        p = self.p
        tw = p.warp.out(src_s) if p.warp else src_s
        F = p.body_F(tw)
        return None if F is None else round(F / FPS, 3)

    def at_out(self, out_s):
        p = self.p
        F = min(p.total - 1, max(0, int(round(out_s * FPS))))
        kind, K = p.what(F)
        if kind == "replay":
            return {"part": "replay", "frame": K, "tick": None}
        src = p.src_of_warped(K)[0] if kind else None
        return {"part": kind, "frame": src, "tick": None if src is None else round(src * 20 / FPS, 3)}

    def events(self, name):
        return [e for e in self.tl_src if e["event"] == name]

    def resolve(self, spec):
        s = str(spec).strip()
        if s == "start":
            s = "0"
        if s == "end":
            s = str(max(0.0, self.total - 1 / FPS))
        if re.fullmatch(r"-?\d+(\.\d+)?", s):
            o = float(s)
            if not 0 <= o <= self.total:
                raise ValueError(f"{s}: the Short is {self.total:.2f} s long")
            r = self.at_out(o)
            return {"spec": spec, "out": round(o, 3), **r}
        m = re.fullmatch(r"(tick|src):(-?\d+(?:\.\d+)?)", s)
        if m:
            tick = float(m.group(2)) * (20 if m.group(1) == "src" else 1)
            n = len(self.rec["poses"]) - 1
            if not 0 <= tick <= n:
                raise ValueError(f"{s}: the recording has ticks 0..{n}")
            return {"spec": spec, "out": self.out_of_src(tick / 20), "part": "body", "frame": int(round(tick * 3)), "tick": round(tick, 3)}
        m = re.fullmatch(r"([A-Za-z_][\w]*?)(?:#(\d+))?([+-]\d+(?:\.\d+)?)?", s)
        if not m:
            raise ValueError(f"{s}: not a time (12.5, L03, L03+1.2, cut#3, tick:450, src:22.5, end)")
        name, nth, off = m.group(1), int(m.group(2) or 1), float(m.group(3) or 0)
        hits = [e for e in self.tl_src if e["event"] == "line" and e.get("id") == name] or self.events(name)
        if not hits:
            known = sorted({e["event"] for e in self.tl_src if e["event"] not in SKIP} | {e.get("id") for e in self.events("line") if e.get("id")})
            raise ValueError(f"{s}: no mark '{name}'. Marks in this recording: {', '.join(known)}")
        if nth > len(hits):
            raise ValueError(f"{s}: only {len(hits)} '{name}' mark(s)")
        src_s = hits[nth - 1]["t"] / 1000 + off
        o = self.out_of_src(src_s)
        tick = src_s * 20
        if o is not None:   # through the clock, so slow-mo and speed spans pick the frame edit.py shows
            r = self.at_out(o)
            if r["tick"] is not None:
                tick = r["tick"]
        return {"spec": spec, "out": o, "part": "body" if o is not None else None, "frame": int(round(tick * 3)), "tick": round(tick, 3)}

    def marks(self):
        out = []
        for e in self.tl_src:
            if e["event"] in SKIP:
                continue
            d = {"event": e["event"], "tick": round(e["t"] / 50, 2), "out": self.out_of_src(e["t"] / 1000)}
            for k in ("id", "name", "time", "weather", "value", "who", "text"):
                if k in e:
                    d[k] = e[k]
            out.append(d)
        return out

    def shots(self):
        """Spans between cuts (cut/respawn/shot marks and edit cuts), inside the Short's body, in output time."""
        p = self.p
        b0 = p.n_hook / FPS
        b1 = (p.n_hook + p.n_body) / FPS
        cuts = set()
        for e in self.tl_src:
            if e["event"] in CUT_EVENTS:
                o = self.out_of_src(e["t"] / 1000)
                if o is not None and b0 + 0.05 < o < b1 - 0.05:
                    cuts.add(round(o, 3))
        if p.warp:
            for a, b, f in p.warp.spans:
                if f == math.inf:
                    F = p.body_F(p.warp.out(a))
                    if F is not None:
                        cuts.add(round(F / FPS, 3))
        edges = [round(b0, 3)] + sorted(c for c in cuts if c > b0 + 0.05) + [round(b1, 3)]
        shots = []
        for a, b in zip(edges, edges[1:]):
            if b - a < 1 / FPS:
                continue
            ta, tb = self.at_out(a)["tick"], self.at_out(max(a, b - 1 / FPS))["tick"]
            shots.append({"n": len(shots) + 1, "out": [a, round(b, 3)], "ticks": [ta, tb]})
        # the line and shot name each span opens under
        lines = [(e["t"] / 50, e.get("id")) for e in self.events("line")]
        named = [(e["t"] / 50, e.get("name")) for e in self.events("shot")]
        for s in shots:
            ta, tb = s["ticks"]
            if ta is None:
                continue
            ln = [i for t, i in lines if t <= ta + 2]
            s["line"] = ln[-1] if ln else None                       # the line on screen as the shot opens
            s["lines"] = [i for t, i in lines if ta + 2 < t <= tb]    # lines that start inside it
            sn = [n for t, n in named if t <= ta + 1]
            if sn:
                s["shot"] = sn[-1]
        if p.n_hook:
            shots.insert(0, {"n": 0, "out": [0.0, round(b0, 3)], "ticks": [self.at_out(0)["tick"], self.at_out(b0 - 1 / FPS)["tick"]], "hook": True})
        return shots


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    stunt, recp, specs = sys.argv[1], sys.argv[2], sys.argv[3:]
    # the plan can print (the hook's calibration runs ffmpeg): keep stdout for the JSON alone
    import os
    real_out = os.dup(1)
    os.dup2(2, 1)
    try:
        c = Clock(stunt, load_rec(recp))
    finally:
        sys.stdout.flush()
        os.dup2(real_out, 1)
    res, bad = [], []
    for s in specs:
        try:
            res.append(c.resolve(s))
        except ValueError as e:
            bad.append(str(e))
    p = c.p
    out = {"stunt": stunt, "length": round(c.total, 3), "hook": round(p.n_hook / FPS, 3), "body": [round(p.n_hook / FPS, 3), round((p.n_hook + p.n_body) / FPS, 3)],
           "start_src": p.start, "resolved": res, "errors": bad, "marks": c.marks(), "shots": c.shots()}
    print(json.dumps(out))
    sys.exit(2 if bad else 0)


if __name__ == "__main__":
    main()
