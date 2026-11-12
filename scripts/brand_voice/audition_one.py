"""audition_one.py: one single-speaker take per candidate voice for a casting audition, judged against Pip
(Buh Stories lead 2026-11-12, batch 3: Jonah and the Pulled Away man). Run in the TTS venv:

    ~/.hb-tts/bin/python scripts/brand_voice/audition_one.py <out dir> <letter> <voice> <model> "<bracket>" "<line>"

ONE request (tts.request: logged to work/tts/quota.json, 429s read). The prompt is Pip's layout: "[bracket]", a blank
line, the line. The take is cut by tts.cut (Whisper word times + the quiet point) and written as
<out>/<letter>/voice/C01.wav, with a story.json + voice.json beside it holding Pip's dog_hill narrator lines as the
narrator, so scripts/speaker_check.py and scripts/voice_contrast.py run on it unchanged. Never a reference clip."""
import json
import pathlib
import shutil
import subprocess
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE.parent))
import tts  # noqa: E402

PIP = ROOT / "stories" / "dog_hill"


def write(p, x):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(tts.SR), "-ac", "1", "-i", "-", str(p)],
                   input=np.asarray(x, np.float32).tobytes(), check=True)


def scaffold(d, reads_as, line, take=None, bracket=""):
    """<d>/story.json + voice/: Pip's dog_hill narrator lines (copies) as N, the candidate's take as C01."""
    v = d / "voice"
    v.mkdir(parents=True, exist_ok=True)
    pj = json.loads((PIP / "voice" / "voice.json").read_text())["lines"]
    pst = {l["id"]: l for l in json.loads((PIP / "story.json").read_text())["lines"]}
    lines, vj = [], {}
    for k, l in pj.items():
        if l.get("who") == "N":
            shutil.copy(PIP / "voice" / f"{k}.wav", v / f"P{k[1:]}.wav")
            lines.append({"id": f"P{k[1:]}", "who": "N", "text": pst[k]["text"], **({"say": pst[k]["say"]} if pst[k].get("say") else {})})
            vj[f"P{k[1:]}"] = {"who": "N"}
    lines.append({"id": "C01", "who": "Cand", "text": line, "say": line})
    vj["C01"] = {"who": "Cand", "with": ["Cand"]}
    story = {"title": f"audition {d.name}", "cast": {"N": {"role": "narrator", "ref": "pip"},
                                                     "Cand": {"role": "character", "name": "Cand", "voice": take or "?", "profile": bracket.strip("[]"),
                                                              "reads_as": reads_as}},
             "requests": [{"id": "rN", "speakers": ["N"]}, {"id": "rC", "speakers": ["Cand"]}], "lines": lines}
    (d / "story.json").write_text(json.dumps(story, indent=1))
    (v / "voice.json").write_text(json.dumps({"lines": vj}, indent=1))


def main(out, letter, voice, model, bracket, line, sex, lo, hi):
    d = pathlib.Path(out) / letter
    prompt = f"{bracket}\n\n{line}"
    raw = d / f"raw_{voice}.wav"
    d.mkdir(parents=True, exist_ok=True)
    if raw.exists():
        print(f"{raw}: cached, no request")
        x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", str(raw), "-f", "f32le", "-ac", "1", "-ar", str(tts.SR), "-"],
                                         capture_output=True, check=True).stdout, np.float32)
        used = model
    else:
        x, used = tts.request(prompt, {"Cand": voice}, [model])
        write(raw, x)
    scaffold(d, {"sex": sex, "age": [int(lo), int(hi)]}, line, voice, bracket)
    seg = tts.cut(x, [line])[0]
    write(d / "voice" / "C01.wav", seg)
    json.dump({"letter": letter, "voice": voice, "model": used, "prompt": prompt, "line": line},
              open(d / "take.json", "w"), indent=1)
    print(d / "voice" / "C01.wav", used)


if __name__ == "__main__":
    main(*sys.argv[1:])
