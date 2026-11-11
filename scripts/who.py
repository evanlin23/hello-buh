"""who.py: the blind "who is this" listener (STANDARDS 2.7, r:rf8060c "Grandma sounds like a dude still").

Each clip goes ALONE to a Gemini listener (WHO_MODEL, default gemini-3-flash-preview: not a TTS model, so no TTS quota;
gemini-3.5-flash is the speaker checks' listener, keep its 20/day for them), with no names, no script and no role: it
says who it hears (sex, age range, role). The words lean the role ("sweetie" makes everyone a mother), so only the sex
and the age are used by scripts/voice_contrast.py.

    python3 scripts/who.py clip.mp3 [clip2.wav ...]        # one JSON object per clip (reversed; no cache)
    python3 scripts/who.py --forward clip.mp3              # the clip as recorded (the audition's listener)

As a module: hear(path) -> dict (raises WhoError when the listener can't be reached), and cached(path), which keeps
the answer in voices/who_cache.json keyed by the clip's content hash, so a check never re-asks about a take it heard.
"""
import base64
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.error
import urllib.request

MODEL = os.environ.get("WHO_MODEL", "gemini-3-flash-preview")
# on a 429 (each model's free tier is 20 a day) the next listener is asked; the answer records which one heard it
FALLBACK = [m for m in os.environ.get("WHO_FALLBACK", "gemini-3.6-flash,gemini-3.5-flash-lite").split(",") if m]
ASK = ("You hear one short voice clip, with no context. Who is speaking? Return JSON: sex ('woman', 'man', 'girl', "
       "'boy', 'unsure'); age (a number range in years); role (the likeliest of: 'child', 'teenager', 'young woman', "
       "'mother', 'grandmother', 'young man', 'father', 'grandfather'); confidence 1-10; voice in 5 words "
       "(timbre, warmth, pitch); could_be_mistaken_for (another kind of speaker, or 'no').")


class WhoError(Exception):
    pass


def sha(path):
    return hashlib.sha1(pathlib.Path(path).read_bytes()).hexdigest()[:12]


def _mp3(path, reverse=False):
    """The clip as mp3 bytes (a wav is encoded first: a smaller request, like the audition's clips). reverse: played
    backwards, so the listener hears the voice (pitch, timbre, rasp) and not the words: forwards, "One's plenty,
    sweetie" made Gold's Vindemiatrix Grandma "woman, 55-70, grandmother, 9/10"; backwards the same take is "man,
    deep, raspy, gravelly", the owner's "Grandma sounds like a dude still" (r:rf8060c)."""
    p = pathlib.Path(path)
    if p.suffix.lower() == ".mp3" and not reverse:
        return p.read_bytes()
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), *(["-af", "areverse"] if reverse else []), "-ac", "1", "-b:a", "96k", "-f", "mp3", "-"],
                       capture_output=True)
    if r.returncode:
        raise WhoError(f"ffmpeg could not read {p}: {r.stderr.decode()[-200:]}")
    return r.stdout


def age_range(a):
    """The listener's age as [lo, hi] (it answers "55-75", [55, 75], 60 or {"min": .., "max": ..})."""
    if isinstance(a, dict):
        a = [a.get("min", a.get("low")), a.get("max", a.get("high"))]
    if isinstance(a, (int, float)):
        return [float(a), float(a)]
    if isinstance(a, str):
        import re
        n = [float(x) for x in re.findall(r"\d+(?:\.\d+)?", a)]
        return [n[0], n[-1]] if n else None
    if isinstance(a, (list, tuple)) and a and all(isinstance(x, (int, float)) for x in a if x is not None):
        n = [float(x) for x in a if x is not None]
        return [min(n), max(n)] if n else None
    return None


def hear(path, model=None, retries=3, reverse=True):
    """The listener's answer for one clip (reversed by default: the voice, not the words). On a 429 the FALLBACK
    listeners are tried in turn."""
    models = [model] if model else [MODEL] + [m for m in FALLBACK if m != MODEL]
    errs = []
    for m in models:
        try:
            return {**_hear(path, m, retries, reverse), "reversed": reverse}
        except WhoError as e:
            errs.append(str(e))
            if "429" not in str(e):
                break
    raise WhoError("; ".join(errs))


def _hear(path, model, retries, reverse):
    body = {"contents": [{"parts": [{"text": ASK}, {"inlineData": {"mimeType": "audio/mpeg", "data": base64.b64encode(_mp3(path, reverse)).decode()}}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                                 data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": os.environ.get("GEMINI_API_KEY", "proxy")})
    for attempt in range(retries + 1):
        try:
            r = json.loads(urllib.request.urlopen(req, timeout=90).read())
            break
        except (urllib.error.HTTPError, TimeoutError, OSError) as e:
            code = getattr(e, "code", None)
            if code not in (429, 500, 502, 503, 504, None) or attempt == retries:
                raise WhoError(f"listener {model}: {e}")
            if code == 429:   # a day's quota, not a blip: the caller moves to the next listener
                raise WhoError(f"listener {model}: 429 (quota)")
            time.sleep(15 * (attempt + 1))
    try:
        a = json.loads(r["candidates"][0]["content"]["parts"][-1]["text"])
    except (KeyError, IndexError, ValueError) as e:
        raise WhoError(f"listener {model}: no answer ({e})")
    a = a[0] if isinstance(a, list) else a
    return {"model": model, "sex": str(a.get("sex", "unsure")).lower(), "age": age_range(a.get("age")), "role": a.get("role"),
            "confidence": a.get("confidence"), "voice": a.get("voice"), "could_be_mistaken_for": a.get("could_be_mistaken_for")}


CACHE = pathlib.Path(__file__).resolve().parent.parent / "voices" / "who_cache.json"


def cached(path, cache_file=CACHE, listen=True, reverse=True, label=None):
    """The listener's answer for a clip, from cache_file when a clip with the same content was heard before (keyed by
    the clip's sha1, so a re-take is heard again and a copy of the same take on another branch is not); else asked
    and saved when listen is on. -> (answer or None, 'cache' | 'asked' | 'off' | 'error: ...')."""
    cache_file = pathlib.Path(cache_file)
    try:
        c = json.loads(cache_file.read_text())
    except (OSError, ValueError):
        c = {}
    key = sha(path) + ("" if reverse else ":fwd")
    if key in c:
        return c[key], "cache"
    if not listen:
        return None, "off"
    try:
        a = hear(path, reverse=reverse)
    except WhoError as e:
        return None, f"error: {e}"
    c[key] = {**a, "clip": label or str(path), "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    c["_about"] = ("scripts/who.py: the blind listener's answer per take, keyed by the wav's sha1[:12] (':fwd' = played "
                   "forwards); scripts/voice_contrast.py reads it so ./hb check never asks twice about the same take")
    cache_file.write_text(json.dumps(dict(sorted(c.items())), indent=1) + "\n")
    return c[key], "asked"


if __name__ == "__main__":
    fwd = "--forward" in sys.argv
    for f in [a for a in sys.argv[1:] if a != "--forward"]:
        print(json.dumps({"clip": f, **hear(f, reverse=not fwd)}), flush=True)
