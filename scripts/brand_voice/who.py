"""who.py <mp3>... : the blind "who is this" listener for a casting audition. Each clip goes ALONE to a Gemini listener
(WHO_MODEL, default gemini-3-flash-preview: not a TTS model, no TTS quota; gemini-3.5-flash is the speaker checks' listener, keep its 20/day for them), with no names, no script and no role: it says who it hears.
Prints one JSON object per clip."""
import base64
import json
import sys
import time
import urllib.error
import urllib.request

ASK = ("You hear one short voice clip, with no context. Who is speaking? Return JSON: sex ('woman', 'man', 'girl', "
       "'boy', 'unsure'); age (a number range in years); role (the likeliest of: 'child', 'teenager', 'young woman', "
       "'mother', 'grandmother', 'young man', 'father', 'grandfather'); confidence 1-10; voice in 5 words "
       "(timbre, warmth, pitch); could_be_mistaken_for (another kind of speaker, or 'no').")
for f in sys.argv[1:]:
    body = {"contents": [{"parts": [{"text": ASK}, {"inlineData": {"mimeType": "audio/mpeg",
                                                                  "data": base64.b64encode(open(f, "rb").read()).decode()}}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/" + __import__("os").environ.get("WHO_MODEL", "gemini-3-flash-preview") + ":generateContent",
                                 data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": "proxy"})
    for attempt in range(4):
        try:
            r = json.loads(urllib.request.urlopen(req, timeout=90).read())
            break
        except (urllib.error.HTTPError, TimeoutError, OSError) as e:
            if getattr(e, "code", 503) not in (429, 500, 503) or attempt == 3:
                raise
            time.sleep(20 * (attempt + 1))
    a = json.loads(r["candidates"][0]["content"]["parts"][-1]["text"])
    a = a[0] if isinstance(a, list) else a
    print(json.dumps({"clip": f, **a}), flush=True)
