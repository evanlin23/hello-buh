"""Cut scripts/tts.py takes into one clip per line (docs/ai_dilemma.md). tts.py splits a take at its longest pauses,
which goes wrong when a line has pauses of its own (Thin Ice: 0.73 s for a whole sentence). Here every pause is a
candidate cut and the line boundaries are chosen (dynamic programming) so each line's length matches its share of the
take's text, preferring long pauses. Speakers read at different rates, so check the printed lengths and pitch; where it
guesses wrong, give the line's span in episodes/<ep>/cuts.json ({"g1": [13.21, 18.08], ...}, seconds into the take,
read off tts.speech_segments) and that wins.

    python3 scripts/cut_vox.py episodes/<ep>/voices.json work/<ep>/vox [cl=1.12 ...]   (id=factor: speed a line up)
-> work/<ep>/vox/<id>.wav per line (pauses inside shortened) and episodes/<ep>/durations.json
"""
import json
import pathlib
import re
import subprocess
import sys
import tempfile

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import tts  # noqa: E402

SR = tts.SR


def sentences(text):
    return max(1, len([p for p in re.split(r"(?<=[.?!])\s+|\.\.\.\s*", text.strip()) if p.strip()]))


def f0(x):
    out = []
    for i in range(0, len(x) - 960, 480):
        f = x[i:i + 960]
        if np.abs(f).max() < 0.05:
            continue
        f = f - f.mean(); ac = np.correlate(f, f, "full")[959:]
        lo, hi = int(SR / 400), int(SR / 45); k = lo + np.argmax(ac[lo:hi])
        if ac[k] > 0.4 * ac[0]:
            out.append(SR / k)
    return int(np.median(out)) if out else 0


def squeeze(x, maxgap):
    segs = tts.speech_segments(x, gap=0.12)
    parts = []
    for i, (a, b) in enumerate(segs):
        if i:
            parts.append(np.zeros(int(maxgap * SR), np.float32))
        parts.append(x[a:b])
    return np.concatenate(parts) if parts else x


def auto_cuts(x, texts):
    segs = tts.speech_segments(x, gap=0.12)
    L, M = len(texts), len(segs)
    if M < L:
        raise SystemExit(f"{M} stretches of speech for {L} lines: give the spans in cuts.json")
    chars = np.array([len(t) for t in texts], float); share = chars / chars.sum()
    T = segs[-1][1] - segs[0][0]
    gaps = [segs[j + 1][0] - segs[j][1] for j in range(M - 1)]; gmax = max(gaps) if gaps else 1
    INF = 1e18
    best = np.full((L + 1, M + 1), INF); arg = np.zeros((L + 1, M + 1), int); best[0, 0] = 0
    for i in range(1, L + 1):
        for j in range(i, M + 1):
            for k in range(i - 1, j):
                if best[i - 1, k] >= INF:
                    continue
                c = best[i - 1, k] + ((segs[j - 1][1] - segs[k][0]) / T - share[i - 1]) ** 2 * 50
                if j < M:
                    c -= 0.6 * gaps[j - 1] / gmax
                if c < best[i, j]:
                    best[i, j], arg[i, j] = c, k
    out, j = [], M
    for i in range(L, 0, -1):
        k = arg[i, j]; out.append((segs[k][0], segs[j - 1][1])); j = k
    return out[::-1]


def main():
    spec, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    speed = dict(a.split("=") for a in sys.argv[3:] if "=" in a)
    cf = spec.parent / "cuts.json"
    manual = {k: v for k, v in json.loads(cf.read_text()).items() if not k.startswith("_")} if cf.exists() else {}
    durs = {}
    for req in json.loads(spec.read_text()):
        x = np.fromfile(out / f"{req['id']}_take.f32", np.float32)
        spans = auto_cuts(x, [t for _, _, t in req["lines"]])
        for (who, lid, text), (a, b) in zip(req["lines"], spans):
            if lid in manual:
                a, b = (int(v * SR) for v in manual[lid])
            seg = squeeze(x[a:b], 0.3 if sentences(text) > 2 else 0.22)
            if lid in speed:
                with tempfile.TemporaryDirectory() as td:
                    tts.write(pathlib.Path(td) / "a.wav", seg)
                    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(pathlib.Path(td) / "a.wav"), "-af", f"atempo={speed[lid]}",
                                          "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
                seg = np.frombuffer(raw, np.float32)
            r = int(0.01 * SR); env = np.ones(len(seg), np.float32); env[:r] = np.linspace(0, 1, r); env[-r:] = np.linspace(1, 0, r)
            tts.write(out / f"{lid}.wav", seg * env)
            durs[lid] = round(len(seg) / SR, 2)
            print(f"{lid:5s} {who:9s} {durs[lid]:5.2f} s  {f0(seg):4d} Hz  {'(cuts.json) ' if lid in manual else ''}{text[:56]}")
    (spec.parent / "durations.json").write_text(json.dumps(durs, indent=1) + "\n")
    print("->", spec.parent / "durations.json")


if __name__ == "__main__":
    main()
