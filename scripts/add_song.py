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
GAME_LUFS = -12.5  # the game + sfx stem's target in the stunt mix (with the bed about 1 dB under it the sum lands near the
                   # old -10 LUFS master); capped by loud.tame_gain so the limiter takes at most 3 dB off its peaks
LEGACY_MASTER = bool(__import__("os").environ.get("HB_LEGACY_MASTER"))   # the pre-2026-11-12 mix (audits of old packages)
BED_LUFS = -16.0   # the stunt NCS bed, under the game at -15 (owner 2026-11-11, "fix all i think": was -13, too loud; STANDARDS 7 r:r662041)
SONGS = {"misery.mp3": ("misery.", "pupsies"), "payphone.mp3": ("Payphone", "Radio Top Singers"), "funk_abnormal.mp3": ("FUNK ABNORMAL (ULTRA SLOWED)", "")}


LOOPED = {}   # work/loop_*.wav -> the NCS file it was made from


def loop_song(song, drop, bar, at):
    """The track with one bar of its build repeated n times (n = the fewest whole bars that bring the drop to >= at s
    of song): track[0:b1] + track[b0:b1] * n + track[b1:], where b1 is the earliest bar line counted back from the drop
    in whole bars (drop - k*bar) that has a whole bar of song before it (b0 = b1 - bar >= 0). Every seam sits on a bar line of the same material, so it
    plays as a longer build. Returns (path relative to ROOT, the new drop)."""
    import math
    n = math.ceil((at - drop - 1e-6) / bar)
    b1 = drop - math.floor((drop - bar) / bar + 1e-9) * bar   # the first bar line after one whole bar of song
    b0 = b1 - bar
    (ROOT / "work").mkdir(exist_ok=True)
    out = f"work/loop_{pathlib.Path(song).stem}_{bar:.3f}x{n}.wav"
    parts = [f"[0:a]atrim=0:{b1:.4f},asetpts=PTS-STARTPTS[p0]"] + \
        [f"[{i + 1}:a]atrim={b0:.4f}:{b1:.4f},asetpts=PTS-STARTPTS[p{i + 1}]" for i in range(n)] + \
        [f"[{n + 1}:a]atrim=start={b1:.4f},asetpts=PTS-STARTPTS[p{n + 1}]"]
    graph = ";".join(parts) + ";" + "".join(f"[p{i}]" for i in range(n + 2)) + f"concat=n={n + 2}:v=0:a=1[a]"
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for _ in range(n + 2):
        cmd += ["-i", str(ROOT / song)]
    subprocess.run(cmd + ["-filter_complex", graph, "-map", "[a]", "-ar", "48000", str(ROOT / out)], check=True)
    LOOPED[pathlib.Path(out).name] = pathlib.Path(song).name
    print(f"song loop: {pathlib.Path(song).name} with the bar {b0:.2f}-{b1:.2f} s repeated x{n}: drop {drop:.2f} -> {drop + n * bar:.2f} s (the event at {at:.2f} s)")
    return out, drop + n * bar


def song_drop(path):
    return float(subprocess.run(["python3", str(ROOT / "scripts" / "song_drop.py"), str(path)], capture_output=True, text=True, check=True).stdout.split()[0])


def pick_ncs(name, at=0.0, mood=None):
    """The NCS track used least across the packages so far (ties: a fixed per-Short choice), among
    the tracks whose drop comes at or after the Short's drop event: an earlier drop can't line up
    (song_start clamps to 0) and played the drop seconds before the payoff (clutch_harder review).
    mood (the stunt's edit.ncsMood, e.g. 'sad' for the underdog format's soft sung track): only the tracks
    music/ncs.json tags with it; without one, only the untagged phonk beds (a sad track never lands on a stunt)."""
    used = {}
    for m in (VID / "shorts").glob("*/metadata.json"):
        f = (json.loads(m.read_text()).get("song") or {}).get("file")
        if m.parent.name != name and f in NCS:
            used[f] = used.get(f, 0) + 1
    if mood and not any((ROOT / "songs" / "ncs" / f).exists() for f in NCS if NCS[f].get("mood") == mood):
        import ncs   # a mood's tracks were added after this machine downloaded the phonk beds: fetch them now
        ncs.download([t for t in NCS.values() if t.get("mood") == mood])
    have = [f for f in NCS if (ROOT / "songs" / "ncs" / f).exists() and not NCS[f].get("pin_only") and NCS[f].get("mood") == mood]   # (pin_only: a format's own track, edit.ncs; mood: edit.ncsMood)
    if not have:
        sys.exit(f"no NCS tracks downloaded{' with mood ' + mood if mood else ''}: python3 scripts/ncs.py --download")
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


def main(name, song_override=None, out_override=None, gen=None, seed=None, ncs=False, pre_out=None):
    d = VID / "shorts" / name
    meta = json.loads((d / "metadata.json").read_text())
    stunt = json.loads(subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{name}').edit||{{}}))"], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    src = d / "short_nosong.mp4"
    if stunt.get("ownScore"):   # a cinematic story with its own made score (scripts/story_short.py): no song on top
        print(name, "own score: no song added"); return
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
    drop_off = 0.0
    if drop_at and drop_at not in ev and ":" in str(drop_at):   # 'EVENT:OFFSET_S' (the drop just after a sound it must not cover)
        k_, _, o_ = str(drop_at).rpartition(":")
        try:
            drop_off, drop_at = float(o_), k_
        except ValueError:
            pass
    at = (ev[drop_at] + drop_off - start + hook_len(stunt)) if drop_at in ev else 0.0   # a hook preview pushes the Short back
    if stunt.get("story") and not song_override and not gen:   # a story: the mood score (scripts/story_audio.py, docs/audio.md)
        return story_score(name, d, meta, stunt, rec, tl, start, src, out_override)
    if ncs and not song_override:
        # edit.ncs pins one NCS track (format cooked, r:r12cb71: the music timing IS the joke, so the drop must be this
        # track's drop on the flood); else the least-used track whose drop can line up
        pin = stunt.get("ncs")
        if pin and (ROOT / "songs" / "ncs" / pin).exists():
            song_override = "songs/ncs/" + pin
        else:
            if pin:   # (another track would land the wrong drop: the joke is this one)
                sys.exit(f"{name}: edit.ncs '{pin}' is not in songs/ncs: python3 scripts/ncs.py --download")
            song_override = pick_ncs(name, at, stunt.get("ncsMood"))
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
        loop = float(stunt.get("songLoop") or 0)
        if loop and drop < at - 0.05 and not stunt.get("story"):
            # edit.songLoop (a bar, s): a track whose drop comes before the drop event repeats one whole bar of its build
            # (the bar just before the drop's phrase) until the drop lands on the event, so the song plays from frame 0
            # (owner 2026-11-12 on cooked_bedrock: "why does the music start late?"; edit.songLate's silence is retired)
            song, drop = loop_song(song, drop, loop, at)
        if drop < at - 0.05:
            print(f"{name}: the song starts {at - drop:.2f}s into the Short so its drop lands on the event (edit.songLate)" if stunt.get("songLate") and not stunt.get("story")
                  else f"{name}: WARNING the song's drop ({drop:.2f}s) is before the drop event ({at:.2f}s): it plays {at - drop:.2f}s early")
    song_start = max(0.0, drop - at)
    # edit.songLate: a track whose drop comes before the drop event starts late instead (silence, then the song) so the
    # drop still lands on the event (format cooked: EXECUTIONER drops 7.0 s in, the flood is ~8.4 s into the Short)
    late = max(0.0, at - drop) if stunt.get("songLate") and not stunt.get("story") and not gen else 0.0
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
        # edit.songGain (dB, opt-in): the bed this much under BED_LUFS (owner 2026-11-12 on desire_town: "can we jsut
        # have it sit underneath the sound effects but still there")
        bed = BED_LUFS + float(stunt.get("songGain") or 0)
        lat = f",adelay={int(round(late * 1000))}:all=1" if late else ""
        limit = -2.0 if keys else -1.0   # (ducked under the key sounds: the limit lower)
        if LEGACY_MASTER:
            game_gain, song_lufs = loud.static(src, -15), bed
        else:
            # the game + sfx stem mastered first (a static gain, capped so its peaks need <= 3 dB of limiting), the song
            # at its fixed offset under it (bed - (-15) dB, as before), and later only a peak limiter: no makeup gain
            # that the limiter takes back on every hit (the bed pumped ~11 dB on desire_town)
            stem = pathlib.Path(str(out) + ".game.wav")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-af", f"{loud.static(src, -15)},aresample=48000",
                            "-c:a", "pcm_f32le", str(stem)], check=True)
            g = loud.tame_gain(stem, GAME_LUFS, limit)
            stem.unlink()
            game_gain, song_lufs = f"{loud.static(src, -15)},volume={g:.2f}dB", bed + g
            print(name, f"mix: game + sfx {g:+.1f} dB over -15 LUFS (to {GAME_LUFS} LUFS, <= {loud.MAX_REDUCTION:.0f} dB of limiting), the song at {song_lufs:.1f} LUFS")
        graph = (f"[1:a]atrim=0:{dur - late:.3f},asetpts=PTS-STARTPTS,{loud.static(ROOT / song, song_lufs, song_start, dur - late)},afade=t=in:d=0.08{lat}{duck},afade=t=out:st={max(0, dur - 0.6):.3f}:d=0.6,aresample=48000[song];"
                 f"[0:a]{game_gain},aresample=48000[game];[song][game]amix=inputs=2:normalize=0[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ss", f"{song_start:.3f}", "-i", str(ROOT / song), "-filter_complex", graph,
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
    if not stunt.get("story") and not LEGACY_MASTER:
        # the song under the game's block sounds (scripts/mix_pump.py `under`, mixcheck's gate: >= 3 dB): a bed that comes
        # out on top of a quiet or sparse game track is lowered by what it misses (+1 dB of margin) and mixed once more
        import mix_pump
        u, _, _ = mix_pump.under(mix_pump.rms_db(out), mix_pump.rms_db(src))
        if u is not None and u < mix_pump.UNDER_MIN + 1:
            cut = min(12.0, mix_pump.UNDER_MIN + 1 - u)
            graph = graph.replace(loud.static(ROOT / song, song_lufs, song_start, dur - late), loud.static(ROOT / song, song_lufs - cut, song_start, dur - late), 1)
            print(name, f"mix: the song {cut:.1f} dB lower (the game sounds were {u:+.1f} dB over it; want >= {mix_pump.UNDER_MIN + 1:.0f})")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ss", f"{song_start:.3f}", "-i", str(ROOT / song), "-filter_complex", graph,
                            "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)], check=True)
    if stunt.get("story"):   # single-pass loudnorm lands short: correct the story master to -14 LUFS exactly
        sys.path.insert(0, str(ROOT / "scripts"))
        import story_track
        story_track.master_gain(out, -14.0)
    else:
        if pre_out:   # (mixcheck's pump check: the mix before its master)
            import shutil
            shutil.copy(out, pre_out)
        if LEGACY_MASTER:
            loud.master(out, -10.0, limit)
        else:
            loud.limit_peaks(out, limit)
        if keys:   # the gate (BLOCK): each key sound >= KEY_MIN_DB over the music (owner 2026-11-11, guess_sound: "super loud music")
            rows, bad = key_sounds.check(out, src, keys, kstop)
            if rows:   # (no clip before the drop, e.g. dropAt on the last mark: nothing to measure; race 2026-11-11 crashed here)
                print(name, f"key sounds over the music: worst {min(r['margin_db'] for r in rows):+.1f} dB over {len(rows)} clips (need >= {key_sounds.KEY_MIN_DB:.0f})")
            else:
                print(name, "key sounds over the music: none before the drop to measure")
            if bad:
                sys.exit(f"{name}: BLOCK [keysound] the music covers {len(bad)} key sound(s): " + ", ".join(f"{r['t']:.2f} s ({r['margin_db']:+.1f} dB)" for r in bad))
    f = pathlib.Path(song).name
    f = LOOPED.get(f, f)   # a looped build (edit.songLoop) credits the track itself
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
    meta["song"] = {"file": f, "title": t, "artist": a, "licence": licence, "drop_on_event": drop_at, "drop_in_song_s": round(drop, 2), "drop_in_short_s": round(at, 2), "song_start_s": round(song_start, 2),
                    **({"song_enters_short_s": round(late, 2)} if late else {})}
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
