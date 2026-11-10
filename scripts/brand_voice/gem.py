"""Brand-narrator auditions on gemini-3.8-flash-tts (docs/brand.md). Every call here is ONE request against the
~10/day free quota; each is logged to out/brand_voice/requests.log. The proxy injects the key.

  gem.py design <name> <male|female> <description>        voices.create (type prompted): a custom voice from words;
                                                           saves its id and Google's own sample_audio
  gem.py say <name> <voice id> <style> [text file]         Interactions API: read the audition text in that voice
  gem.py gc <name> <model> <prebuilt voice> <direction> [text file]  generateContent, Pip's layout: "[direction]" + blank line +
                                                           the text (voices/recipes/pip.md); works on flash-lite-tts

No reference audio is ever sent: these voices come from text descriptions or the stock library, never a clone."""
import base64
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = "https://generativelanguage.googleapis.com/v1beta"
MODEL = "gemini-3.8-flash-tts"
OUT = "out/brand_voice"


def post(path, body):
    req = urllib.request.Request(f"{API}/{path}", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": "proxy"})
    with open(f"{OUT}/requests.log", "a") as f:
        f.write(f"{time.strftime('%H:%M:%S')} {path} {sys.argv[2]}\n")
    try:
        return json.loads(urllib.request.urlopen(req, timeout=300).read())
    except urllib.error.HTTPError as e:
        sys.exit(f"{path}: {e.code} {e.read()[:600]!r}")


def wav(b64, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "-", "-ac", "1", "-ar", "24000", out],
                   input=base64.b64decode(b64), check=True)


mode, name = sys.argv[1:3]
if mode == "design":
    gender, desc = sys.argv[3:5]
    r = post("voices", {"store": True, "voice": {"model": MODEL, "type": "prompted", "display_name": f"hellobuh-{name}",
                                                 "gender": gender, "language_code": "en-US",
                                                 "prompted": {"input": desc}}})
    sa = r.pop("sample_audio", None) or r.get("voice", {}).pop("sample_audio", None)
    if sa:
        wav(sa["data"], f"{OUT}/{name}_google_sample.wav")
    json.dump({"description": desc, "response": r}, open(f"{OUT}/{name}.voice.json", "w"), indent=1)
    print(json.dumps(r)[:400])
elif mode == "gc":
    MODEL, voice, direction = sys.argv[3:6]
    text = open(sys.argv[6] if len(sys.argv) > 6 else "scripts/brand_voice/text.txt").read().strip()
    prompt = f"[{direction}]\n\n{text}"
    r = post(f"models/{MODEL}:generateContent", {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {
        "responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}})
    part = r["candidates"][0]["content"]["parts"][0]["inlineData"]
    args = ["-f", "s16le", "-ar", "24000", "-ac", "1"] if "wav" not in part["mimeType"] else []
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-i", "-", "-ac", "1", "-ar", "24000", f"{OUT}/{name}_raw.wav"],
                   input=base64.b64decode(part["data"]), check=True)
    json.dump({"model": MODEL, "voice": voice, "prompt": prompt}, open(f"{OUT}/{name}_raw.wav.json", "w"), indent=1)
    print(name, "ok", part["mimeType"])
else:
    voice, style = sys.argv[3:5]
    text = open(sys.argv[5] if len(sys.argv) > 5 else "scripts/brand_voice/text.txt").read().strip()
    item = {"type": "text", "text": text}
    if style:
        item["annotations"] = [{"type": "speech_metadata", "style": style}]
    r = post("interactions", {"model": MODEL, "input": [{"type": "user_input", "content": [item]}],
                              "response_format": {"type": "audio"},
                              "generation_config": {"speech_config": [{"voice": voice}]}})
    aud = [c for s in r.get("steps", []) if s.get("type") == "model_output" for c in s.get("content", [])
           if c.get("type") == "audio"]
    if not aud:
        sys.exit("no audio: " + json.dumps(r)[:600])
    wav(aud[-1]["data"], f"{OUT}/{name}_raw.wav")
    json.dump({"model": MODEL, "voice": voice, "style": style, "text": text}, open(f"{OUT}/{name}_raw.wav.json", "w"), indent=1)
    print(name, "ok")
