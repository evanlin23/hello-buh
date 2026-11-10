"""listen.py <mp3>... : ONE request to a Gemini listener (gemini-3.5-flash, not a TTS model, so no TTS quota) that
rates each audition blind: age, sex, realism, how distinctive, and whether it sounds like a famous/stock voice."""
import base64
import json
import sys
import urllib.request

files = sys.argv[1:]
parts = [{"text": (
    "You will hear %d short voice clips, labelled A, B, C... in order. Each is a narrator for a Minecraft story "
    "YouTube Short. For each clip, as JSON (a list of objects), give: label; apparent age; sex; realism 1-10 (could a "
    "listener tell it is AI?) with what gives it away; distinctiveness 1-10 (would you recognise this narrator again "
    "in a feed of Shorts, versus the generic TTS voices those Shorts use?); does it resemble any famous person or a "
    "well-known stock TTS voice (name it, or 'no'); energy and attitude in 5 words; pace (too slow / right / rushed); "
    "anything annoying after 30 s of it. Then 'best' (which label you'd pick for a channel brand voice, and why in one "
    "sentence). Be blunt.") % len(files)}]
for i, f in enumerate(files):
    parts += [{"text": f"Clip {chr(65 + i)}:"},
              {"inlineData": {"mimeType": "audio/mpeg", "data": base64.b64encode(open(f, "rb").read()).decode()}}]
body = {"contents": [{"parts": parts}], "generationConfig": {"responseMimeType": "application/json"}}
req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
                             data=json.dumps(body).encode(),
                             headers={"Content-Type": "application/json", "x-goog-api-key": "proxy"})
r = json.loads(urllib.request.urlopen(req, timeout=300).read())
print(r["candidates"][0]["content"]["parts"][-1]["text"])
