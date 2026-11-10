"""search.py <ref.wav> <out.json> : rank every Kokoro English male voice, then search Kokoro voice BLENDS (weighted mixes
of the style vectors) and a playback-rate factor, for the highest speaker-embedding similarity to the reference.

The reference is only measured (its Resemblyzer embedding); it is never given to Kokoro or any other model.

A candidate is  Kokoro(blend, speed) -> optional resample by `rate` (pitch, formants and tempo all rise by `rate`, like
playing the file faster; rate 1.0 = untouched). Kokoro's `speed` only changes durations, so the search scores timbre at
speed 1.0 and the speed is set afterwards to hit the reference's words per second.
"""
import json
import sys
import time

import numpy as np
import torch
from kokoro import KPipeline

import vm

VOICES = ["am_adam", "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx", "am_puck", "am_santa",
          "bm_daniel", "bm_fable", "bm_george", "bm_lewis"]
TEXT = ("The dog on the hill hasn't moved in nine hundred days. Not for rain. Not for thunder. Not even for zombies. "
        "My village is covered in nine thousand carpets. The roads. The stairs. Even the doghouse.")
RATES = [1.0, 1.1, 1.2, 1.3, 1.35, 1.4, 1.45, 1.5]
torch.set_num_threads(4)
rng = np.random.default_rng(7)


def resample(y, r):
    return y if r == 1.0 else np.interp(np.arange(0, len(y), r), np.arange(len(y)), y).astype(np.float32)


class Synth:
    def __init__(self):
        self.pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
        self.pipe_b = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M", model=self.pipe.model)
        self.packs = {v: self.pipe.load_single_voice(v) for v in VOICES}

    def pack(self, w):
        return sum(float(w[v]) * self.packs[v] for v in w if w[v])

    def __call__(self, w, text=TEXT, speed=1.0, british=False):
        p = self.pipe_b if british else self.pipe
        y = np.concatenate([r.audio.numpy() for r in p(text, voice=self.pack(w), speed=speed)])
        return np.interp(np.arange(0, len(y), 1.5), np.arange(len(y)), y).astype(np.float32)   # 24k -> 16k


def score(y16, ref, rates=RATES):
    return {r: float(np.dot(vm.embed(resample(y16, r)), ref)) for r in rates}


def main():
    ref = vm.embed(vm.load(sys.argv[1]))
    S = Synth()
    out = {"singles": {}, "blends": []}
    t = time.time()
    for v in VOICES:
        y = S({v: 1.0}, british=v.startswith("bm_"))
        out["singles"][v] = score(y, ref)
        best = max(out["singles"][v].items(), key=lambda kv: kv[1])
        print(f"{v:10s} raw {out['singles'][v][1.0]:.3f}  best x{best[0]} {best[1]:.3f}", flush=True)
    print(f"singles {time.time()-t:.0f}s", flush=True)

    # blend search: Dirichlet samples over the 6 best voices (by their best score at any rate), then local refinement
    top = sorted(VOICES, key=lambda v: -max(out["singles"][v].values()))[:6]
    # and separately over the 6 best untouched (rate 1.0) voices, for an unprocessed option
    top_raw = sorted(VOICES, key=lambda v: -out["singles"][v][1.0])[:6]
    for tag, pool, rates in (("rate", top, RATES), ("raw", top_raw, [1.0])):
        cands = []
        for i in range(40):
            k = rng.integers(2, 5)
            vs = list(rng.choice(pool, k, replace=False))
            w = dict(zip(vs, rng.dirichlet(np.ones(k))))
            y = S(w)
            sc = score(y, ref, rates)
            r, s = max(sc.items(), key=lambda kv: kv[1])
            cands.append((s, r, w))
        cands.sort(key=lambda c: -c[0])
        # refine the best 3: move 0.1 of weight between pairs, keep improvements
        for s, r, w in cands[:3]:
            w = {v: w.get(v, 0.0) for v in pool}
            for _ in range(25):
                a, b = rng.choice(pool, 2, replace=False)
                d = min(0.1, w[a])
                if d <= 0:
                    continue
                w2 = dict(w)
                w2[a] -= d
                w2[b] += d
                sc = score(S(w2), ref, rates)
                r2, s2 = max(sc.items(), key=lambda kv: kv[1])
                if s2 > s:
                    s, r, w = s2, r2, w2
            out["blends"].append({"search": tag, "cos": s, "rate": r,
                                  "weights": {v: round(x, 3) for v, x in w.items() if x > 1e-6}})
            print(tag, f"{s:.3f} x{r}", {v: round(x, 2) for v, x in w.items() if x > 1e-6}, flush=True)
    out["top_rate"], out["top_raw"] = top, top_raw
    json.dump(out, open(sys.argv[2], "w"), indent=1)
    print(f"total {time.time()-t:.0f}s")


if __name__ == "__main__":
    main()
