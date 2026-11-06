"""Bake the stunt's song into a published package (for Shorts made in worker sessions, which don't
have songs/): takes shorts/<name>/short_nosong.mp4, lines the song's drop up with the stunt's
drop event (as edit.py does) and writes shorts/<name>/short.mp4, updating metadata.json.

  python3 scripts/add_song.py <name> [<name>...]     (videos worktree at ../hb-videos)
"""
import gzip
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
VID = ROOT.parent / "hb-videos"
SONGS = {"misery.mp3": ("misery.", "pupsies"), "payphone.mp3": ("Payphone", "Radio Top Singers"), "funk_abnormal.mp3": ("FUNK ABNORMAL (ULTRA SLOWED)", "")}


def main(name, song_override=None, out_override=None, gen=None, seed=None):
    d = VID / "shorts" / name
    meta = json.loads((d / "metadata.json").read_text())
    stunt = json.loads(subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{name}').edit||{{}}))"], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    song = song_override or stunt.get("song")
    if not gen and (not song or not (ROOT / song).exists()):
        print(name, "no song file"); return
    src = d / "short_nosong.mp4"
    if not src.exists():
        print(name, "no short_nosong.mp4"); return
    tl = json.loads(gzip.decompress((d / "recording.json.gz").read_bytes()))["timeline"]
    ev = {}
    for e in tl:
        ev.setdefault(e["event"], e["t"] / 1000)
    start = float(stunt.get("start", 0))
    if stunt.get("startAt"):
        k, off = stunt["startAt"].rsplit(":", 1)
        if k in ev:
            start = max(0.0, ev[k] + float(off))
    drop_at = stunt.get("dropAt")
    at = (ev[drop_at] - start) if drop_at in ev else 0.0
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)], capture_output=True, text=True, check=True).stdout)
    if gen:   # our own synthesized phonk (scripts/phonk.py): the drop lands exactly on the event
        (ROOT / "work").mkdir(exist_ok=True)
        song = f"work/gen_{name}_{gen}.mp3"
        sd = seed if seed is not None else sum(map(ord, name)) % 1000
        drop = max(0.5, at)
        subprocess.run(["python3", str(ROOT / "scripts" / "phonk.py"), str(ROOT / song), "--style", gen, "--seed", str(sd),
                        "--drop", f"{drop:.3f}", "--length", f"{dur + 0.5:.3f}"], check=True, capture_output=True)
    else:
        drop = float(subprocess.run(["python3", str(ROOT / "scripts" / "song_drop.py"), str(ROOT / song)], capture_output=True, text=True, check=True).stdout.split()[0])
    song_start = max(0.0, drop - at)
    out = pathlib.Path(out_override) if out_override else d / "short.mp4"
    graph = (f"[1:a]atrim=0:{dur:.3f},asetpts=PTS-STARTPTS,loudnorm=I=-13:TP=-2,afade=t=in:d=0.08,afade=t=out:st={max(0, dur - 0.6):.3f}:d=0.6,aresample=48000[song];"
             f"[0:a]loudnorm=I=-15:TP=-2,aresample=48000[game];[song][game]amix=inputs=2:normalize=0,loudnorm=I=-10:TP=-1:LRA=11[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ss", f"{song_start:.3f}", "-i", str(ROOT / song), "-filter_complex", graph,
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
    f = pathlib.Path(song).name
    t, a = SONGS.get(f, (f, ""))
    if gen:
        t, a = f"HelloBuh phonk ({gen}, original)", ""
    meta["song"] = {"file": f, "title": t, "artist": a, "drop_on_event": drop_at, "drop_in_song_s": round(drop, 2), "drop_in_short_s": round(at, 2), "song_start_s": round(song_start, 2)}
    credit = f"\n\nSong: {t}{' · ' + a if a else ''}"
    if "Song:" not in meta["youtube"]["description"]:
        cap, rest = meta["youtube"]["description"].split("\n\n", 1)
        meta["youtube"]["description"] = cap + credit + "\n\n" + rest
    if not out_override:   # a demo mix doesn't touch the package
        (d / "metadata.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(name, f"song in: drop at {at:.2f}s of the Short -> {out}")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="+")
    ap.add_argument("--song", help="any audio file (path relative to the repo or absolute) instead of the stunt's song")
    ap.add_argument("--out", help="write here instead of the package's short.mp4 (for comparing songs)")
    ap.add_argument("--gen", choices=["montagem", "drift", "slowed", "funk"], help="generate our own phonk (scripts/phonk.py) in this style")
    ap.add_argument("--seed", type=int)
    a = ap.parse_args()
    for n in a.names:
        main(n, a.song, a.out, a.gen, a.seed)
