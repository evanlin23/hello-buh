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
NCS = {t["file"]: t for t in json.loads((ROOT / "music" / "ncs.json").read_text())} if (ROOT / "music" / "ncs.json").exists() else {}
BED_LUFS = -16.0   # the stunt NCS bed, under the game at -15 (owner 2026-11-11, "fix all i think": was -13, too loud; STANDARDS 7 r:r662041)
SONGS = {"misery.mp3": ("misery.", "pupsies"), "payphone.mp3": ("Payphone", "Radio Top Singers"), "funk_abnormal.mp3": ("FUNK ABNORMAL (ULTRA SLOWED)", "")}


def song_drop(path):
    return float(subprocess.run(["python3", str(ROOT / "scripts" / "song_drop.py"), str(path)], capture_output=True, text=True, check=True).stdout.split()[0])


def pick_ncs(name, at=0.0):
    """The NCS track used least across the packages so far (ties: a fixed per-Short choice), among
    the tracks whose drop comes at or after the Short's drop event: an earlier drop can't line up
    (song_start clamps to 0) and played the drop seconds before the payoff (clutch_harder review)."""
    used = {}
    for m in (VID / "shorts").glob("*/metadata.json"):
        f = (json.loads(m.read_text()).get("song") or {}).get("file")
        if m.parent.name != name and f in NCS:
            used[f] = used.get(f, 0) + 1
    have = [f for f in NCS if (ROOT / "songs" / "ncs" / f).exists()]
    if not have:
        sys.exit("no NCS tracks downloaded: python3 scripts/ncs.py --download")
    late = [f for f in have if song_drop(ROOT / "songs" / "ncs" / f) >= at - 0.05]
    if late:
        have = late
    else:
        print(f"{name}: no NCS track drops at or after {at:.2f}s; the drop will land early")
    h = sum(map(ord, name))
    return "songs/ncs/" + min(have, key=lambda f: (used.get(f, 0), (sorted(have).index(f) - h) % len(have)))


def story_score(name, d, meta, stunt, rec, tl, start, src, out_override=None):
    """A narrated story gets a mood-picked cinematic score (music/score.json), not an NCS phonk bed, every credit in
    the description. Since 2026-11-10 the edit mixes it in (edit.py --story: the preview the owner reviews is what
    gets posted) and stamps it in the mp4's comment tag: then publish only writes the credit, and never adds a second
    bed. An mp4 without the tag (edited before) gets it here, as before (story_audio.add_score)."""
    sys.path.insert(0, str(ROOT / "scripts"))
    import story_track
    import story_audio
    out = pathlib.Path(out_override) if out_override else d / "short.mp4"
    baked = story_audio.score_tag(src) or story_audio.score_tag(d / "short.mp4")
    if baked:
        if baked.get("song"):   # the stunt's own bed (edit.song): no score, no credit to add
            print(name, "the edit has its own bed:", baked["song"])
            return
        tracks = [next(t for t in story_audio.tracks() if t["id"] == i) for i in baked["tracks"]]
        moods, payoff = baked.get("mood") or ["", ""], baked.get("payoff_in_short_s")
        if out_override and pathlib.Path(out_override) != d / "short.mp4":
            import shutil
            shutil.copyfile(d / "short.mp4", out)
        print(name, f"score already in the edit: {baked['title']} (no second bed)")
    else:
        story_track.POSES = rec.get("poses")
        story_dir = str(ROOT / stunt["story"])
        start = int(start * 60 + 1e-6) / 60   # edit.py starts on the 60 fps frame grid
        used = {}
        for m in (VID / "shorts").glob("*/metadata.json"):
            if m.parent.name != name:
                for t in (json.loads(m.read_text()).get("song") or {}).get("tracks", []):
                    used[t] = used.get(t, 0) + 1
        tracks, moods, payoff = story_audio.add_score(src, out, name, story_dir, tl, start, used, stunt.get("endAfter"))
    credit = "\n\n".join(t["credit"] for t in tracks)
    meta["song"] = {"file": story_audio.fetch_name(tracks[0]), "title": " / ".join(t["title"] for t in tracks), "artist": tracks[0]["artist"],
                    "tracks": [t["id"] for t in tracks], "licence": tracks[0]["licence"], "mood": list(moods),
                    "payoff_in_short_s": round(payoff, 2) if payoff is not None else None, "mix": "scripts/story_audio.py (docs/audio.md)",
                    "mixed_in": "edit" if baked else "publish"}
    yt = meta["youtube"]
    yt["description"] = meta.get("caption", name) + f"\n\n{credit}" + "\n\n" + " ".join(yt.get("hashtags", []))
    if not out_override:
        (d / "metadata.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(name, f"score in -> {out}")


def main(name, song_override=None, out_override=None, gen=None, seed=None, ncs=False):
    d = VID / "shorts" / name
    meta = json.loads((d / "metadata.json").read_text())
    stunt = json.loads(subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{name}').edit||{{}}))"], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    src = d / "short_nosong.mp4"
    rec = json.loads(gzip.decompress((d / "recording.json.gz").read_bytes()))
    tl = rec["timeline"]
    sys.path.insert(0, str(ROOT / "scripts"))
    from timewarp import edit_timeline
    from retention import hook_len
    tl = edit_timeline(stunt, tl)   # time-lapse spans and slow-mo: the drop lands on the event in output time, as edit.py does
    ev = {}
    for e in tl:
        ev.setdefault(e["event"], e["t"] / 1000)
    start = float(stunt.get("start", 0))
    if stunt.get("startAt"):
        k, off = stunt["startAt"].rsplit(":", 1)
        if k in ev:
            start = max(0.0, ev[k] + float(off))
    if not src.exists():   # older package: same picture, game audio from game_audio.flac
        if not (d / "game_audio.flac").exists():
            print(name, "no short_nosong.mp4 or game_audio.flac"); return
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(d / "short.mp4"), "-ss", f"{start:.3f}", "-i", str(d / "game_audio.flac"),
                        "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(src)], check=True)
        print(name, "made short_nosong.mp4 from game_audio.flac")
    drop_at = stunt.get("dropAt")
    at = (ev[drop_at] - start + hook_len(stunt)) if drop_at in ev else 0.0   # a hook preview pushes the Short back
    if stunt.get("story") and not song_override and not gen:   # a story: the mood score (scripts/story_audio.py, docs/audio.md)
        return story_score(name, d, meta, stunt, rec, tl, start, src, out_override)
    if ncs and not song_override:
        song_override = pick_ncs(name, at)
    song = song_override or stunt.get("song")
    if not gen and (not song or not (ROOT / song).exists()):
        print(name, "no song file"); return
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)], capture_output=True, text=True, check=True).stdout)
    if gen:   # our own synthesized phonk (scripts/phonk.py): the drop lands exactly on the event
        (ROOT / "work").mkdir(exist_ok=True)
        song = f"work/gen_{name}_{gen}.mp3"
        sd = seed if seed is not None else sum(map(ord, name)) % 1000
        drop = max(0.5, at)
        subprocess.run(["python3", str(ROOT / "scripts" / "phonk.py"), str(ROOT / song), "--style", gen, "--seed", str(sd),
                        "--drop", f"{drop:.3f}", "--length", f"{dur + 0.5:.3f}"], check=True, capture_output=True)
    else:
        drop = song_drop(ROOT / song)
        if drop < at - 0.05:
            print(f"{name}: WARNING the song's drop ({drop:.2f}s) is before the drop event ({at:.2f}s): it plays {at - drop:.2f}s early")
    song_start = max(0.0, drop - at)
    out = pathlib.Path(out_override) if out_override else d / "short.mp4"
    if stunt.get("story"):   # narrated story (docs/stories.md): the song is a quiet bed under the voice, master -14 LUFS
        song_start = max(0.0, drop - 1.0) if not gen else 0.0   # start a little before the drop: the bed builds into it
        graph = (f"[1:a]atrim=0:{dur:.3f},asetpts=PTS-STARTPTS,loudnorm=I=-31:TP=-8,afade=t=in:d=0.3,afade=t=out:st={max(0, dur - 0.8):.3f}:d=0.8,aresample=48000[song];"
                 f"[0:a]aresample=48000[voice];[voice][song]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]")
    else:
        import sfx   # edit.sfx 'dip' entries: the song ducks before the payoff (same windows as edit.py, + the hook)
        import key_sounds   # edit.keySounds (guess the mob: the call IS the game): the song ducks to -24 dB under each clip
        keys = key_sounds.key_times(stunt, tl, start, hook_len(stunt))
        kstop = at if drop_at in ev else None   # the drop lands un-ducked
        kwin = key_sounds.windows(key_sounds.pcm(src), keys, kstop) if keys else []
        duck = sfx.duck_filter(sfx.dips(stunt.get("sfx"), tl, start, hook_len(stunt)) + kwin, key_sounds.DUCK)
        import loud   # static stem gains + a measured master (dynamic loudnorm flattened build-ups: worker 17)
        graph = (f"[1:a]atrim=0:{dur:.3f},asetpts=PTS-STARTPTS{duck},{loud.static(ROOT / song, BED_LUFS, song_start, dur)},afade=t=in:d=0.08,afade=t=out:st={max(0, dur - 0.6):.3f}:d=0.6,aresample=48000[song];"
                 f"[0:a]{loud.static(src, -15)},aresample=48000[game];[song][game]amix=inputs=2:normalize=0[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ss", f"{song_start:.3f}", "-i", str(ROOT / song), "-filter_complex", graph,
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
    if stunt.get("story"):   # single-pass loudnorm lands short: correct the story master to -14 LUFS exactly
        sys.path.insert(0, str(ROOT / "scripts"))
        import story_track
        story_track.master_gain(out, -14.0)
    else:
        loud.master(out, -10.0, -2.0 if keys else -1.0)   # (ducked under the key sounds, the master lifts the game: limit lower)
        if keys:   # the gate (BLOCK): each key sound >= KEY_MIN_DB over the music (owner 2026-11-11, guess_sound: "super loud music")
            rows, bad = key_sounds.check(out, src, keys, kstop)
            print(name, f"key sounds over the music: worst {min(r['margin_db'] for r in rows):+.1f} dB over {len(rows)} clips (need >= {key_sounds.KEY_MIN_DB:.0f})")
            if bad:
                sys.exit(f"{name}: BLOCK [keysound] the music covers {len(bad)} key sound(s): " + ", ".join(f"{r['t']:.2f} s ({r['margin_db']:+.1f} dB)" for r in bad))
    f = pathlib.Path(song).name
    t, a = SONGS.get(f, (f, ""))
    if gen:
        t, a = f"HelloBuh phonk ({gen}, original)", ""
    if f in NCS:   # the credit exactly as NCS gives it (their usage policy requires it)
        t, a = NCS[f]["title"], NCS[f]["artist"]
        credit = NCS[f]["credit"]
        licence = "NCS (NoCopyrightSounds) usage policy: free for creators incl. monetized, credit in description - https://ncs.io/usage-policy"
    elif gen:
        credit, licence = "", "original (scripts/phonk.py), ours"
    else:
        credit, licence = f"Song: {t}{' · ' + a if a else ''}", "unlicensed: owner-supplied, expect a Content ID claim"
    meta["song"] = {"file": f, "title": t, "artist": a, "licence": licence, "drop_on_event": drop_at, "drop_in_song_s": round(drop, 2), "drop_in_short_s": round(at, 2), "song_start_s": round(song_start, 2)}
    # rebuild the description: caption, credit, hashtags (any older song credit goes)
    yt = meta["youtube"]
    yt["description"] = meta.get("caption", name) + (f"\n\n{credit}" if credit else "") + "\n\n" + " ".join(yt.get("hashtags", []))
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
    ap.add_argument("--ncs", action="store_true", help="pick an NCS phonk track (music/ncs.json) and put its official credit in the description")
    a = ap.parse_args()
    for n in a.names:
        main(n, a.song, a.out, a.gen, a.seed, a.ncs)
