"""coldlisten.py <mp3>... : the cold-listener clarity check. Each clip goes alone to a Gemini listener (gemini-3.5-flash,
not a TTS model) that hears it once, with no script: it writes down what it heard, then rates clarity, age, realism
and how annoying it gets. Word accuracy is scored here against scripts/brand_voice/text.txt."""
import base64
import difflib
import json
import re
import sys
import time
import urllib.error
import urllib.request

ASK = ("You hear this clip ONCE, as a viewer scrolling Shorts would, with no script. Return JSON: transcript (exactly "
       "the words you caught, in order; leave out what you couldn't make out); unclear_words (any you had to guess); "
       "clarity 1-10; apparent_age (a number range); sex; sounds_like ('real kid', 'adult playing a kid', 'cartoon', "
       "'AI'); squeaky_or_grating 1-10 (10 = unbearable); pace ('too slow', 'right', 'rushed'); energy in 4 words; "
       "would_you_keep_listening (yes/no, why in 8 words).")
norm = lambda t: re.sub(r"[^a-z0-9 ]", " ", t.lower().replace("-", " ")).split()
NUM = {"9000": "nine thousand", "9 000": "nine thousand", "300": "three hundred", "900": "nine hundred"}
ref = norm(open(__import__("os").environ.get("TEXT") or __import__("os").path.join(__import__("os").path.dirname(__file__), "text.txt")).read())
MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]   # as speaker_check LISTEN_MODELS
out = {}
for f in sys.argv[1:]:
    body = {"contents": [{"parts": [{"text": ASK}, {"inlineData": {"mimeType": "audio/mpeg",
                                                                    "data": base64.b64encode(open(f, "rb").read()).decode()}}]}],
            "generationConfig": {"responseMimeType": "application/json"}}
    for attempt in range(6):
        try:
            req = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/{MODELS[min(attempt // 2, 2)]}:generateContent",
                data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": "proxy"})
            r = json.loads(urllib.request.urlopen(req, timeout=300).read())
            break
        except urllib.error.HTTPError as e:
            if (e.code < 500 and e.code != 429) or attempt == 5:
                raise
            time.sleep(5 * (attempt + 1))
    d = json.loads(r["candidates"][0]["content"]["parts"][-1]["text"])
    d = d[0] if isinstance(d, list) else d
    t = str(d.get("transcript", "")).lower()
    for k, v in NUM.items():
        t = t.replace(k, v)
    sm = difflib.SequenceMatcher(None, ref, norm(t))
    d["word_match"] = round(sm.ratio(), 3)
    d["misses"] = [(" ".join(ref[a:b]), " ".join(norm(t)[c:e])) for op, a, b, c, e in sm.get_opcodes() if op != "equal"]
    d["listener"] = MODELS[min(attempt // 2, 2)]
    out[f] = d
    json.dump(out, open("cold_listen.json", "w"), indent=1)
    print(f, json.dumps({k: d[k] for k in d if k != "transcript"}))
json.dump(out, open("cold_listen.json", "w"), indent=1)
