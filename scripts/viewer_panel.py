"""The viewer panel (`./hb panel <name>`): Gemini watches the finished Short like the owner does.

Our measured gates (pace.py, voice_edges.py, rec_check, qa_frames) read numbers. The owner's notes on 2026-11-10 were
things a viewer hears and sees: voices drifting between takes, words cut off, a voice "so high pitched and annoying",
a read that sounds like "sensual asmr", a pause in the opening, blurry glow, "what does the day one mean bro" (an
ending that needs explaining) and "is milo a woman?" (a voice that doesn't fit its character). This uploads the mp4
to Gemini and asks three viewers for a structured verdict:

  kid       a 12-year-old Minecraft fan (knows every mechanic, bored fast, says what he'd comment)
  scroller  a casual scroller who doesn't play Minecraft much (swipes in a second, judges the voice and the hook)
  editor    a strict Shorts editor (hears cut words, drifting voices, a pause, soft or blurry picture)

    python3 scripts/viewer_panel.py out/<name>.mp4 [--story stories/<name>] [--model M] [--fresh] [--json]
    ./hb panel <name>          (finds out/<name>.mp4 or ../hb-videos/shorts/<name>/short.mp4 and stories/<dir>)

Two Gemini calls (the proxy's shared daily quota: run it once per cut, not in a loop):
  1. watch (video + the line texts, NOT the twist or the cast notes): each persona's swipe moment, hook-in-2-s,
     their one-sentence explanation of the ending, what confused them, each voice as they heard it (sex, age, pitch,
     annoying, intimate/ASMR, drift), timed problems (cut-off word, drift, pause in the opening, blurry/dark/too
     zoomed...).
  2. judge (text only): compares each explanation with story.json's twist and each heard voice with the cast's
     intended profile, so the viewers never see the answer key.
The result is cached in work/panel/<name>.<sha12>.json by the video's hash: re-running on the same mp4 costs nothing.

Verdict: every item is PASS or FLAG; FLAGs are review inputs. BLOCK (a short-review blocker) only when 2+ personas
agree on: a cut-off word, a drifting voice, a voice of the wrong sex/age for its character, or a misunderstood ending.
Exit 1 on a BLOCK, 2 when it can't run.
"""
import argparse
import base64
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent.parent
VIDEOS = pathlib.Path(os.environ.get("HB_VIDEOS", HERE.parent / "hb-videos"))
API = "https://generativelanguage.googleapis.com"
KEY = os.environ.get("GEMINI_API_KEY", "proxy")        # the session proxy injects the real key for "proxy"
# tried in order: a model whose daily free-tier quota is spent (429 "per day") or that is gone is skipped at once,
# one under "high demand" (503) after a few retries. The shared quota is ~20 requests/day/model.
# No lite model by default: gemini-3.5-flash-lite passed all four calibration Shorts 8-10/10, including the two the
# owner disliked (it can't tell). `--model gemini-3.5-flash-lite` still works, and the report marks it low-confidence.
MODELS = os.environ.get("HB_PANEL_MODELS", "gemini-3.5-flash,gemini-3.8-flash,gemini-3-flash-preview,gemini-3.7-flash,gemini-flash-latest").split(",")
PROMPT_VERSION = 5                                       # bump when the prompts change: the cache key includes it
INLINE_MAX = 18 << 20                                    # inline request limit is ~20 MB
PERSONAS = ("kid", "scroller", "editor")
BLOCK_KINDS = {"cut_off": "a cut-off word", "drift": "a voice drifting (sounds like another person)",
               "voice_mismatch": "a voice of the wrong sex/age for its character", "ending": "the ending misunderstood"}


# ---------------------------------------------------------------- Gemini over the proxy
class ApiError(RuntimeError):
    def __init__(self, msg, code=None, skip=False):
        super().__init__(msg)
        self.code, self.skip = code, skip      # skip: retrying this model today is pointless


def _req(url, data=None, headers=None, method=None, timeout=300, tries=3):
    h = {"x-goog-api-key": KEY, **(headers or {})}
    for i in range(tries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h, method=method), timeout=timeout)
            return r.headers, r.read()
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf8", "replace")
            skip = (e.code == 429 and re.search(r"per ?day|PerDay", body)) or (e.code == 404) or "no longer available" in body
            if e.code in (429, 500, 502, 503, 504) and not skip and i < tries - 1:
                time.sleep(6 * (i + 1))
                continue
            msg = (re.search(r'"message": "([^"]{0,300})', body) or [None, body[:300]])[1]
            raise ApiError(f"HTTP {e.code} from {url.split('?')[0].split('/')[-1]}: {msg}", e.code, bool(skip)) from None
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if i < tries - 1:
                time.sleep(5 * (i + 1))
                continue
            raise ApiError(f"{url.split('?')[0]}: {e}") from None


def upload(video):
    """Files API (resumable, one shot): works through the proxy for the full 40-60 MB master (~3 s)."""
    size = video.stat().st_size
    hd, _ = _req(f"{API}/upload/v1beta/files", json.dumps({"file": {"display_name": video.stem[:40]}}).encode(), {
        "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": str(size), "X-Goog-Upload-Header-Content-Type": "video/mp4",
        "Content-Type": "application/json"})
    url = hd.get("X-Goog-Upload-URL") or hd.get("x-goog-upload-url")
    if not url:
        raise RuntimeError("Files API: no upload URL in the reply")
    _, body = _req(url, video.read_bytes(), {"Content-Length": str(size), "X-Goog-Upload-Offset": "0",
                                             "X-Goog-Upload-Command": "upload, finalize"}, timeout=600)
    f = json.loads(body)["file"]
    for _ in range(60):                                  # PROCESSING -> ACTIVE, usually 5-15 s
        if f.get("state") == "ACTIVE":
            return f
        if f.get("state") == "FAILED":
            raise RuntimeError(f"Files API: processing failed: {f}")
        time.sleep(3)
        f = json.loads(_req(f"{API}/v1beta/{f['name']}")[1])
    raise RuntimeError("Files API: still PROCESSING after 3 min")


def delete_file(f):
    try:
        _req(f"{API}/v1beta/{f['name']}", method="DELETE", tries=1, timeout=30)
    except RuntimeError:
        pass                                             # files expire in 48 h anyway


def small_copy(video, dest):
    """720x1280 / CRF 28 / AAC 128k: ~3-5 MB for a minute, for inline when the Files API is unavailable."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", "scale=720:1280", "-r", "30", "-c:v", "libx264",
                    "-crf", "28", "-preset", "veryfast", "-c:a", "aac", "-b:a", "128k", str(dest)], check=True)
    return dest


def generate(models, parts, rounds=3):
    """The first model in `models` that answers; returns (json, usage incl. the model used). A model out of its daily
    quota is dropped; one that is busy (503 / a per-minute 429) is tried again next round, after a pause."""
    errs, live = [], list(models)
    for rnd in range(rounds):
        for m in list(live):
            try:
                return _generate(m, parts)
            except ApiError as e:
                errs.append(f"{m}: {e}")
                if e.skip:
                    live.remove(m)
                print(f"panel: {m} didn't answer ({str(e)[:110]}){'; dropped for today' if e.skip else ''}", file=sys.stderr)
        if not live:
            break
        if rnd < rounds - 1:
            time.sleep(30)
    raise ApiError("no model answered:\n  " + "\n  ".join(e[:220] for e in errs[-len(models):]))


def _generate(model, parts):
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.4}}
    t0 = time.time()
    _, raw = _req(f"{API}/v1beta/models/{model}:generateContent", json.dumps(body).encode(), {"Content-Type": "application/json"}, timeout=600)
    r = json.loads(raw)
    cand = (r.get("candidates") or [{}])[0]
    text = "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts", []) if not p.get("thought"))
    if not text:
        raise ApiError(f"{model}: empty answer ({cand.get('finishReason')}, {r.get('promptFeedback')})")
    m = re.search(r"\{.*\}", text, re.S)
    try:
        ans = json.loads(m.group(0) if m else text)
    except json.JSONDecodeError as e:
        raise ApiError(f"{model}: the answer isn't JSON ({e}): {text[:200]}") from None
    return ans, {"model": r.get("modelVersion", model), "secs": round(time.time() - t0, 1), **(r.get("usageMetadata") or {})}


# ---------------------------------------------------------------- the story
def load_story(spec):
    if not spec:
        return None
    p = pathlib.Path(spec)
    p = p / "story.json" if p.is_dir() else p
    return json.loads(p.read_text()) if p.exists() else None


def find_story(name, video):
    base = re.sub(r"^story_", "", name)
    for c in (HERE / "stories" / base, VIDEOS / "shorts" / name / "source"):
        if (c / "story.json").exists():
            return c
    meta = VIDEOS / "shorts" / name / "metadata.json"
    if meta.exists():
        s = (json.loads(meta.read_text()).get("edit") or {}).get("story")
        if s and (HERE / s / "story.json").exists():
            return HERE / s
    return None


def kokoro_desc(v):
    sex = {"f": "female", "m": "male"}.get(str(v)[1:2], "?")
    return f"Kokoro TTS voice {v} (an adult {sex} voice)"


def speakers(story):
    """{speaker id: intended profile} and [(id, speaker, spoken text)]."""
    cast = story.get("cast") or {}
    prof = {k: f"{c.get('name', k)} ({c.get('role', '')}): {c.get('profile', '')}; voice {c.get('voice', '?')}; on screen: {c.get('on_screen', '?')}"
            for k, c in cast.items()}
    narr = next((k for k, c in cast.items() if c.get("role") == "narrator"), "N")
    if not prof:
        v = (story.get("voice") or {}).get("voice")
        prof[narr] = "the first-person narrator: " + (kokoro_desc(v) if v else "one narrator voice")
    lines = []
    for l in story.get("lines", []):
        txt = l.get("say") or re.sub(r"\s*/\s*", " ", l.get("text", ""))
        lines.append((l.get("id"), l.get("who") or narr, re.sub(r"\s+", " ", txt).strip()))
    return prof, lines


# ---------------------------------------------------------------- prompts
WATCH = """You are a test audience for a YouTube Short: a vertical, narrated Minecraft story for the channel HelloBuh.
Watch and LISTEN to the whole video carefully, with sound, as three different viewers, each answering honestly and
independently (they disagree when they would):

- "kid": a 12-year-old Minecraft fan. Knows every vanilla mechanic, has seen a thousand Minecraft Shorts, bored fast,
  says exactly what he'd type in the comments.
- "scroller": a casual adult scrolling Shorts on a phone, barely plays Minecraft. Gives a video one or two seconds.
  Very sensitive to a voice that is annoying, squeaky, robotic, whispery, or weird/creepy/intimate.
- "editor": a strict professional Shorts editor. Listens for words clipped at the start or end of a line, a voice that
  changes timbre/pitch/accent/age between lines or within a line (sounds like a different person or a different take),
  pauses or dead air (especially in the first 3 seconds), mumbled words, a voice that doesn't fit the character on
  screen, and picture problems: blurry or soft image, smeared glow/bloom, too dark, too zoomed in, the subject the
  words name not visible, jarring cuts.

The narrator is the first-person "I". Other characters may speak a few lines. For reference only (so the editor can
tell a clipped word from a written one), here is the script as written; the viewers know ONLY what they hear and see,
so judge understanding from the video, not from this text:
{script}

Be concrete and critical: a polished, professional short is the bar, not "good for a Minecraft video". Real Shorts
audiences are brutal: most viewers swipe within 3 seconds and only a strong video keeps half of them to the end, so a
viewer who "watches to the end" is the exception you must justify. Rating anchors: 3 = a typical Minecraft Short,
5 = fine but forgettable, 7 = they'd like it, 9 = they'd share it (rare). Every viewer names the single weakest moment,
even in a good video. Listen to each voice as a stranger would, out of context: a hushed, breathy, whispery or tender
read, or lines about obeying / waiting for someone / "good boy", can sound intimate or like ASMR even when the story is
innocent; a voice can sound like a woman or a child when the character is a man, or squeaky and grating. Use times in
seconds from the start of the video (e.g. 12.5). Report a problem only if you actually perceive it; if a check is
clean, say so (empty list / false). Do not invent issues to fill the form.

Return ONLY this JSON:
{{
 "personas": [  // exactly three: kid, scroller, editor
  {{"who": "kid",
    "swipe_at": 7.5,            // second they'd most likely swipe away, null if they'd watch to the end
    "swipe_why": "...",
    "hook_2s": true,             // in the first 2 s, is it clear what's strange / why to keep watching?
    "hook_note": "what they understood in the first 2 s",
    "twist_explained": "ONE sentence, in their own words: what was REALLY going on (who or what the narrator really is, why it all happened), as this viewer understood it from the video. Every persona answers as a viewer, the editor too (not a review of the edit). 'no idea' if they didn't get it",
    "ending_confidence": "sure|unsure|lost",
    "confusing": [{{"t": 0.0, "what": "..."}}],
    "voices": [  // every distinct voice they heard
      {{"speaker": "narrator | the character's name or description",
        "sex": "male|female|unclear", "age": "child|teen|young adult|adult|old", "pitch": "low|mid|high|squeaky",
        "sounds_like": "5 plain words for how it sounds (e.g. bright, fast, deep, hushed, breathy, nasal, squeaky, robotic, warm)",
        "annoying": false, "intimate_asmr": false,   // breathy/whispery/sensual/creepy-intimate read
        "drift": false,           // sounds like a different person or a different take at some point
        "fits_character": true,   // does this voice match who is speaking, as they understand the story?
        "note": "..."}}],
    "issues": [  // things THIS viewer noticed, timed
      {{"t": 3.2, "kind": "cut_off|drift|voice_mismatch|annoying_voice|asmr|opening_pause|dead_air|mumbled|blurry|dark|too_zoomed|subject_missing|confusing|glitch|other",
        "what": "the exact word or moment and what's wrong", "severity": "minor|major"}}],
    "weakest": {{"t": 0.0, "what": "the single weakest moment and why"}},
    "rating": 4,                 // 1-10 on the anchors above
    "comment": "the comment they'd leave"}}
 ],
 "transcript_check": [  // editor: every line where what you HEAR differs from the script (a clipped, swallowed or missing word)
  {{"t": 1.2, "line": "the written line", "heard": "what was actually audible", "problem": "..."}}],
 "opening_pause": {{"t": null, "secs": 0.0}},   // any pause or dead air > 0.3 s in the first 3 s
 "length_feel": "too short|right|too long"
}}"""

JUDGE = """You check a test audience's answers about a narrated Minecraft Short against the writers' notes.

The story's real twist / ending (the writers' answer key):
{twist}

The cast as intended (who each voice should sound like):
{cast}

The viewers' answers (each heard the video once, cold):
{answers}

For each viewer: does their one-sentence explanation of the ending match the real twist? "yes" = the core of the twist
(who/what the narrator really is, or what really happened) is right and nothing in it contradicts the twist;
"partly" = they got the setup or a piece but missed or garbled the key reveal, or they added an explanation the story
doesn't support (a clone, a dream, a ghost...); "no" = wrong or no idea. Be strict: a vague answer ("he gets blown up",
"the ending was a twist") that doesn't state the reveal is "partly", not "yes".
For each voice each viewer heard: match it to a cast member and say whether the heard sex and age fit the intended
profile ("is milo a woman?" = a mismatch). A narrator who is meant to be an animal or a mob voiced as a person is not a
mismatch by itself; judge sex and age against the profile text. Unclear evidence = match.

Return ONLY this JSON:
{{"ending": [{{"who": "kid", "match": "yes|partly|no", "why": "..."}}],
  "voices": [{{"who": "kid", "speaker": "as they named it", "cast": "cast id or ?", "intended": "short", "heard": "short",
              "mismatch": false, "why": "..."}}]}}"""


def script_text(lines):
    return "\n".join(f"  {lid} [{who}]: {txt}" for lid, who, txt in lines) or "  (no script given)"


# ---------------------------------------------------------------- verdict
ASMR = r"hush|breath|whisper|sensual|sultry|intimate|asmr|husky|murmur|seductive|creepy"
ANNOY = r"squeak|shrill|grating|annoying|nasal|piercing|high-pitched|whiny|robotic|monoton"


def words(v, pat):
    txt = f"{v.get('sounds_like', '')}. {v.get('note', '')}"
    txt = re.sub(r"\b(not|no|never|isn't|wasn't|without|nor)\b[^.,;]*", " ", txt, flags=re.I)   # "pleasant and not grating"
    return re.search(pat, txt, re.I)


def verdict(watch, judge, story):
    P = {p.get("who"): p for p in watch.get("personas", [])}
    items = []                                           # (level, check, t, msg)

    def agree(kind_set, pred=None):
        hits = {}
        for who, p in P.items():
            for i in p.get("issues", []):
                if i.get("kind") in kind_set:
                    hits.setdefault(who, []).append(i)
            for v in p.get("voices", []):
                if pred and pred(v):
                    hits.setdefault(who, []).append({"t": None, "what": f"{v.get('speaker')} ({v.get('sounds_like', '')}): {v.get('note', '')}", "voice": v})
        return hits

    def add(check, hits, block_kind=None, minor_ok=False):
        n = len(hits)
        if not n:
            items.append(("PASS", check, None, "nobody noticed it"))
            return
        lvl = "BLOCK" if block_kind and n >= 2 else "FLAG"
        if lvl == "FLAG" and n >= 2:
            check += " (2+ agree: strong)"
        ts = sorted({round(i["t"], 1) for v in hits.values() for i in v if isinstance(i.get("t"), (int, float))})
        what = "; ".join(f"{w}: " + " / ".join(str(i.get("what", ""))[:110] for i in v[:2]) for w, v in hits.items())
        items.append((lvl, check, ts[0] if ts else None, f"{n}/3 ({', '.join(hits)})" + (f" at {', '.join(map(str, ts[:5]))} s" if ts else "") + f": {what}"))

    # hook
    no_hook = {w: [{"t": 0, "what": p.get("hook_note", "")}] for w, p in P.items() if p.get("hook_2s") is False}
    add("hook in 2 s", no_hook)
    # swipe
    sw = {w: [{"t": p["swipe_at"], "what": p.get("swipe_why", "")}] for w, p in P.items() if isinstance(p.get("swipe_at"), (int, float))}
    add("swipe away", sw)
    # voices
    co = agree({"cut_off"})
    clipped = [c for c in watch.get("transcript_check", []) if re.search(r"clip|cut|swallow|missing|truncat|chopp", str(c.get("problem", "")), re.I)]
    if clipped and "editor" not in co:                   # the editor's line-by-line listening counts as the editor's vote
        co["editor"] = [{"t": c.get("t"), "what": f"{c.get('heard')!r}: {c.get('problem')}"} for c in clipped]
    add("word cut off", co, "cut_off")
    add("voice drift", agree({"drift"}, lambda v: v.get("drift")), "drift")
    mism = {}
    for v in (judge or {}).get("voices", []):
        if v.get("mismatch"):
            mism.setdefault(v.get("who"), []).append({"t": None, "what": f"{v.get('speaker')} heard as {v.get('heard')}, meant {v.get('intended')}"})
    if not judge:
        mism = agree({"voice_mismatch"}, lambda v: v.get("fits_character") is False)
    add("voice fits character (sex/age)", mism, "voice_mismatch")
    # the yes/no answers miss a lot (calibration: "hushed, breathy" with intimate_asmr false), so the words count too
    add("annoying voice", agree({"annoying_voice"}, lambda v: v.get("annoying") or v.get("pitch") == "squeaky" or words(v, ANNOY)))
    add("intimate / ASMR read", agree({"asmr"}, lambda v: v.get("intimate_asmr") or words(v, ASMR)))
    op = watch.get("opening_pause") or {}
    opening = agree({"opening_pause"})
    if (op.get("secs") or 0) > 0.3:
        opening.setdefault("editor", []).append({"t": op.get("t") or 0, "what": f"{op.get('secs')} s pause in the first 3 s"})
    add("pause in the opening", opening)
    add("dead air / mumbled", agree({"dead_air", "mumbled"}))
    # ending
    ends = {}
    jm = {e.get("who"): e for e in (judge or {}).get("ending", [])}
    for w, p in P.items():
        m = (jm.get(w) or {}).get("match")
        if m in ("no", "partly") or (not judge and p.get("ending_confidence") == "lost"):
            ends[w] = [{"t": None, "what": f"{m or p.get('ending_confidence')}: \"{p.get('twist_explained', '')[:120]}\""}]
    nl = sum((jm.get(w) or {}).get("match") == "no" for w in P)
    if ends:
        lvl = "BLOCK" if nl >= 2 else "FLAG"
        items.append((lvl, "ending understood", None, f"{len(ends)}/3 missed it ({nl} wrong): " + "; ".join(f"{w}: {v[0]['what']}" for w, v in ends.items())))
    else:
        items.append(("PASS", "ending understood", None, "all three explained the twist back"))
    add("confusing", {w: p.get("confusing") for w, p in P.items() if p.get("confusing")})
    add("picture (blurry/dark/zoomed/subject)", agree({"blurry", "dark", "too_zoomed", "subject_missing", "glitch"}))
    lf = watch.get("length_feel")
    items.append(("FLAG" if lf == "too long" else "PASS", "length", None, f"feels {lf}"))
    return items


def report(name, video, res):
    w, j = res["watch"], res.get("judge") or {}
    jm = {e.get("who"): e for e in j.get("ending", [])}
    lite = "lite" in res["meta"]["model"]
    out = [f"viewer panel: {name} ({video.name}, {res['meta']['duration']:.1f} s) — {res['meta']['model']}, "
           f"{res['meta']['calls']} call(s), {res['meta']['secs']:.0f} s, {res['meta']['tokens']} tokens{' (cached)' if res.get('cached') else ''}"
           + (" — LOW CONFIDENCE: a lite model passes almost everything" if lite else "")]
    for p in w.get("personas", []):
        sw = f"swipes at {p['swipe_at']} s ({p.get('swipe_why', '')})" if isinstance(p.get("swipe_at"), (int, float)) else "watches to the end"
        out.append(f"  {p.get('who', '?'):<8} {p.get('rating', '?')}/10, {sw}")
        out.append(f"           ending: \"{p.get('twist_explained', '')}\" -> {(jm.get(p.get('who')) or {}).get('match', '?')}")
        out.append(f"           voices: " + "; ".join(f"{v.get('speaker')}={v.get('sex')}/{v.get('age')}/{v.get('pitch')} ({v.get('sounds_like', '')})" for v in p.get("voices", [])))
        wk = p.get("weakest") or {}
        if wk.get("what"):
            out.append(f"           weakest: {wk.get('t')} s: {wk['what']}")
        if p.get("comment"):
            out.append(f"           comment: \"{p['comment']}\"")
    for c in w.get("transcript_check", [])[:6]:
        out.append(f"  heard  {c.get('t')} s: {c.get('heard')!r} (script: {c.get('line')!r}): {c.get('problem')}")
    for lvl, check, t, msg in res["items"]:
        out.append(f"{lvl:<5} [{check}] {msg}")
    nb = sum(i[0] == "BLOCK" for i in res["items"])
    nf = sum(i[0] == "FLAG" for i in res["items"])
    out.append(f"{'FAIL' if nb else 'OK'}: {nb} blocker(s) (2+ viewers agree on a cut word, drift, a wrong-sex/age voice or a missed ending), "
               f"{nf} flag(s) (review inputs: confirm by ear and eye). twist: {res['meta'].get('twist', '-')[:160]}")
    return "\n".join(out)


# ---------------------------------------------------------------- main
def resolve_video(arg):
    p = pathlib.Path(arg)
    if p.suffix == ".mp4":
        return p, re.sub(r"^short$", p.parent.name, p.stem)
    for c in (HERE / "out" / f"{arg}.mp4", VIDEOS / "shorts" / arg / "short.mp4"):
        if c.exists():
            return c, arg
    return None, arg


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", help="out/<name>.mp4, a published short.mp4, or a stunt name")
    ap.add_argument("--story", help="stories/<dir> or a story.json (default: found from the name)")
    ap.add_argument("--model", help=f"one model, or a comma list tried in order (default {','.join(MODELS)})")
    ap.add_argument("--inline", action="store_true", help="send a 720p copy inline instead of the Files API upload")
    ap.add_argument("--fresh", action="store_true", help="ignore the cached verdict for this exact mp4")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    models = a.model.split(",") if a.model else MODELS
    video, name = resolve_video(a.video)
    if not video or not video.exists():
        print(f"panel: no video for {a.video} (out/<name>.mp4 or {VIDEOS}/shorts/<name>/short.mp4)", file=sys.stderr)
        return 2
    sdir = a.story or find_story(name, video)
    story = load_story(sdir) or {}
    prof, lines = speakers(story) if story else ({}, [])
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
                               capture_output=True, text=True).stdout.strip() or 0)
    sha = hashlib.sha256(video.read_bytes()).hexdigest()[:12]
    skey = hashlib.sha256(json.dumps([story.get("twist"), lines, prof, PROMPT_VERSION]).encode()).hexdigest()[:6]
    cache = HERE / "work" / "panel" / f"{name}.{sha}.{skey}.json"
    res = None
    if cache.exists() and not a.fresh:
        res = json.loads(cache.read_text())
        res["cached"] = True
    else:
        t0 = time.time()
        f = None
        try:
            cache.parent.mkdir(parents=True, exist_ok=True)
            if a.inline:
                small = video if video.stat().st_size < INLINE_MAX else small_copy(video, cache.parent / f"{name}.small.mp4")
                vpart = {"inline_data": {"mime_type": "video/mp4", "data": base64.b64encode(small.read_bytes()).decode()}}
            else:
                try:
                    f = upload(video)
                    vpart = {"file_data": {"mime_type": "video/mp4", "file_uri": f["uri"]}}
                except RuntimeError as e:
                    print(f"panel: Files API failed ({e}); sending a 720p copy inline", file=sys.stderr)
                    small = small_copy(video, cache.parent / f"{name}.small.mp4")
                    vpart = {"inline_data": {"mime_type": "video/mp4", "data": base64.b64encode(small.read_bytes()).decode()}}
            watch, u1 = generate(models, [vpart, {"text": WATCH.format(script=script_text(lines))}])
        except RuntimeError as e:
            print(f"panel: {e}", file=sys.stderr)
            return 2
        finally:
            if f:
                delete_file(f)
        judge, u2 = None, {}
        if story.get("twist") or prof:
            answers = [{"who": p.get("who"), "explained": p.get("twist_explained"), "confidence": p.get("ending_confidence"),
                        "voices": [{k: v.get(k) for k in ("speaker", "sex", "age", "pitch", "note")} for v in p.get("voices", [])]}
                       for p in watch.get("personas", [])]
            try:
                judge, u2 = generate([u1["model"]] + [m for m in models if m != u1["model"]], [{"text": JUDGE.format(twist=story.get("twist") or "(not written down)",
                                                                     cast="\n".join(f"  {k}: {v}" for k, v in prof.items()) or "  (unknown)",
                                                                     answers=json.dumps(answers, indent=1))}])
            except RuntimeError as e:
                print(f"panel: the judge call failed ({e}); falling back to the viewers' own answers", file=sys.stderr)
        res = {"watch": watch, "judge": judge, "meta": {
            "model": u1["model"], "video": str(video), "sha": sha, "duration": dur, "story": str(sdir) if sdir else None,
            "twist": story.get("twist", ""), "calls": 1 + bool(u2), "secs": round(time.time() - t0, 1),
            "tokens": sum(u.get("totalTokenCount", 0) for u in (u1, u2)),
            "usage": {"watch": u1, "judge": u2}, "at": time.strftime("%Y-%m-%dT%H:%M:%S")}}
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(res, indent=1))
    res["items"] = verdict(res["watch"], res.get("judge"), story)
    res["ok"] = not any(i[0] == "BLOCK" for i in res["items"])
    res["cache"] = str(cache)
    print(json.dumps(res, default=str) if a.json else report(name, video, res))
    return 0 if res["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
