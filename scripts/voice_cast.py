"""The voice step for a story.json v2 story (docs/story_craft.md section 6): a cast of Gemini voices instead of the
Kokoro narrator. Writes the same stories/<name>/voice/<id>.wav + voice.json that lib/story.js and
scripts/story_track.py read, so stunts and the edit don't change.

    python3 scripts/voice_cast.py stories/<name>              # every request whose lines aren't voiced yet
    python3 scripts/voice_cast.py stories/<name> --only r2    # re-voice one request (its wavs are deleted first)
    python3 scripts/voice_cast.py stories/<name> --timing     # only rebuild voice.json from the wavs

(main's scripts/tts.py also voices v2 stories, with the voices/cast.json library and its own cut; this script is the
pilot's path: its splitter groups a take's pauses by expected length, and voice_check.py verifies every line.)
- `requests[]` -> stories/<name>/voices.json in scripts/tts.py's list format (speakers = {cast id: voice}, lines =
  [[who, id, say]]), one Gemini request each (at most 2 speakers; the free tier allows only a few a day, so a
  scene's lines go in one request and tts.py splits the take at its pauses). The request's direction is its scene
  sentence, each speaker's `profile` and the lines' `direction` notes in order (never inline: models read those out).
- `say` (or `text` without the ` / ` and with CAPS lowered) is what the model reads.
- voice.json: each line's `dur` (the wav), `onset`/`end` (speech), and its caption chunks' times, spread over the
  speech by the chunks' spoken length (Gemini gives no word timestamps).
"""
import argparse
import json
import os
import pathlib
import re
import subprocess
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
import tts  # noqa: E402

SR = tts.SR
if os.environ.get('VOICE_MODELS'):   # e.g. VOICE_MODELS=gemini-3.8-flash-tts when the 2.5 quota is spent
    tts.MODELS = os.environ['VOICE_MODELS'].split(',')


def spoken(text):
    words = []
    for w in text.replace(" / ", " ").split():
        letters = [ch for ch in w if ch.isalpha()]
        words.append(w.lower() if len(letters) > 1 and all(ch.isupper() for ch in letters) else w)
    return " ".join(words)


def write_wav(path, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(path)], input=x.astype(np.float32).tobytes(), check=True)


def read_wav(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)


def split_lines(x, texts, gap=0.18):
    """Cut a take into len(texts) lines: the speech stretches (split at pauses over `gap`) grouped in order so each
    group's length matches its text's share (a line with an ellipsis has a pause inside it; a direction read aloud
    before the lines is dropped as leading stretches). Dynamic programming over the groupings."""
    segs = tts.speech_segments(x, gap=gap)
    n, m = len(texts), len(segs)
    w = [max(4, len(t)) for t in texts]
    best = None
    for skip in range(0, max(1, m - n + 1)):
        S = segs[skip:]
        if len(S) < n:
            break
        span = (S[-1][1] - S[0][0]) / SR
        rate = span / sum(w)
        INF = float("inf")
        cost = [[INF] * (len(S) + 1) for _ in range(n + 1)]; back = [[0] * (len(S) + 1) for _ in range(n + 1)]
        cost[0][0] = 0
        for i in range(1, n + 1):
            for j in range(i, len(S) + 1):
                for k in range(i - 1, j):
                    if cost[i - 1][k] == INF:
                        continue
                    d = (S[j - 1][1] - S[k][0]) / SR
                    c = cost[i - 1][k] + np.log(d / (w[i - 1] * rate)) ** 2
                    if c < cost[i][j]:
                        cost[i][j], back[i][j] = c, k
        c = cost[n][len(S)] + 0.5 * skip
        if best is None or c < best[0]:
            groups, j = [], len(S)
            for i in range(n, 0, -1):
                k = back[i][j]; groups.append((S[k][0], S[j - 1][1])); j = k
            best = (c, groups[::-1], skip)
    if best is None:   # fewer pauses than lines (a fast take): equal parts; voice_check.py --resplit cuts it by words
        print(f"  split: {m} stretches for {n} lines: equal parts (run voice_check.py --resplit)")
        k = len(x) // n
        return [x[i * k:(i + 1) * k] for i in range(n)]
    print(f"  split: {m} stretches -> {n} lines (skipped {best[2]} leading)")
    return [x[a:b] for a, b in best[1]]


def timing(story, vdir):
    wf = vdir / "words.json"
    words = json.loads(wf.read_text()) if wf.exists() else {}
    out = {"voice": "gemini cast", "sr": SR, "gap": story.get("gap", 0.25), "lines": {}}
    total = 0.0
    for ln in story["lines"]:
        p = vdir / f"{ln['id']}.wav"
        if not p.exists():
            print(f"{ln['id']}: no wav yet"); continue
        x = read_wav(p)
        dur = len(x) / SR
        f = 240; m = len(x) // f
        loud = np.nonzero(np.abs(x[:m * f]).reshape(m, f).max(1) > 0.02)[0]
        onset, end = (loud[0] * f / SR, (loud[-1] + 1) * f / SR) if len(loud) else (0.0, dur)
        caps = [c.strip() for c in ln["text"].split(" / ")]
        wl = words.get(ln["id"])
        if wl:   # Whisper's word times (scripts/voice_check.py --words): each chunk starts on its first word
            n0, chunks = 0, []
            for cap in caps:
                nw = len(cap.split())
                seg = wl[n0:n0 + nw] or wl[-1:]
                chunks.append([seg[0][1], seg[-1][2]]); n0 += nw
            for i in range(len(chunks) - 1):
                chunks[i][1] = max(chunks[i][1], chunks[i + 1][0])
            out["lines"][ln["id"]] = {"text": spoken(ln["text"]), "who": ln.get("who"), "dur": round(dur, 3), "onset": round(onset, 3), "end": round(end, 3), "chunks": chunks, "captions": caps}
            total += dur + out["gap"]
            print(f"{ln['id']:4s} {ln.get('who') or '':6s} {dur:5.2f}s  {spoken(ln['text'])}  (word times)")
            continue
        weights = [max(1, len(re.sub(r"[^A-Za-z0-9]", "", c))) + 2 for c in caps]
        span, acc, chunks = end - onset, 0, []
        for w in weights:
            a = onset + span * acc / sum(weights); acc += w
            chunks.append([round(a, 3), round(onset + span * acc / sum(weights), 3)])
        out["lines"][ln["id"]] = {"text": spoken(ln["text"]), "who": ln.get("who"), "dur": round(dur, 3), "onset": round(onset, 3), "end": round(end, 3), "chunks": chunks, "captions": caps}
        total += dur + out["gap"]
        print(f"{ln['id']:4s} {ln.get('who') or '':6s} {dur:5.2f}s  {spoken(ln['text'])}")
    out["total"] = round(total, 2)
    (vdir / "voice.json").write_text(json.dumps(out, indent=1))
    print(f"total {total:.1f}s with gaps")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("story_dir")
    ap.add_argument("--only", help="comma-separated request ids to re-voice")
    ap.add_argument("--timing", action="store_true")
    ap.add_argument("--fresh", action="store_true", help="ask the model again even if a take is cached")
    a = ap.parse_args()
    sd = pathlib.Path(a.story_dir)
    story = json.loads((sd / "story.json").read_text())
    vdir = sd / "voice"; vdir.mkdir(exist_ok=True)
    if not a.timing:
        cast = story["cast"]
        reqs = []
        for r in story["requests"]:
            # a line goes to its `request`, else to the first request that has its speaker
            mine = lambda l: l.get("request") == r["id"] if l.get("request") else next(q["id"] for q in story["requests"] if (l.get("who") or "N") in q["speakers"]) == r["id"]
            lines = [l for l in story["lines"] if mine(l)]
            # short: a long direction gets read aloud (the line notes stay in story.json for the people re-taking lines)
            profiles = " ".join(f"{s}: {cast[s]['profile']}." for s in r["speakers"])
            reqs.append({"id": r["id"], "direction": f"{r['direction']} {profiles}",
                         "speakers": {s: cast[s]["voice"] for s in r["speakers"]},
                         "lines": [[l.get("who") or "N", l["id"], l.get("say") or spoken(l["text"])] for l in lines]})
        (sd / "voices.json").write_text(json.dumps(reqs, indent=1))
        only = set(a.only.split(",")) if a.only else None
        for r in reqs:
            if only and r["id"] not in only:
                continue
            if not only and all((vdir / f"{lid}.wav").exists() for _, lid, _ in r["lines"]):
                continue
            take = vdir / f"{r['id']}_take.f32"
            if take.exists() and not a.fresh:
                x = np.fromfile(take, np.float32)
            else:
                text = r["direction"] + "\n" + "\n".join(f"{w}: {t}" if len(r["speakers"]) > 1 else t for w, _, t in r["lines"])
                x = tts.request(text, r["speakers"])
                if isinstance(x, tuple):   # main's tts.request returns (audio, model)
                    x = x[0]
                x.astype(np.float32).tofile(take)
            for (who, lid, t), seg in zip(r["lines"], split_lines(x, [t for _, _, t in r["lines"]])):
                write_wav(vdir / f"{lid}.wav", seg)
    timing(story, vdir)


if __name__ == "__main__":
    main()
