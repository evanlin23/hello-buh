"""gem.py <model> <voice> <out.wav> <layout: bracket|plain> : ONE Gemini TTS request (the proxy injects the key)."""
import base64
import json
import subprocess
import sys
import urllib.error
import urllib.request

model, voice, out, layout = sys.argv[1:5]
TEXT = open(sys.argv[5] if len(sys.argv) > 5 else "scripts/voice_search/text.txt").read().strip()
DIR = ("A guy in his early twenties telling his friend a crazy true story from his own life, first person; quick, steady "
       "pace with no gaps between sentences; mostly deadpan and matter-of-fact so the weird details land funny, a dry "
       "smirk in the voice; he goes quiet and honest on the sad line and gets genuinely hyped on the exciting one; "
       "warm, clear, natural American voice, not an announcer, never whispery")
prompt = f"[{DIR}]\n\n{TEXT}" if layout == "bracket" else f"Read this aloud as {DIR[0].lower() + DIR[1:]}:\n\n{TEXT}"
body = json.dumps({"contents": [{"parts": [{"text": prompt}]}],
                   "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {
                       "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}).encode()
req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", data=body,
                             headers={"Content-Type": "application/json", "x-goog-api-key": "proxy"})
try:
    r = json.loads(urllib.request.urlopen(req, timeout=300).read())
except urllib.error.HTTPError as e:
    sys.exit(f"{model}: {e.code} {e.read()[:300]!r}")
part = r["candidates"][0]["content"]["parts"][0]["inlineData"]
data = base64.b64decode(part["data"])
print(model, voice, part["mimeType"], len(data))
args = ["-f", "s16le", "-ar", "24000", "-ac", "1"] if "wav" not in part["mimeType"] else []
subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-i", "-", "-ac", "1", "-ar", "24000", out], input=data, check=True)
json.dump({"model": model, "voice": voice, "prompt": prompt}, open(out + ".json", "w"), indent=1)
