"""A/B demo of a published story's sound: the package's short.mp4 (old mix) vs the same picture with the story
audio standard (docs/audio.md), rebuilt from the package's recording and the story's voice files. Writes
out/audio_ab/<name>_A_old.mp4, <name>_B_new.mp4, <name>_AB.mp4 (A then B, labelled) and a measurement line.

  python3 scripts/audio_ab.py story_runaway [story_nitwit ...]
"""
import gzip
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
VID = ROOT.parent / "hb-videos" / "shorts"
OUT = ROOT / "out" / "audio_ab"
FONT = ROOT / "assets" / "fonts" / "SchibstedGrotesk-Black.ttf"


def label(src, dst, text):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                    f"scale=540:960,drawtext=fontfile={FONT}:text='{text}':fontcolor=white:fontsize=34:box=1:boxcolor=black@0.6:boxborderw=12:x=(w-tw)/2:y=h-120",
                    "-c:v", "libx264", "-crf", "26", "-preset", "veryfast", "-r", "30", "-c:a", "aac", "-b:a", "192k", str(dst)], check=True)


def main(name):
    import story_track
    import story_audio
    d = VID / name
    meta = json.loads((d / "metadata.json").read_text())
    args = meta["edit"]["args"]
    story_dir = str(ROOT / args[args.index("--story") + 1])
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=ROOT / "work") as td:
        td = pathlib.Path(td)
        rec_path = td / "rec.json"
        rec_path.write_bytes(gzip.decompress((d / "recording.json.gz").read_bytes()))
        rec = json.loads(rec_path.read_text())
        tl = rec["timeline"]
        story_track.POSES = rec.get("poses")
        ev = {}
        for e in tl:
            ev.setdefault(e["event"], e["t"] / 1000)
        start = 0.0
        if "--start_at" in args:
            k, off = args[args.index("--start_at") + 1].rsplit(":", 1)
            start = max(0.0, ev.get(k, 0.0) + float(off))
        start = int(start * 60 + 1e-6) / 60
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(d / "short.mp4")], capture_output=True, text=True).stdout)
        # the game track again, now with the on-screen sounds (audio.py), then the story mix and the score
        subprocess.run(["python3", str(ROOT / "audio.py"), str(rec_path), str(td / "game.wav")], check=True, cwd=ROOT)
        nar = story_track.narration_wav(story_dir, tl, start, dur, td / "narration.wav")
        end_after = args[args.index("--end_after") + 1] if "--end_after" in args else None
        mix = story_audio.mix_story(nar, td / "game.wav", start, story_dir, tl, start, dur, td / "mix.wav", end_after=end_after)
        nosong = td / "nosong.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(d / "short.mp4"), "-i", str(mix), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.3f}", str(nosong)], check=True)
        story_audio.master(nosong)
        new = OUT / f"{name}_B_new.mp4"
        tracks, moods, payoff = story_audio.add_score(nosong, td / "new.mp4", name, story_dir, tl, start, end_after=end_after)
        a, b = OUT / f"{name}_A_old.mp4", new
        label(d / "short.mp4", a, "A: old mix")
        label(td / "new.mp4", b, "B: new mix")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(a), "-i", str(b), "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]",
                        "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "26", "-preset", "veryfast", "-c:a", "aac", "-b:a", "192k", str(OUT / f"{name}_AB.mp4")], check=True)
        import audio_measure
        row = {"story": name, "score": [t["title"] for t in tracks], "mood": moods, "payoff_s": payoff,
               "old": audio_measure.summary(d / "short.mp4"), "new": audio_measure.summary(td / "new.mp4"),
               "old_nosong": audio_measure.summary(d / "short_nosong.mp4"), "new_nosong": audio_measure.summary(nosong)}
        (OUT / f"{name}_measure.json").write_text(json.dumps(row, indent=2) + "\n")
        print(json.dumps(row))


if __name__ == "__main__":
    for n in sys.argv[1:]:
        main(n)
