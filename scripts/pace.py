"""The pacing gate (`./hb pace <stunt>`): hook, dead spots, build-up, payoff and length, measured on the finished Short.

Owner, 2026-11-10: "we still need to ensure that the pacing is good, and theres still a good visual and audio hook and
build up and a good payoff." This reads out/<name>.mp4 (or the published package's short.mp4) and, when they exist,
the recording's marks (cuts, story lines, events, through scripts/hb_time.py's clock), the story's caption chunks
(scripts/story_track.py) and stories/<dir>/story.json. With no recording it still runs on the picture and sound alone.

    python3 scripts/pace.py <name> [--video MP4] [--stunt STUNT --rec REC] [--story DIR] [--payoff SPEC] [--json]

Checks (BLOCK = the short-review bar, WARN = needs a reason or a fix):
  hook      0-1.5 s: the first frame isn't black or a bare card, the picture moves or cuts (a still opener is a
            blocker); sound by 0.3 s; a line or a hit starts by 1.5 s.
  dead      the longest span with no new event (a cut, a caption change, a line start, a sound hit, a motion onset):
            BLOCK > 3 s, WARN > 2 s. Also the picture alone (cuts + motion onsets: the muted viewer): WARN > 5 s.
            And the same picture (the layout barely changes across small cuts and pushes): WARN > 5 s.
  buildup   cut rate, short-term loudness, the bed (the level's floor under the voice: music + ambience; out/ renders of
            stories have no song yet, add_song.py adds it at publish) and motion over thirds of 0..payoff:
            the last third should rise or hold, not sag.
  payoff    the story.json `payoff` line/mark, else the edit's endAfter event, else the line the `twist` quotes,
            else the biggest sound + picture hit in the last 40%: a sound hit and a picture change within 0.3 s,
            and the end <= 1.0 s after it (1.2-1.8 s for a text payoff: a death screen or a card).
            The 1.0 s counts from when the payoff's motion settles (r:r24d99a: falling blocks, explosion debris, a
            dying mob in view: scripts/owner_checks.py), and the end while it still moves is a BLOCK (settle).
  aim       every player action in the Short (place, break, block/entity use) with the crosshair on its target
            (r:rffba12, scripts/owner_checks.py + lib/aim.js): BLOCK over 15 deg or off-screen, or over 10% past 6 deg.
  length    BLOCK < 25 s, WARN > 45 s (story Shorts: the owner wants them tight).
  loud      WARN when the true peak is over -1 dBTP (clips after YouTube's transcode).
  keysound  a stunt with edit.keySounds (guess the mob: the call is the game), on a package's short.mp4 beside its
            short_nosong.mp4: each key sound >= 8 dB over the music, else BLOCK (scripts/key_sounds.py).
Exit 1 on a blocker, 2 when it can't run.
"""
import argparse
import json
import math
import os
import pathlib
import re
import subprocess
import sys

import numpy as np

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
VIDEOS = pathlib.Path(os.environ.get("HB_VIDEOS", HERE.parent / "hb-videos"))

W, H, BAND, GAME_H = 1080, 1920, 455, 1011
VFPS = 20                     # analysis frame rate of the picture
SR = 16000                    # analysis sample rate of the sound
HOP = 0.01                    # s, sound envelope step

# thresholds (calibrated on the published stories, docs in .claude/skills/short-review)
HOOK_S = 1.5
SOUND_BY = 0.3
DEAD_BLOCK, DEAD_WARN = 3.0, 2.0
PICTURE_WARN = 5.0
SAME_WARN = 5.0               # runaway (the benchmark) holds one picture 3.3 s at most
PAYOFF_WIN = 0.3
TP_MAX = -1.0                 # dBTP: the master's true-peak ceiling (scripts/loud.py master)
TAIL_MAX, TEXT_TAIL = 1.0, (1.2, 1.8)
LEN_MIN, LEN_WARN = 25.0, 45.0   # 25: no-pause narration at ~5.25 words/s runs 25-29 s (owner: no dramatic pauses)
LEN_MIN_STUNT = 8.0   # an unnarrated stunt (lead 2026-11-11: the 25 s floor is the narration floor; the owner's "inside" format is 8-12 s)


def length_floor(is_story):
    """The shortest a Short may be: the narration floor for a story, the stunt floor otherwise."""
    return LEN_MIN if is_story else LEN_MIN_STUNT


# ---------------------------------------------------------------- measuring
def probe_len(video):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)], capture_output=True, text=True)
    return float(r.stdout.strip())


def picture(video):
    """The game view at VFPS: per frame mean luma, luma spread, motion (mean abs change from the last frame, 0-255,
    on a 108x101 grey copy) and a cut score (change of a 12x11 block layout + the luma histogram)."""
    w, h = 108, 101
    cmd = ["ffmpeg", "-v", "error", "-threads", "2", "-i", str(video), "-vf",
           f"fps={VFPS},crop={W}:{GAME_H}:0:{BAND},scale={w}:{h}:flags=area,format=gray", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    f = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
    n = len(f)
    luma, spread = f.mean(axis=(1, 2)), f.std(axis=(1, 2))
    motion = np.zeros(n, np.float32)
    motion[1:] = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    blocks = f[:, :99, :96].reshape(n, 11, 9, 12, 8).mean(axis=(2, 4))
    hist = np.stack([np.histogram(x, bins=16, range=(0, 256))[0] for x in f]).astype(np.float32) / (w * h)
    cut = np.zeros(n, np.float32)
    cut[1:] = np.abs(np.diff(blocks, axis=0)).mean(axis=(1, 2)) + 100 * 0.5 * np.abs(np.diff(hist, axis=0)).sum(axis=1)
    # the same picture: how long the frame's layout (the caption rows masked) stays close to where a span began,
    # across small cuts and slow pushes; a shot-reverse of one framing held while three lines play reads as one shot
    g = np.delete(f, np.s_[int(h * 0.6):int(h * 0.82)], axis=1)[:, :78, :96].reshape(n, 13, 6, 12, 8).mean(axis=(2, 4))
    same, i = [], 0
    while i < n:
        j = i + 1
        while j < n and np.abs(g[j] - g[i]).mean() < 18:
            j += 1
        same.append((round(i / VFPS, 2), round(j / VFPS, 2)))
        i = j
    return {"luma": luma, "spread": spread, "motion": motion, "cut": cut, "n": n, "same": same}


def sound(video):
    """Mono 16 kHz samples -> level (dBFS, 50 ms RMS every 10 ms)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    hop, win = int(SR * HOP), int(SR * 0.05)
    n = max(1, (len(x) - win) // hop + 1)
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    fr = x[idx]
    level = 10 * np.log10(np.mean(fr ** 2, axis=1) + 1e-12)
    return {"level": level, "n": n}


def lufs_short(video):
    """Short-term loudness (3 s window, LUFS) every 0.1 s, from ffmpeg's ebur128."""
    r = subprocess.run(["ffmpeg", "-nostats", "-v", "verbose", "-i", str(video), "-vn", "-af", "ebur128=framelog=verbose", "-f", "null", "-"],
                       capture_output=True, text=True)
    ts, S = [], []
    for m in re.finditer(r"t:\s*([\d.]+)\s+TARGET.*?S:\s*(-?[\d.]+|-inf)", r.stderr):
        ts.append(float(m.group(1)))
        S.append(-70.0 if m.group(2) == "-inf" else max(-70.0, float(m.group(2))))
    return np.array(ts), np.array(S)


def sound_hits(level, jump=10.0, floor=-38.0, gap=0.2):
    """Onsets: the level jumps >= `jump` dB above the quietest of the last 0.3 s and is above `floor`."""
    k = int(0.3 / HOP)
    hits, last = [], -9
    for i in range(k, len(level)):
        if level[i] < floor:
            continue
        rise = level[i] - level[i - k:i - 1].min()
        if rise >= jump and i * HOP - last >= gap and level[i] >= level[i - 1]:
            hits.append((round(i * HOP, 2), round(float(rise), 1)))
            last = i * HOP
    return hits


def picture_events(P):
    """Cuts (a cut score well over its neighbours) and motion onsets (motion jumps to >= 2.2x the last second's
    median and >= 3 grey levels: something starts moving, a hit, an explosion, a whip pan) in seconds."""
    cut, mo = P["cut"], P["motion"]
    cuts, onsets = [], []
    for i in range(1, P["n"]):
        nb = np.concatenate([cut[max(1, i - 6):i], cut[i + 1:i + 7]])
        base = float(np.median(nb)) if len(nb) else 0.0
        if cut[i] >= 14 and cut[i] >= 3.0 * base + 6:
            if not cuts or i / VFPS - cuts[-1] > 0.2:
                cuts.append(round(i / VFPS, 2))
    for i in range(VFPS, P["n"]):
        base = float(np.median(mo[i - VFPS:i]))
        if mo[i] >= 3.0 and mo[i] >= 2.2 * base + 1.0 and all(abs(i / VFPS - c) > 0.15 for c in cuts):
            if not onsets or i / VFPS - onsets[-1] > 0.4:
                onsets.append(round(i / VFPS, 2))
    return cuts, onsets


# ---------------------------------------------------------------- the recording's side (optional)
def edit_of(stunt):
    r = subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{stunt}').edit||{{}}))"], cwd=HERE, capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else {}


def from_recording(stunt, recp):
    """hb_time's clock: marks in output time, the hook's length, and the story caption chunks (output time)."""
    import hb_time
    real_out = os.dup(1)
    os.dup2(2, 1)   # the plan can print (the hook's calibration): keep stdout clean
    try:
        rec = hb_time.load_rec(recp)
        c = hb_time.Clock(stunt, rec)
    finally:
        sys.stdout.flush()
        os.dup2(real_out, 1)
        os.close(real_out)
    marks = [m for m in c.marks() if m["out"] is not None]
    return c, rec, marks


def story_captions(story_dir, rec, start_src, hook, dur):
    try:
        import story_track
        story_track.POSES = rec.get("poses")
        return [(round(t0 + hook, 3), text, lid) for t0, t1, text, lid in story_track.caption_events(story_dir, rec["timeline"], start_src, dur, who=True)]
    except Exception as e:   # noqa: BLE001 (a story without voice.json chunks: fall back to the line marks)
        print(f"note: no caption chunks ({type(e).__name__}: {e})", file=sys.stderr)
        return []


def norm(s):
    return re.sub(r"[^a-z0-9 ]+", "", re.sub(r"\s*/\s*", " ", s.lower())).split()


BUILD_SOUND = re.compile(r"^block\.[\w.]+\.(place|break)$")
BUILD_RUN = 0.5   # a placement counts when another lands within this many seconds (a steady build, not one stray block)


def build_events(timeline, to_out, run=BUILD_RUN):
    """Block placements and breaks in the recording (their block.*.place/break sounds, plus place/dig_end marks), in
    output time, keeping only those in a steady run: the picture changes with every block, so a build is never "dead"
    (lead 2026-11-11: pixel-art builds put 7-20 blocks a second on screen through spans pace called dead). A recording
    with few placements (stories) is unaffected."""
    src = sorted(e["t"] / 1000 for e in timeline
                 if (e.get("event") == "sound" and BUILD_SOUND.match(str(e.get("sound", "")))) or e.get("event") in ("place", "dig_end"))
    out = []
    for i, t in enumerate(src):
        if (i > 0 and t - src[i - 1] <= run) or (i + 1 < len(src) and src[i + 1] - t <= run):
            o = to_out(t)
            if o is not None:
                out.append(round(o, 2))
    return sorted(set(out))


def gaps(evs):
    """The spans between consecutive (time, label) events, longest first: (a, b, length, label a, label b)."""
    evs = sorted(evs)
    g = []
    for (a, ea), (b, eb) in zip(evs, evs[1:]):
        if b - a > 0.05:
            g.append((round(a, 2), round(b, 2), round(b - a, 2), ea, eb))
    return sorted(g, key=lambda x: -x[2])


def edit_caption_times(video, edit, rec, clock):
    """The edit's own captions (edit.subs [EVENT, TEXT, SECONDS?, NTH?] and edit.cards [EVENT, TEXT, SECONDS?, COLOR?,
    NTH?]) in output time: each appearance is a new event on screen (half_heart's "lava bridge" and "almost there..."
    were read as 4.45 s dead). A package's metadata.json `edit` (as published) wins over the stunt's."""
    meta = pathlib.Path(video).resolve().parent / "metadata.json"
    if meta.exists():
        try:
            e = json.loads(meta.read_text()).get("edit")
            if isinstance(e, dict) and (e.get("subs") or e.get("cards")):
                edit = e
        except ValueError:
            pass
    if not rec or not clock or not edit:
        return []
    tl = rec.get("timeline", [])
    out = []
    for kind, nth_i in (("subs", 3), ("cards", 4)):
        items = edit.get(kind) or []
        if isinstance(items, str):
            try:
                items = json.loads(items)
            except ValueError:
                items = []
        for it in items:
            if not isinstance(it, list) or not it:
                continue
            ev = str(it[0])
            off = 0.0
            if ":" in ev:
                ev, _, o = ev.rpartition(":")
                try:
                    off = float(o)
                except ValueError:
                    ev, off = str(it[0]), 0.0
            nth = it[nth_i] if len(it) > nth_i and isinstance(it[nth_i], int) else 0
            ts = [e["t"] / 1000 for e in tl if e.get("event") == ev]
            if len(ts) > nth:
                o = clock.out_of_src(ts[nth] + off)
                if o is not None:
                    out.append(round(o, 2))
    return out


# ---------------------------------------------------------------- owner notes as checks (scripts/owner_checks.py)
def owner_checks_on(add, notes, rec, recp, clock, stunt, dur):
    """The aim check (findings added now) and the settle check's helper for the payoff: payoff out-s -> None (nothing
    moving after it) or {out (settled, output s; None past the end), end_out, blocks, msg, note}."""
    import owner_checks as OC
    tl = rec.get("timeline", [])
    spans = clock.p.warp.spans if getattr(clock.p, "warp", None) else []
    cut_src = [(a, b) for a, b, f in spans if f == math.inf]
    f1 = OC.f1_spans(tl)
    try:
        from rec_check import camera_shot_spans
        cams = camera_shot_spans(stunt, None, tl)
    except Exception:   # noqa: BLE001
        cams = []
    def first_person(k):
        o = clock.out_of_src(k / 20)
        return (o is not None and o < dur and not any(a <= k / 20 <= b for a, b in cut_src)
                and not any(a <= k < b for a, b in f1) and not any(a <= k < b for a, b in cams))
    sres = OC.sight_json(recp)
    if "aim" in sres:
        ar = OC.aim_report(sres, first_person)
        notes.append(f"aim (r:rffba12): {ar['summary']}")
        for lvl, tick, msg in ar["findings"]:
            add(lvl, "aim", clock.out_of_src(tick / 20), msg)
    else:
        notes.append(f"aim: not checked ({sres.get('error')})")
    tracks = OC.debris_tracks(rec)
    if not tracks:
        return lambda payoff: None
    cam = OC.pose_cam(rec)
    end_r = clock.at_out(max(0.0, dur - 1 / 60))
    end_src = end_r["tick"] if end_r.get("tick") is not None else None

    def settle(payoff):
        r = clock.at_out(payoff)
        if r.get("tick") is None or end_src is None:
            return None
        k0 = r["tick"]
        any_v = lambda k: any(a <= k < b for a, b in f1) or any(a <= k < b for a, b in cams)
        # the payoff's motion: something moving in view within 1 s of the payoff, followed until it all rests
        start = next((k for k in range(int(k0), int(k0) + 21) if OC.moving(tracks, k, cam, any_v(k))), None)
        if start is None:
            return None
        k_set = OC.settle_after(tracks, start, cam, 600, any_v(start))
        moving_end = OC.moving(tracks, end_src, cam, any_v(end_src))
        out = clock.out_of_src(k_set / 20) if k_set is not None and k_set <= end_src else None
        left = ((k_set - end_src) / 20) if k_set is not None else None
        blocks = bool(moving_end) and (left is None or left > OC.SETTLE_GRACE)
        what = OC.describe(moving_end or OC.moving(tracks, start, cam, any_v(start)))
        msg = (f"the Short ends while {what} still move{'s' if len(moving_end) == 1 else ''} in view ("
               + (f"it settles {left:.2f} s of recording later" if left is not None else "still moving 30 s later")
               + "): owner, let the last pillar of sand all fall before we end/cut (r:r24d99a)")
        note = (f"settle (r:r24d99a): the payoff's motion ({what}) settles at {out:.2f} s: the 1 s tail counts from there" if out is not None
                else f"settle (r:r24d99a): the payoff's motion ({what}) is still going at the end")
        return {"out": out, "end_out": round(dur, 2), "blocks": blocks, "msg": msg, "note": note}
    return settle


# ---------------------------------------------------------------- the checks
def analyse(video, stunt=None, recp=None, story_dir=None, payoff_spec=None, is_story=None):
    notes, F = [], []
    add = lambda level, check, t, msg, fix="": F.append({"level": level, "check": check, "out": None if t is None else round(float(t), 2), "msg": msg, "fix": fix})
    dur = probe_len(video)
    P = picture(video)
    S = sound(video)
    lt, lS = lufs_short(video)
    # the true peak (after the AAC encode): over -1 dBTP clips after YouTube's transcode (lead 2026-11-11: the stunt
    # masters peaked above 0; scripts/loud.py master limits to -1 dBTP from then on)
    try:
        import loud
        tp = loud.true_peak(video)
        if tp > TP_MAX:
            add("WARN", "loud", None, f"true peak {tp:+.1f} dBTP (max {TP_MAX:g}): it can clip after YouTube's transcode",
                "re-master: scripts/loud.py master (add_song.py does it for new packages)")
        notes.append(f"true peak {tp:+.1f} dBTP")
    except Exception as e:   # noqa: BLE001
        notes.append(f"true peak not measured ({e})")
    cuts_v, onsets = picture_events(P)
    hits = sound_hits(S["level"])

    marks, lines, caps, edit, story, clock, rec = [], [], [], {}, None, None, None
    if stunt and recp:
        try:
            clock, rec, marks = from_recording(stunt, recp)
            edit = edit_of(stunt)
            hook = clock.p.n_hook / 60
            story_dir = story_dir or edit.get("story")
            if story_dir and not pathlib.Path(story_dir).is_absolute():
                story_dir = str(HERE / story_dir)
            if story_dir and (pathlib.Path(story_dir) / "voice" / "voice.json").exists():
                caps = story_captions(story_dir, rec, clock.p.start, hook, dur)
            if abs(clock.total - dur) > 0.3:
                notes.append(f"the video is {dur:.2f} s but the recording's edit plans {clock.total:.2f} s: the marks may be off (re-render, or the mp4 is of another take)")
        except SystemExit as e:
            notes.append(f"the recording's clock failed ({e}): picture and sound only")
        except Exception as e:   # noqa: BLE001
            notes.append(f"the recording's clock failed ({type(e).__name__}: {e}): picture and sound only")
    elif not recp:
        notes.append("no recording: picture and sound only (no line, caption or event marks)")
    story = {}
    if story_dir and (pathlib.Path(story_dir) / "story.json").exists():
        story = json.loads((pathlib.Path(story_dir) / "story.json").read_text())
    if is_story is None:
        is_story = bool(story) or bool(stunt and re.sub(r"^\.hb_pkg_", "", stunt).startswith("story_")) or "story_" in pathlib.Path(video).stem or "story_" in str(video)
    lines = [(m["out"], m.get("id")) for m in marks if m["event"] == "line"]
    text_of = {l["id"]: l.get("text", "") for l in (story or {}).get("lines", [])}
    cut_marks = sorted({round(m["out"], 2) for m in marks if m["event"] in ("cut", "respawn") and 0.05 < m["out"] < dur - 0.05})
    # a cut is a cut if the picture shows it; a cut mark the picture doesn't show (a same-place cut) still counts
    cuts = sorted(set(cuts_v) | {c for c in cut_marks if not any(abs(c - v) < 0.2 for v in cuts_v)})
    if not caps and clock and edit.get("captions"):   # a stunt's band captions switching on marks (edit.captions): each change is news
        for spec, text in ((c[0], c[1]) for c in edit["captions"]):
            try:
                name, _, off = str(spec).rpartition(":") if ":" in str(spec) else (str(spec), "", "0")
                o = clock.resolve(f"{name}{float(off):+.3f}")["out"]
            except (ValueError, KeyError):
                o = None
            if o is not None and 0 < o < dur:
                caps.append((round(o, 3), text, None))
    cap_times = sorted({round(t, 2) for t, _, _ in caps} | set(edit_caption_times(video, edit, rec, clock)))
    other_marks = [(round(m["out"], 2), m["event"]) for m in marks if m["event"] not in ("line", "cut", "shot", "self", "start", "end", "f1_on", "f1_off", "story_end")]
    builds = build_events(rec.get("timeline", []), clock.out_of_src) if rec and clock else []
    if builds:
        notes.append(f"{len(builds)} block placements/breaks in steady runs count as events (a build is never dead)")

    # the voice: each line's spoken span (voice.json) and the silence after it, before the next line
    voice_gaps = []
    if story_dir and (pathlib.Path(story_dir) / "voice" / "voice.json").exists() and lines:
        vo = json.loads((pathlib.Path(story_dir) / "voice" / "voice.json").read_text()).get("lines", {})
        for (t, lid), nxt in zip(lines, lines[1:] + [(None, None)]):
            v = vo.get(lid) or {}
            if "end" in v and nxt[0] is not None:
                voice_gaps.append((round(t + v["end"], 2), round(nxt[0] - t - v["end"], 2), lid, nxt[1]))
    voice_end = {lid: round(t + (vo.get(lid) or {}).get("end", 0), 2) for t, lid in lines} if voice_gaps else {}
    spoken = sum(max(0.0, (vo.get(l) or {}).get("end", 0) - (vo.get(l) or {}).get("onset", 0)) for _, l in lines) if voice_gaps else None

    # ---- voice cut off or overlapping (owner 2026-11-10: "the voices seem to be edited in a way that cuts stuff off")
    if voice_end:
        spoken_lines = [l for l in lines if not text_of or l[1] in text_of]   # narration_wav plays story.json's lines only
        for (t0, lid), nxt in zip(spoken_lines, spoken_lines[1:] + [(None, None)]):
            e = voice_end.get(lid)
            if e is None:
                continue
            if e > dur - 0.05:
                add("BLOCK", "voice", e, f"{lid} is still speaking when the video ends ({e:.2f} s vs end {dur:.2f} s): its last word is cut off",
                    "end after the line (endAfter on its last word + 0.2 s), or move the line earlier")
            if nxt[0] is not None and e > nxt[0] + 0.03:
                add("BLOCK", "voice", nxt[0], f"{nxt[1]} starts at {nxt[0]:.2f} s while {lid} is still speaking (to {e:.2f} s): the lines overlap",
                    "space the line marks so each line ends before the next starts (or shorten the take's tail padding)")

    # ---- 5b. a story-wide line gap that builds in pauses (owner 2026-11-10: "the narrator just yaps on and on")
    g = story.get("gap") if isinstance(story, dict) else None
    if isinstance(g, (int, float)) and g > 0.15:
        add("WARN", "gap", 0.0, f'story.json "gap": {g} s between every line (the reference Short: ~0.1 s)',
            'drop "gap" (K.line defaults to 0.08 s); published stories keep theirs only so they render as before')

    # ---- 6. length
    floor = length_floor(is_story)
    if dur < floor:
        add("BLOCK", "length", dur, f"{dur:.1f} s: under the {floor:g} s minimum" + ("" if is_story else " for a stunt"), "more beats (an escalating series), not slower ones")
    elif is_story and dur > LEN_WARN:
        add("WARN", "length", dur, f"{dur:.1f} s: over 45 s for a story (owner wants them tight)", "cut the line/shot that adds least (see the slowest spans below), or end on the payoff")

    # ---- 1. visual hook
    k = int(HOOK_S * VFPS)
    l0, s0 = float(P["luma"][0]), float(P["spread"][0])
    hook_motion = float(np.mean(P["motion"][1:k]))
    hook_cuts = [c for c in cuts if c <= HOOK_S]
    early = float(np.mean(P["motion"][1:int(0.3 * VFPS) + 1]))
    if l0 < 12:
        add("BLOCK", "hook", 0, f"the first frame is black (mean luma {l0:.0f})", "start on the picture: startAt the first line's cut, no fade in")
    elif s0 < 10:
        add("BLOCK", "hook", 0, f"the first frame is a flat card (luma spread {s0:.0f}): no picture behind the text", "open on the subject with the caption over it")
    if hook_motion < 0.8 and not hook_cuts:
        add("BLOCK", "hook", 0, f"still opener: motion {hook_motion:.2f} over 0-{HOOK_S} s and no cut (a muted scroller sees a photo)",
            "open on a moving shot (a push, the subject moving) or cut at ~0.8 s to the second shot; startAt later into the first shot")
    elif hook_motion < 1.6 and not hook_cuts:
        add("WARN", "hook", 0, f"slow opener: motion {hook_motion:.2f} over 0-{HOOK_S} s, no cut (runaway's is ~2+)",
            "a faster push or the subject moving in the first second, or a cut by 1.5 s")
    elif early < 0.3 and not any(c <= 0.3 for c in hook_cuts):
        add("WARN", "hook", 0, f"the first 0.3 s are frozen (motion {early:.2f}) before anything moves", "start the shot already moving (startAt a few frames later)")
    # ---- 2. audio hook
    lev = S["level"]
    loud_from = next((i * HOP for i in range(len(lev)) if lev[i] > -40), None)
    if loud_from is None or loud_from > SOUND_BY:
        add("BLOCK", "hook", loud_from or 0, f"silence at the start: sound begins at {loud_from if loud_from is not None else 'never'} s (by {SOUND_BY} s)",
            "the first line or a hit on frame 0 (startAt the line's mark, no lead-in)")
    first_line = lines[0] if lines else None
    first_hit = next((t for t, r in hits if t <= HOOK_S), None)
    # owner 2026-11-10: "the audio must land like start talking the first moment the video starts, same with the
    # visual hook": a story's first word by 0.2 s (a blocker after 0.4 s), and the picture already moving on frame 1
    if is_story and first_line and first_line[0] > 0.4:
        add("BLOCK", "hook", first_line[0], f"the narrator starts talking at {first_line[0]:.2f} s (owner: talking from the first moment)",
            "startAt the first line's mark; no lead-in, no title card before the voice")
    elif is_story and first_line and first_line[0] > 0.2:
        add("WARN", "hook", first_line[0], f"the first word at {first_line[0]:.2f} s (aim for <= 0.2 s)", "trim the lead-in so the first word is on frame 0-5")
    if is_story and early < 0.3 and not any(c <= 0.3 for c in hook_cuts):
        add("BLOCK", "hook", 0, f"the opening picture is frozen for its first 0.3 s (motion {early:.2f}): it must move from frame 1",
            "start the opening shot mid-move (startAt a few frames into the push) or open on the subject moving")
    if first_line and first_line[0] <= HOOK_S:
        txt = " ".join(norm(text_of.get(first_line[1], "")))
        q = (story or {}).get("question")
        notes.append(f"audio hook: {first_line[1]} at {first_line[0]:.2f} s \"{txt}\"" + (f" (story.json question: \"{q}\")" if q else "") + ": does it make you ask why?")
    elif first_hit is not None:
        notes.append(f"audio hook: a sound hit at {first_hit:.2f} s (no line marks)")
    elif lines:
        add("WARN", "hook", first_line[0], f"the first line starts at {first_line[0]:.2f} s, after {HOOK_S} s", "startAt the first line's mark")
    else:
        add("WARN", "hook", None, f"no line mark and no sound hit in the first {HOOK_S} s", "open on the question line or a hit")

    # ---- no pauses in the opening (owner 2026-11-10: "we should have absolutely no pauses in like the first few
    # seconds ... the dog has been sitting there has a brief pause right in the first few seconds"). Gaps between
    # lines (voice.json) and silences inside each line's take (its wav), for everything spoken before OPEN_S.
    OPEN_S = 5.0
    if is_story and lines:
        pauses = [(g_at, g_len, f"between {a} and {b}") for g_at, g_len, a, b in voice_gaps if g_at < OPEN_S]
        vdir = pathlib.Path(story_dir) / "voice" if story_dir else None
        for t0, lid in lines:
            if t0 >= OPEN_S or not vdir or not (vdir / f"{lid}.wav").exists():
                continue
            try:
                raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(vdir / f"{lid}.wav"), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                                     capture_output=True, check=True).stdout
                x = np.frombuffer(raw, np.float32)
                fr = 160
                db = 20 * np.log10(np.sqrt(np.mean(x[: len(x) // fr * fr].reshape(-1, fr) ** 2, axis=1)) + 1e-9)
                voiced = np.where(db > db.max() - 30)[0]
                if len(voiced) < 2:
                    continue
                run = 0
                for i in range(voiced[0], voiced[-1] + 1):
                    if db[i] <= db.max() - 30:
                        run += 1
                    else:
                        if run * 0.01 >= 0.2:
                            at = t0 + (i - run) * 0.01
                            if at < OPEN_S:
                                pauses.append((round(at, 2), round(run * 0.01, 2), f"inside {lid}"))
                        run = 0
            except Exception:   # noqa: BLE001
                pass
        # calibrated on runaway (the benchmark): its sentence gaps are 0.37-0.40 s and read as one breath; a "..."
        # pause inside a line, or a gap over ~0.5 s, reads as the video stalling
        for at, ln, where in sorted(pauses):
            between = where.startswith("between")
            first = where == f"inside {lines[0][1]}"
            if ln > (0.6 if between else 0.2 if first else 0.35):
                add("BLOCK", "hook", at, f"a {ln:.2f} s pause in the opening ({where}); owner: no pauses in the first seconds",
                    ("owner: \"the opening must be in one breath\": re-take line 1 as one quick breath (trimming silence isn't enough)" if first else
                     "re-take the line without the '...' / tighten the cut between lines (gap <= 0.15 s) in the first 5 s"))
            elif ln > (0.45 if between else 0.25):
                add("WARN", "hook", at, f"a {ln:.2f} s pause in the opening ({where})", "tighten it (runaway's sentence gaps: ~0.4 s)")

    # ---- speech rate (docs/research/narration_2026-11-10.md: narrator channels 3.8-5.8 words/s, median 4.57;
    # runaway 4.4, both counted over speaking time). Here: words over first line start .. last line start + 2 s, gaps
    # included, so the numbers run lower: runaway (the benchmark) 3.47, respawn_tax 3.58, old good_boy 3.13.
    if is_story and text_of and lines:
        nwords = sum(len(norm(text_of.get(lid, ""))) for _, lid in lines)
        span = max(1e-6, (lines[-1][0] if len(lines) > 1 else dur) - lines[0][0] + 2.0)
        wps = nwords / span
        notes.append(f"speech rate: {nwords} words over {span:.1f} s = {wps:.2f} words/s (runaway, the benchmark: 3.47 by this count)")
        if spoken:
            swps = nwords / max(1e-6, spoken)
            notes.append(f"speaking-time rate: {swps:.2f} words/s while talking (reference: Pip, the owner's pick, ~4.1)")
            # owner 2026-11-10: the natural-tempo Pip beat every sped-up take ("too sped up"), so the rate is
            # information, not a target: warn only when clearly slower than Pip, never block, never stretch takes
            if swps < 3.3:
                add("WARN", "pace", None, f"the narrator talks at {swps:.2f} words/s while speaking (Pip ~4.1)",
                    "re-take with a quicker direction; never time-stretch (the owner rejected sped-up takes)")
        # dead air is what loses viewers, and the gap and pause checks above catch it; overall rate only flags a
        # story that is mostly silence
        if wps < 2.3:
            add("WARN", "pace", None, f"the narration is sparse: {wps:.2f} words/s overall (Pip's Dog on the Hill ~2.85)",
                "tighten the gaps between lines and the holds with no voice")

    # ---- owner notes as checks on the recording (scripts/owner_checks.py): aim on the action (r:rffba12) and the
    # payoff's motion settling before the end (r:r24d99a)
    settle_of = lambda payoff: None
    if rec and clock and recp:
        settle_of = owner_checks_on(add, notes, rec, recp, clock, stunt, dur)

    # ---- 5. payoff (located first: build-up runs to it)
    payoff, how = None, ""
    spec = payoff_spec or (story or {}).get("payoff")
    def mark_time(name):
        for m in marks:
            if (m["event"] == "line" and m.get("id") == name) or m["event"] == name:
                return m["out"]
        return None
    if spec:
        payoff, how = mark_time(re.split(r"[+:]", str(spec))[0]), f"story.json payoff {spec}" if not payoff_spec else f"--payoff {spec}"
        m = re.search(r"[+:](-?[\d.]+)$", str(spec))
        if payoff is not None and m:
            payoff += float(m.group(1))
    if payoff is None and edit.get("endAfter"):
        ev = str(edit["endAfter"]).split(":")[0]
        if ev == "settle":   # endAfter 'settle:0.6' (lib/settle.js): the payoff is where that last motion began (the
            # blast, the fall, the death); the tail counts from the settle (the settle check below)
            st_ = mark_time("settle")
            starts = [m["out"] for m in marks if m["event"] == "motion_start" and st_ is not None and m["out"] is not None and m["out"] <= st_ + 1e-6]
            if starts:
                payoff, how = starts[-1], "the edit's endAfter 'settle': where the last payoff motion began"
                # inside that window, the last blast or death (a lit fuse opens the window: the payoff is the bang)
                hits = [clock.out_of_src(e["t"] / 1000) for e in (rec or {}).get("timeline", []) if clock and (
                    (e["event"] == "particles" and e.get("type") == "explosion") or e["event"] in ("death", "mob_death"))]
                hits = [h for h in hits if h is not None and starts[-1] - 1e-6 <= h <= st_ + 1e-6]
                if hits:
                    payoff, how = max(hits), "the edit's endAfter 'settle': the last blast or death before it settles"
        elif ev not in ("story_end", "end", "line"):
            payoff, how = mark_time(ev), f"the edit's endAfter event '{ev}'"
    if payoff is None and story and story.get("twist") and lines:
        quotes = re.findall(r"['\"\u2018\u201c]([^'\"\u2019\u201d]{3,40})['\"\u2019\u201d]", story["twist"])
        for q in quotes:
            qn = norm(q)
            for t, lid in reversed([x for x in lines if x[0] >= 0.6 * dur]):
                ln = norm(text_of.get(lid, ""))
                if qn and any(ln[i:i + len(qn)] == qn for i in range(len(ln))):
                    payoff, how = t, f"{lid}, the line story.json's twist quotes (\"{q}\")"
                    break
            if payoff is not None:
                break
    if payoff is None and edit.get("deathScreen"):
        d = [m["out"] for m in marks if m["event"] in ("death", "slain") and m["out"] >= 0.6 * dur]
        if d:
            payoff, how = d[-1], "the death (the edit's death screen)"
    # the hit: the biggest sound jump + picture change in the last 40%
    def hit_score(t):
        i = int(t * VFPS)
        pic = max(P["cut"][max(1, i - 6):i + 7].max(initial=0), 2 * P["motion"][max(1, i - 6):i + 7].max(initial=0))
        snd = max([r for ht, r in hits if abs(ht - t) <= PAYOFF_WIN] or [0])
        return pic / 20 + snd / 10
    if payoff is None:
        cands = [t for t in sorted(set(cuts) | {t for t, _ in hits} | set(onsets)) if t >= 0.6 * dur]
        if cands:
            payoff = max(cands, key=hit_score)
            how = "the biggest sound + picture hit in the last 40% (no payoff mark: set story.json \"payoff\")"
    def sfx_spec(p):
        """['impact', EVENT, {nth}] for the raw timeline mark at the payoff (sfx.py's nth counts from 0)."""
        if rec:
            tl = rec.get("timeline", [])
            best = None
            for m in marks:
                if abs(m["out"] - p) <= 0.12 and m["event"] not in ("cut", "self", "f1_on", "start"):
                    pref = 0 if m["event"] == "line" else 1 if m["event"] == "shot" else 2
                    if best is None or pref < best[0]:
                        best = (pref, m)
            if best:
                m = best[1]
                same = [e for e in tl if e["event"] == m["event"]]
                k = next((i for i, e in enumerate(same) if abs(e["t"] / 50 - m["tick"]) < 0.01), None)
                if k is not None:
                    return f"['impact', '{m['event']}', {{nth: {k}}}]]" + (f" (0-based: {m['event']} #{k} is {m.get('id') or m.get('name')})" if m.get("id") or m.get("name") else "")
        return "['impact', '<payoff event>']]"

    def end_fix(p, hi):
        """A concrete endAfter: the end hi-0.2 s after the payoff (never inside the payoff line's voice), written on the
        edit's own endAfter event (edit.py ends at that event's FIRST mark + the offset)."""
        target = p + hi - 0.2
        pl = [lid for t, lid in lines if abs(t - p) <= PAYOFF_WIN]
        if pl and voice_end.get(pl[0]) is not None:
            target = min(p + hi, max(target, voice_end[pl[0]] + 0.15))
        ea = str(edit.get("endAfter") or "")
        if ":" in ea:
            ev, off = ea.rsplit(":", 1)
            te = mark_time(ev)
            if te is None:
                te = dur - float(off)   # (a mark past the body, like story_end: the current end is it + the offset)
            return f"endAfter '{ev}:{target - te:.2f}' (ends at {target:.2f} s)"
        return f"endAfter '<payoff mark>:{hi - 0.2:.1f}' (ends at {target:.2f} s)"
    text_payoff = False
    guessed = how.startswith("the biggest")   # a guess never blocks: set story.json "payoff" to make it a real check
    if payoff is not None:
        ev_here = {m["event"] for m in marks if abs(m["out"] - payoff) <= 0.5}
        text_payoff = bool(edit.get("deathScreen") and (ev_here & {"death", "slain", "boom", "burn"})) or \
            any(isinstance(c, list) and mark_time(str(c[0]).split(":")[0]) is not None and abs(mark_time(str(c[0]).split(":")[0]) - payoff) <= 0.5 for c in edit.get("cards", []))
        line_here = [(t, lid) for t, lid in lines if abs(t - payoff) <= PAYOFF_WIN]
        # a hit that is only a line's first word is the voice, not a sound hit (an impact, a boom, the music)
        snd = [(t, r) for t, r in hits if abs(t - payoff) <= PAYOFF_WIN and not any(abs(t - lt_) <= 0.12 for lt_, _ in lines)]
        pic = [c for c in cuts if abs(c - payoff) <= PAYOFF_WIN] + [o for o in onsets if abs(o - payoff) <= PAYOFF_WIN]
        i0, i1 = int(max(0, payoff - PAYOFF_WIN) * VFPS), int((payoff + PAYOFF_WIN) * VFPS) + 1
        flash = float(np.abs(np.diff(P["luma"][i0:i1 + 1])).max(initial=0))
        notes.append(f"payoff at {payoff:.2f} s: {how}" + (" (a text payoff)" if text_payoff else ""))
        if not snd:
            add("BLOCK" if not line_here and not guessed else "WARN", "payoff", payoff,
                "no sound hit within 0.3 s of the payoff" + (f" (only {line_here[0][1]}'s voice starts: the reveal lands on a word, no sting)" if line_here else ""),
                f"an impact/boom on it: edit sfx: [{sfx_spec(payoff)} (scripts/sfx.py; edit-only), or the song's drop there (dropAt)")
        if not pic and flash < 12:
            add("WARN" if guessed else "BLOCK", "payoff", payoff, "no clear picture change within 0.3 s of the payoff (no cut, no motion onset, no flash)",
                "cut to the reveal shot on the payoff mark, or a punch/flash on it (edit punch/flash: [EVENT])")
        # let the payoff settle (r:r24d99a): the tail counts from when its falling blocks / debris / death stop
        st = settle_of(payoff)
        tail = dur - max(payoff, st["out"] if st and st["out"] is not None else payoff)
        if st:
            notes.append(st["note"])
            if st["blocks"]:
                add("BLOCK", "settle", st["end_out"], st["msg"], "end after it settles (endAfter on a later mark, or a later offset), +1.0 s at most")
        after = [f"{lid} at {t:.2f}" for t, lid in lines if t > payoff + 0.2]
        ok_hi, block_hi = (TEXT_TAIL[1], TEXT_TAIL[1] + 0.5) if text_payoff else (TAIL_MAX, TEXT_TAIL[1])
        if tail > ok_hi + 0.05:
            lvl = "BLOCK" if (tail > block_hi + 0.05 or after) and not guessed else "WARN"
            add(lvl, "payoff", payoff, f"the video runs {tail:.2f} s past the payoff (owner: end as soon as it lands; max {ok_hi:.1f} s{' for a text payoff' if text_payoff else ''})"
                + (f"; after it: {', '.join(after)}" if after else "") + ("" if text_payoff or lvl == "BLOCK" else " (fine only if the payoff is text that needs 1.2-1.8 s to read)"),
                end_fix(payoff, ok_hi) + (": the line(s) after it go (or move the button line before the payoff)" if after else ""))
        elif text_payoff and tail < TEXT_TAIL[0] - 0.05:
            add("WARN", "payoff", payoff, f"a text payoff held {tail:.2f} s: under {TEXT_TAIL[0]} s to read it", f"endAfter '<payoff>:{TEXT_TAIL[0] + 0.2:.1f}'")
    else:
        add("WARN", "payoff", None, "no payoff found", "set story.json \"payoff\": \"L18\" (or --payoff MARK)")

    # ---- 3. dead spots
    events = sorted([(0.0, "start")] + [(c, "cut") for c in cuts] + [(t, "caption") for t in cap_times] + [(t, f"line {lid}") for t, lid in lines]
                    + [(t, "sound hit") for t, _ in hits] + [(t, "motion") for t in onsets] + [(t, ev) for t, ev in other_marks] + [(t, "block") for t in builds if 0 < t < dur] + [(dur, "end")])
    dead = gaps(events)
    def shot_at(t):
        prev = [c for c in cuts if c <= t + 0.01]
        nxt = [c for c in cuts if c > t + 0.01]
        return (prev[-1] if prev else 0.0, nxt[0] if nxt else dur)
    def line_at(t):
        prev = [lid for lt_, lid in lines if lt_ <= t + 0.01]
        return prev[-1] if prev else None
    for a, b, d, ea, eb in dead:
        if d <= DEAD_WARN or (payoff is not None and a >= payoff - 0.05 and eb == "end"):
            continue   # (the tail after the payoff is the payoff check's)
        lvl = "BLOCK" if d > DEAD_BLOCK else "WARN"
        add(lvl, "dead", a, f"{d:.2f} s with nothing new ({a:.2f}-{b:.2f} s, after the {ea}; {line_at(a) or 'no line'} on screen)",
            "trim the pause between the lines (the voice gap) or cut to a second angle in the middle" if eb != "end" else "end earlier")
    pic_events = sorted([(0.0, "start")] + [(c, "cut") for c in cuts] + [(t, "motion") for t in onsets] + [(dur, "end")])
    pic_dead = gaps(pic_events)
    for a, b, d, ea, eb in pic_dead[:3]:
        if d > PICTURE_WARN:
            mo = float(np.mean(P["motion"][int(a * VFPS):int(b * VFPS)]))
            add("WARN", "picture", a, f"{d:.2f} s of one shot with no new motion ({a:.2f}-{b:.2f} s, mean motion {mo:.1f}): muted, nothing happens"
                + (f"; lines {', '.join(lid for t, lid in lines if a <= t < b)} play over it" if any(a <= t < b for t, _ in lines) else ""),
                f"cut to another angle at ~{(a + b) / 2:.1f} s (each line its shot), or give the shot a move or an action")

    for a, b in sorted(P["same"], key=lambda x: x[0] - x[1])[:3]:
        if b - a > SAME_WARN and not (payoff is not None and a >= payoff - 0.05):
            ls = [lid for t, lid in lines if a <= t < b]
            add("WARN", "picture", a, f"the same picture for {b - a:.1f} s ({a:.2f}-{b:.2f} s{': lines ' + ', '.join(ls) if ls else ''}): its cuts/moves don't change what we see",
                "cut the middle line(s) to a different subject or size (a reaction, the detail the line names), or shorten the span")

    # ---- key sounds over the music (scripts/key_sounds.py; owner 2026-11-11 on guess_sound: "had super loud music")
    if edit.get("keySounds"):
        nos = pathlib.Path(video).with_name("short_nosong.mp4")
        if pathlib.Path(video).name == "short.mp4" and nos.exists():
            import key_sounds
            kt = sorted(m["out"] for m in marks if m["event"] in edit["keySounds"])
            drop = next((m["out"] for m in marks if m["event"] == edit.get("dropAt")), None)
            krows, kbad = key_sounds.check(video, nos, kt, drop)
            if krows:
                notes.append(f"key sounds over the music: worst {min(r['margin_db'] for r in krows):+.1f} dB over {len(krows)} clips (need >= {key_sounds.KEY_MIN_DB:.0f} dB)")
            for r in kbad:
                add("BLOCK", "keysound", r["t"], f"the music covers a key sound ({', '.join(edit['keySounds'])}): {r['margin_db']:+.1f} dB over the music (need >= {key_sounds.KEY_MIN_DB:.0f})",
                    "remix the song: python3 scripts/add_song.py <name> --song songs/ncs/<its track> (ducks it under edit.keySounds)")
        else:
            notes.append("key sounds: no short_nosong.mp4 beside the video (the song goes in at publish: scripts/add_song.py ducks it and gates it)")

    # ---- 4. build-up
    end_b = payoff if payoff is not None and payoff > 9 else dur
    thirds = [(end_b * i / 3, end_b * (i + 1) / 3) for i in range(3)]
    def lufs_mean(a, b):
        sel = lS[(lt >= a + 3) & (lt <= b)] if b - a > 4 else lS[(lt >= a) & (lt <= b)]
        sel = sel[sel > -60]
        return float(10 * np.log10(np.mean(10 ** (sel / 10)))) if len(sel) else -70.0
    def bed(a, b):
        sel = S["level"][int(a / HOP):int(b / HOP)]   # the floor under the voice: the music bed + the game's ambience
        return float(np.percentile(sel, 10)) if len(sel) else -90.0
    rows = []
    for a, b in thirds:
        rows.append({"span": [round(a, 2), round(b, 2)], "cuts_per_10s": round(10 * sum(a <= c < b for c in cuts) / max(0.1, b - a), 2),
                     "events_per_10s": round(10 * sum(a <= t < b for t, _ in events if _ not in ("start", "end")) / max(0.1, b - a), 1),
                     "lufs": round(lufs_mean(a, b), 1), "bed_db": round(bed(a, b), 1),
                     "motion": round(float(np.mean(P["motion"][int(a * VFPS):int(b * VFPS)])), 2)})
    A, B, C = rows
    sags = []
    if C["cuts_per_10s"] < 0.75 * B["cuts_per_10s"] - 0.1:
        sags.append(f"cut rate {B['cuts_per_10s']} -> {C['cuts_per_10s']} per 10 s")
    if C["lufs"] < B["lufs"] - 1.5:
        sags.append(f"loudness {B['lufs']} -> {C['lufs']} LUFS")
    if C["bed_db"] < B["bed_db"] - 3 and B["bed_db"] > -60:   # (below -60 dB there is no bed: an out/ story render has no song yet)
        sags.append(f"floor (bed) {B['bed_db']} -> {C['bed_db']} dB")
    if C["motion"] < 0.7 * B["motion"] - 0.1:
        sags.append(f"motion {B['motion']} -> {C['motion']}")
    if len(sags) >= 2:
        add("WARN", "buildup", C["span"][0], f"the last third before the payoff sags ({C['span'][0]:.1f}-{C['span'][1]:.1f} s): " + "; ".join(sags),
            "shorter shots toward the payoff (split a long shot), a riser/the music building into it (edit sfx 'riser'), faster lines")
    elif sags:
        notes.append("build-up: one measure dips in the last third (" + sags[0] + "); the others hold")

    longest_shots = sorted([(round(b - a, 2), round(a, 2), round(b, 2)) for a, b in zip([0.0] + cuts, cuts + [dur])], reverse=True)[:5]
    metrics = {"length": round(dur, 2), "story": is_story, "payoff": None if payoff is None else round(payoff, 2), "payoff_how": how, "text_payoff": text_payoff,
               "tail": None if payoff is None else round(dur - payoff, 2), "hook_motion": round(hook_motion, 2), "first_frame": {"luma": round(l0, 1), "spread": round(s0, 1)},
               "sound_from": None if loud_from is None else round(loud_from, 2), "first_line": first_line, "cuts": cuts, "cuts_from_picture": cuts_v,
               "cut_marks": cut_marks, "motion_onsets": onsets, "sound_hits": hits, "captions": len(cap_times), "lines": lines,
               "longest_dead": dead[:5], "longest_picture_dead": pic_dead[:5], "longest_shots": longest_shots, "thirds": rows,
               "mean_shot": round(dur / (len(cuts) + 1), 2), "s_per_line": round(dur / len(lines), 2) if lines else None,
               "voice_gaps": sorted(voice_gaps, key=lambda g: -g[1])[:6], "voice_gap_total": round(sum(max(0, g[1]) for g in voice_gaps), 2) if voice_gaps else None,
               "spoken": None if spoken is None else round(spoken, 2)}
    return {"findings": sorted(F, key=lambda f: (f["level"] != "BLOCK", f["out"] if f["out"] is not None else -1)), "notes": notes, "metrics": metrics}


def report(name, res):
    m = res["metrics"]
    out = [f"note: {n}" for n in res["notes"]]
    out.append(f"length {m['length']:.2f} s, {len(m['cuts'])} cuts (a shot every {m['mean_shot']:.1f} s), {len(m['lines'])} lines, {m['captions']} caption chunks, "
               f"{len(m['sound_hits'])} sound hits, {len(m['motion_onsets'])} motion onsets; hook motion {m['hook_motion']}, sound from {m['sound_from']} s")
    if m.get("voice_gap_total") is not None:
        out.append(f"voice: {m['spoken']:.1f} s spoken of {m['length']:.1f} s ({m['s_per_line']} s a line); {m['voice_gap_total']:.1f} s of gaps between lines, longest "
                   + ", ".join(f"{g:.2f} s after {a} ({at:.1f} s)" for at, g, a, b in m["voice_gaps"][:3]))
    out.append("thirds to the payoff:  " + " | ".join(f"{r['span'][0]:.0f}-{r['span'][1]:.0f} s: {r['cuts_per_10s']} cuts/10s, {r['events_per_10s']} ev/10s, {r['lufs']} LUFS, floor {r['bed_db']} dB, motion {r['motion']}" for r in m["thirds"]))
    out.append("longest quiet spans:  " + ", ".join(f"{d:.1f} s at {a:.1f}" for a, b, d, *_ in m["longest_dead"][:3]) + "  | picture only: " + ", ".join(f"{d:.1f} s at {a:.1f}" for a, b, d, *_ in m["longest_picture_dead"][:3]))
    for f in res["findings"]:
        t = "     -  " if f["out"] is None else f"{f['out']:6.2f} s"
        out.append(f"{f['level']:<5} [{f['check']:<7}] {t}: {f['msg']}" + (f"\n{'':>26}fix: {f['fix']}" if f.get("fix") else ""))
    nb = sum(f["level"] == "BLOCK" for f in res["findings"])
    nw = sum(f["level"] == "WARN" for f in res["findings"])
    out.append(f"{'FAIL' if nb else 'OK'}: {nb} blocker(s), {nw} warning(s) (pacing: hook, dead spots, build-up, payoff, length: scripts/pace.py)")
    return "\n".join(out)


def find_video(name):
    for p in (HERE / "out" / f"{name}.mp4", VIDEOS / "shorts" / name / "short.mp4"):
        if p.exists():
            return p
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("name")
    ap.add_argument("--video")
    ap.add_argument("--stunt")
    ap.add_argument("--rec")
    ap.add_argument("--story")
    ap.add_argument("--payoff")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    video = pathlib.Path(a.video) if a.video else find_video(a.name)
    if not video or not video.exists():
        print(f"pace: no video for {a.name}: looked in out/{a.name}.mp4 and {VIDEOS}/shorts/{a.name}/short.mp4 (render it: ./hb render {a.name} --wait)", file=sys.stderr)
        return 2
    res = analyse(video, a.stunt, a.rec, a.story, a.payoff)
    res["video"] = str(video)
    nb = sum(f["level"] == "BLOCK" for f in res["findings"])
    res["ok"] = not nb
    print(json.dumps(res, default=float) if a.json else report(a.name, res))
    return 1 if nb else 0


if __name__ == "__main__":
    sys.exit(main())
