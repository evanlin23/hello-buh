"""Assemble a long-form episode (docs/longform.md) from its rendered segments: `python3 scripts/longform.py build <ep>`.

episodes/<ep>/episode.json `pieces` play in order:
  {"id": "boat", "kind": "seg", "seg": "boat_clutch", "chapter": "Clutch #1: the boat"}   a rendered segment
  {"id": "cold", "kind": "clip", "seg": "one_in_a_million", "from": 21.3, "to": 26.36}      part of one (seconds)
  {"id": "c1", "kind": "card", "dur": 2.6, "bg": ["boat_clutch", 3.0], "kicker": "CLUTCH #1", "title": "THE BOAT",
   "sub": "...", "list": [["#1", "BOAT", "the easiest"], ...]}                               a chapter card
`narration`: [[LINE_ID, PIECE_ID, SECONDS_INTO_PIECE], ...] places each line of episodes/<ep>/voice/ (voice.py).

The mix: narration at -16 LUFS, the game at -18 (ducked 9 dB while a line plays), an NCS bed at -24 (ducked 10 dB: vanilla falls are nearly silent, so the bed carries the action),
a whoosh on every card, mastered to -14 LUFS (YouTube's long-form reference). Writes out/<name>.mp4 plus
out/<name>.json (title, description with chapters and the NCS credit, chapter list) and out/<name>_thumb.jpg.
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
import loud  # noqa: E402
import sfx  # noqa: E402

LF = HERE / "work" / "lf"
W, H = 1920, 1080
FONT = str(HERE / "assets" / "fonts" / "SchibstedGrotesk-Black.ttf")
YELLOW, WHITE, RED = (255, 220, 40, 255), (255, 255, 255, 255), (235, 50, 40, 255)


def probe(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True, check=True).stdout)


def frame_at(video, t, out):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0.0, t):.3f}", "-i", str(video), "-frames:v", "1", str(out)], check=True)
    return Image.open(out).convert("RGB")


def text_img(text, size, fill, stroke=None):
    """A line of text with a black outline and a soft drop shadow, cropped to its box."""
    font = ImageFont.truetype(FONT, size)
    stroke = stroke if stroke is not None else max(4, size // 16)
    l, t, r, b = ImageDraw.Draw(Image.new("L", (1, 1))).textbbox((0, 0), text, font=font, stroke_width=stroke)
    pad = size // 4
    im = Image.new("RGBA", (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((pad - l + size // 18, pad - t + size // 14), text, font=font, fill=(0, 0, 0, 150),
                            stroke_width=stroke, stroke_fill=(0, 0, 0, 150))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(size // 20)))
    ImageDraw.Draw(im).text((pad - l, pad - t), text, font=font, fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0, 255))
    return im


def card_layers(p, bg, tmp):
    """(background, text) PNGs for a card: the frame blurred and darkened, then the kicker/title/sub or a list."""
    b = bg.resize((W, H)).filter(ImageFilter.GaussianBlur(16))
    b = Image.blend(b, Image.new("RGB", (W, H), (0, 0, 0)), 0.5)
    b.save(tmp / f"{p['id']}_bg.png")
    top = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if p.get("list"):   # the ranking: left half only (the right half stays free for YouTube's end screen)
        x, y = 130, 150
        k = text_img(p.get("kicker", ""), 72, YELLOW)
        top.alpha_composite(k, (x, y)); y += k.height + 30
        for rank, name, note in p["list"]:
            r = text_img(rank, 96, YELLOW); n = text_img(name, 96, WHITE); m = text_img(note, 48, (225, 225, 225, 255))
            top.alpha_composite(r, (x, y)); top.alpha_composite(n, (x + 190, y))
            top.alpha_composite(m, (x + 200, y + n.height - 40)); y += n.height + m.height - 10
    else:
        parts = [(p.get("kicker"), 84, YELLOW), (p.get("title"), 200, WHITE), (p.get("sub"), 64, WHITE)]
        ims = [text_img(t, s, c) for t, s, c in parts if t]
        y = (H - sum(i.height for i in ims) + 20 * (len(ims) - 1)) // 2
        for i in ims:
            top.alpha_composite(i, ((W - i.width) // 2, y)); y += i.height - 20
    top.save(tmp / f"{p['id']}_text.png")


def render_card(p, fps, tmp):
    """A card clip: a slow push-in on the background, the text fading in over 0.15 s with a small rise, silence.
    `bg_clip: [SEG, FROM]` puts that segment's footage behind the text, blurred and darkened, instead of a still
    (a 12 s outro on a still frame read as a frozen video)."""
    out = tmp / f"{p['id']}.mp4"
    spec, spec_f = json.dumps(p, sort_keys=True), tmp / f"{p['id']}.spec"
    if out.exists() and spec_f.exists() and spec_f.read_text() == spec:   # unchanged card: keep it (and the concat cache)
        return out
    d = float(p["dur"])
    zoom = f"(1+0.08*t/{d:.3f})"
    push = f"scale=w='trunc({W}*{zoom}/2+1)*2':h='trunc({H}*{zoom}/2+1)*2':eval=frame,crop={W}:{H},setsar=1"
    if p.get("bg_clip"):
        seg, t0 = p["bg_clip"]
        bg_in = ["-ss", f"{float(t0):.3f}", "-t", f"{d:.3f}", "-i", str(LF / f"{seg}.mp4")]
        bg = f"[0:v]fps={fps},gblur=sigma=14,drawbox=c=black@0.5:t=fill,{push}[bgv];"
    else:
        bg_in = ["-loop", "1", "-framerate", str(fps), "-t", f"{d:.3f}", "-i", str(tmp / f"{p['id']}_bg.png")]
        bg = f"[0:v]{push}[bgv];"
    g = (bg + f"[1:v]format=rgba,fade=t=in:st=0.05:d=0.15:alpha=1[tx];"
         f"[bgv][tx]overlay=x=0:y='max(0,18-18*t/0.25)',fps={fps},format=yuv420p[v]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *bg_in,
                    "-loop", "1", "-framerate", str(fps), "-t", f"{d:.3f}", "-i", str(tmp / f"{p['id']}_text.png"),
                    "-f", "lavfi", "-t", f"{d:.3f}", "-i", "anullsrc=r=48000:cl=stereo",
                    "-filter_complex", g, "-map", "[v]", "-map", "2:a", "-t", f"{d:.3f}", "-c:v", "libx264", "-preset", "medium",
                    "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", str(out)], check=True)
    spec_f.write_text(spec)
    return out


def ts(t):
    t = int(t)
    return f"{t // 60}:{t % 60:02d}"


def dialogue(seg, cfg, fps):
    """[(t0, t1, text)] in segment time: the scene's `line` marks (lib/movie.js line()), each on screen until the
    next line (at most 3.5 s, or the mark's own dur) and at least 1.2 s."""
    import longform
    rec_path, meta = longform.fetch_segment(seg, cfg)
    rec = json.loads(rec_path.read_text())
    args = longform.seg_args(meta, cfg)
    warp, start, end, _, _ = longform.seg_clock(rec, args, fps)
    ls = [((warp.out(e["t"] / 1000) if warp else e["t"] / 1000) - start, e) for e in rec["timeline"] if e["event"] == "line"]
    ls.sort(key=lambda x: x[0])
    out = []
    for k, (t0, e) in enumerate(ls):
        nxt = ls[k + 1][0] if k + 1 < len(ls) else t0 + 3.5
        t1 = t0 + float(e.get("dur") or min(3.5, max(1.2, nxt - t0 - 0.05)))
        if 0 <= t0 < end - start:
            out.append((t0, min(t1, end - start), e["text"]))
    return out


def subtitle_png(text, path):
    """A movie subtitle: white, black outline, centred near the bottom of the 16:9 frame."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ti = text_img(text, 54, WHITE, stroke=5)
    im.alpha_composite(ti, ((W - ti.width) // 2, H - 110 - ti.height // 2))
    im.save(path)


def raw_frame(seg, t, fps, ep_segments=None):
    """The renderer's own frame (no HUD, counters or subtitles) shown at segment time t: thumbnails want the
    clean picture (on the edited one the HUD, the counter and the block count fought the title)."""
    import longform
    rec_path, meta = longform.fetch_segment(seg, (ep_segments or {}).get(seg))
    rec = json.loads(rec_path.read_text())
    args = longform.seg_args(meta, (ep_segments or {}).get(seg) or {})
    warp, start, *_ = longform.seg_clock(rec, args, fps)
    i = warp.frame(int(round((t + start) * fps)), fps)
    return Image.open(LF / f"{seg}.frames" / f"f{i:05d}.png").convert("RGB")


def thumbnail(ep, out):
    """1280x720: the frame (`raw`: without the HUD), zoomed `zoom`x with the `subject` (px from the frame centre,
    default the crosshair) at `target` (x/y fractions), an optional red `ring` (radius) on it, and the title lines top left."""
    spec = ep.get("thumbnail") or {}
    seg, t = spec.get("frame", ["one_in_a_million", 24.0])
    if spec.get("raw"):
        src = raw_frame(seg, t, ep.get("fps", 30), ep.get("segments"))
    else:
        src = frame_at(LF / f"{seg}.mp4", t, out.with_suffix(".src.png"))
    z = float(spec.get("zoom", 1.0))
    cw, ch = W / z, H / z
    tx, ty = spec.get("target", [0.5, 0.5])        # where the subject lands in the thumbnail (fractions)
    sx, sy = W / 2 + spec.get("subject", [0, 0])[0], H / 2 + spec.get("subject", [0, 0])[1]   # subject: px from the frame centre
    x0 = min(max(0.0, sx - tx * cw), W - cw)
    y0 = min(max(0.0, sy - ty * ch), H - ch)
    im = src.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((1280, 720), Image.LANCZOS)
    im = Image.blend(im, Image.new("RGB", im.size, (0, 0, 0)), 0.1).convert("RGBA")
    if spec.get("ring"):   # a red ring around the target
        cx, cy = (sx - x0) / cw * 1280, (sy - y0) / ch * 720
        r = spec["ring"]
        ImageDraw.Draw(im).ellipse((cx - r, cy - r, cx + r, cy + r), outline=RED, width=14)
    y = 30
    for line, color in spec.get("text", [["EVERY", "yellow"], ["CLUTCH", "white"]]):
        ti = text_img(line, int(spec.get("text_size", 150)), {"yellow": YELLOW, "white": WHITE, "red": RED}[color], stroke=12)
        im.alpha_composite(ti, (30, y)); y += ti.height - 40
    im.convert("RGB").save(out, quality=92)


def build(ep_dir, ep):
    fps = ep.get("fps", 30)
    name = ep["name"]
    tmp = LF / f"{name}.build"
    tmp.mkdir(parents=True, exist_ok=True)
    # 1. every piece as a clip, with its place on the episode clock
    clips, starts, t = [], {}, 0.0
    for p in ep["pieces"]:
        if p["kind"] == "seg":
            path, a, b = LF / f"{p['seg']}.mp4", 0.0, None
        elif p["kind"] == "clip":
            path, a, b = LF / f"{p['seg']}.mp4", float(p["from"]), float(p["to"])
        else:
            bseg, bt = p["bg"]
            card_layers(p, frame_at(LF / f"{bseg}.mp4", bt, tmp / f"{p['id']}_src.png"), tmp)
            path, a, b = render_card(p, fps, tmp), 0.0, None
        d = (b if b is not None else probe(path)) - a
        clips.append((path, a, d))
        starts[p["id"]] = t
        t += d
    total = t
    # 2. picture + game audio: one concat, everything re-timed onto the episode's frame grid
    ins, extra, g, vlab, subs_key = [], [], [], {}, []
    n_in = len(clips)
    for i, ((path, a, d), p) in enumerate(zip(clips, ep["pieces"])):
        ins += ["-i", str(path)]
        g.append(f"[{i}:v]trim=start={a:.4f}:duration={d:.4f},setpts=PTS-STARTPTS,fps={fps},scale={W}:{H},setsar=1,format=yuv420p[v{i}]")
        g.append(f"[{i}:a]atrim=start={a:.4f}:duration={d:.4f},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,"
                 f"apad=whole_dur={d:.4f},atrim=0:{d:.4f}[a{i}]")
        last = f"v{i}"
        # dialogue subtitles (a movie scene's `line` marks), overlaid on their piece in piece time
        if p["kind"] in ("seg", "clip") and ep.get("subtitles", True):
            for k, (t0, t1, text) in enumerate(dialogue(p["seg"], ep["segments"].get(p["seg"], {}), fps)):
                t0, t1 = t0 - a, t1 - a
                if t1 <= 0 or t0 >= d:
                    continue
                png = tmp / f"sub_{i}_{k}.png"
                subtitle_png(text, png)
                subs_key.append([i, round(t0, 3), round(t1, 3), text])
                extra += ["-loop", "1", "-framerate", str(fps), "-t", f"{d:.3f}", "-i", str(png)]
                g.append(f"[{last}][{n_in}:v]overlay=0:0:enable='between(t,{max(0, t0):.3f},{t1:.3f})',format=yuv420p[v{i}s{k}]")
                last, n_in = f"v{i}s{k}", n_in + 1
        vlab[i] = last
    g.append("".join(f"[{vlab[i]}][a{i}]" for i in range(len(clips))) + f"concat=n={len(clips)}:v=1:a=1[v][a]")
    ins += extra
    pic = tmp / "picture.mkv"
    # the concat is the slow part (one 1080p encode): kept while no clip changed, so a mix-only change is quick
    key = json.dumps([[[str(p_), p_.stat().st_mtime, a, d] for p_, a, d in clips], subs_key])
    if not (pic.exists() and (tmp / "picture.key").exists() and (tmp / "picture.key").read_text() == key):
        subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(g), "-map", "[v]", "-map", "[a]",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-maxrate", "16M", "-bufsize", "32M", "-pix_fmt", "yuv420p",
                        "-r", str(fps), "-c:a", "pcm_s16le", str(pic)], check=True)
        (tmp / "picture.key").write_text(key)
    # 3. the stems, on the episode clock (48 kHz stereo float)
    SR = sfx.SR
    n = int(total * SR) + SR
    game = sfx.read_audio(pic)[:n]
    game = np.pad(game, ((0, n - len(game)), (0, 0)))
    nar = np.zeros((n, 2), np.float32)
    vj = ep_dir / "voice" / "voice.json"
    voice = json.loads(vj.read_text())["lines"] if vj.exists() else {}
    spans = []
    for lid, pid, off in ep.get("narration", []):
        at = starts[pid] + float(off)
        x = sfx.read_audio(ep_dir / "voice" / f"{lid}.wav")
        i = int(at * SR)
        nar[i:i + len(x)] += x[: n - i]
        spans.append((at + voice[lid]["onset"], at + voice[lid]["end"], lid))
    spans.sort()
    for (a0, b0, l0), (a1, b1, l1) in zip(spans, spans[1:]):
        if a1 < b0 + 0.1:
            print(f"WARNING narration {l0} ({a0:.2f}-{b0:.2f}) runs into {l1} ({a1:.2f})")
    # (static gains from measured loudness, like loud.static: no compression)
    def lufs_gain(x, target):
        sfx.write_wav(tmp / "m.wav", x)
        return 10 ** ((target - loud.measure(tmp / "m.wav")) / 20)
    nar *= lufs_gain(nar, -16.0)
    game *= lufs_gain(game, -18.0)   # (at -21 the action between lines dipped 7 dB under the narrated stretches)
    music = np.zeros((n, 2), np.float32)
    track = ep.get("music")
    if track:
        song = sfx.read_audio(HERE / "songs" / "ncs" / track["file"])
        a = int(float(track.get("start", 0)) * SR)
        song = song[a:]
        reps = int(np.ceil(n / len(song)))
        music = np.tile(song, (reps, 1))[:n]
        fade = int(2.5 * SR)
        music[-fade:] *= np.linspace(1, 0, fade)[:, None]
        music *= lufs_gain(music, float(track.get("lufs", -30.0)))
    # ducking: a smooth envelope from the narration spans (0.12 s attack, 0.4 s release)
    env = np.zeros(n, np.float32)
    for a0, b0, _ in spans:
        env[int(max(0, a0 - 0.12) * SR):int((b0 + 0.25) * SR)] = 1.0
    k = int(0.15 * SR)
    env = np.convolve(env, np.ones(k) / k, mode="same")
    game *= (1 - env * (1 - 10 ** (-9 / 20)))[:, None]
    music *= (1 - env * (1 - 10 ** (-10 / 20)))[:, None]   # the bed fills the silent falls between lines, and gets out of the way under them
    fx = np.zeros((n, 2), np.float32)
    wh = sfx.synth_whoosh(0.5) * 0.35
    for p in ep["pieces"]:
        if p["kind"] == "card":
            i = max(0, int((starts[p["id"]] - 0.25) * SR))
            fx[i:i + len(wh)] += wh[: n - i]
    mix = game + nar + music + fx
    sfx.write_wav(tmp / "mix.wav", mix[: int(total * SR)])
    out = HERE / "out" / f"{name}.mp4"
    out.parent.mkdir(exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(pic), "-i", str(tmp / "mix.wav"), "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}", "-movflags", "+faststart", str(out)], check=True)
    loud.master(out, -14.0, -1.5)
    # 4. chapters, description, thumbnail
    chapters = [(0.0, ep.get("intro_chapter", "Intro"))]
    for p in ep["pieces"]:
        if p.get("chapter"):
            chapters.append((starts[p["id"]], p["chapter"]))
    credit = ""
    if track:
        cat = {c["file"]: c for c in json.loads((HERE / "music" / "ncs.json").read_text())}
        credit = cat[track["file"]]["credit"]
    desc = "\n".join([ep.get("description", ""), "", *[f"{ts(a)} {c}" for a, c in chapters], "", credit, "",
                      " ".join(ep.get("hashtags", ["#minecraft"]))]).strip() + "\n"
    meta = {"title": ep.get("title"), "description": desc, "chapters": [[round(a, 2), c] for a, c in chapters],
            "duration_s": round(probe(out), 2), "pieces": {k: round(v, 3) for k, v in starts.items()},
            "music": track, "made_for_kids": False}
    (HERE / "out" / f"{name}.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    thumbnail(ep, HERE / "out" / f"{name}_thumb.jpg")
    short = [c for (a, c), (b, _) in zip(chapters, chapters[1:] + [(total, None)]) if b - a < 10]
    if short:
        print(f"WARNING chapters under 10 s (YouTube ignores the chapter list): {short}")
    print(f"wrote {out} ({total:.1f}s), {len(chapters)} chapters")
    print(desc)
