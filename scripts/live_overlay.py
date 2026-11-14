"""The live overlay of the vertical long-form / live formats (owner 2026-11-14, r:r584b30; docs/livestream.md).

    python3 scripts/live_overlay.py <stunt> --video out/<name>.mp4 --rec work/<name>.rec.json [--out FILE]

Only for stunts with a `live` block (stunts/live_*.js); a Short never has one, and scripts/finish_render.sh calls this
only when the stunt does. It takes the finished edit (1080x1920, the Shorts layout) and draws, from the recording's
stream-clock marks (lib/live.js: `live` {clock, rate}, `live_count` {n}):
  top band     the stream's promise (live.title, live.red in red) over a big countdown in the game's font,
               H:MM:SS to the stream's end (live.stream s), red with a pulse in the last minute, 0:00:00 at the payoff
  bottom band  the counter (live.counter: "TNT" with the TNT icon, "+1" pops as they go down) and a progress bar
               "HOUR 4 OF 8", kept in the band's top half (the Shorts player's title and chat cover the bottom)
The top band is redrawn opaque over the edit's caption. The picture and the sound are otherwise untouched.
"""
import argparse
import bisect
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import zipfile

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
sys.path.insert(0, str(HERE))
import hb_time  # noqa: E402
import edit as E  # noqa: E402  (layout constants, the game font, item icons)
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

W, H, BAND, GAME_H = E.W, E.H, E.BAND, E.GAME_H
RED = (235, 40, 40, 255)
WHITE = (255, 255, 255, 255)
GREY = (170, 170, 170, 255)


def live_conf(stunt):
    r = subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{stunt}').live||null))"], cwd=HERE,
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def probe(video):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                        "stream=r_frame_rate,nb_read_packets", "-of", "json", str(video)], capture_output=True, text=True, check=True)
    s = json.loads(r.stdout)["streams"][0]
    a, b = s["r_frame_rate"].split("/")
    return float(a) / float(b), int(s["nb_read_packets"])


def hms(s):
    s = max(0, int(math.ceil(s - 1e-6)))
    return f"{s // 3600}:{s // 60 % 60:02d}:{s % 60:02d}"


def frame_states(stunt, rec, conf, fps, n):
    """One (countdown seconds left, clock, count, count step, seconds since the count changed) per output frame."""
    ck = hb_time.Clock(stunt, rec)
    tl = rec.get("timeline", [])
    cm = sorted((e["t"] / 50, e["clock"], e.get("rate", 1)) for e in tl if e["event"] == "live")
    nm = sorted((e["t"] / 50, e["n"]) for e in tl if e["event"] == "live_count")
    if not cm:
        sys.exit("live_overlay: the recording has no `live` clock marks (lib/live.js L.clock)")
    ct, nt = [m[0] for m in cm], [m[0] for m in nm]
    stream = conf.get("stream", 8 * 3600)
    out, last = [], None
    for f in range(n):
        r = ck.at_out(f / fps)
        tick = r["tick"]
        if tick is None:
            out.append(last)
            continue
        i = max(0, bisect.bisect_right(ct, tick) - 1)
        t0, c0, rate = cm[i]
        clock = c0 + rate * (tick - t0) / 20
        j = bisect.bisect_right(nt, tick) - 1
        cnt = nm[j][1] if j >= 0 else None
        step = (nm[j][1] - nm[j - 1][1]) if j >= 1 else 0
        since = (tick - nm[j][0]) / 20 if j >= 0 else 99
        last = (stream - clock, clock, cnt, step, since)
        out.append(last)
    first = next((s for s in out if s), None)
    return [s or first for s in out]


class Painter:
    def __init__(self, conf):
        self.conf = conf
        self.jar = zipfile.ZipFile(E.CLIENT_JAR)
        self.font_title = ImageFont.truetype(E.FONT, 60)
        self.icon = None
        icon_name = conf.get("icon")
        if icon_name:
            try:
                ic = E.item_icon(self.jar, icon_name)
                self.icon = ic.resize((ic.width * 2, ic.height * 2), Image.NEAREST) if ic else None
            except Exception as e:  # an icon is decoration only
                print("live_overlay: no icon", icon_name, e)
        self.base = self.top_base()

    def top_base(self):
        """The top band without the countdown: opaque black, the promise line."""
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rectangle((0, 0, W, BAND), fill=(0, 0, 0, 255))
        title, red = self.conf.get("title", ""), self.conf.get("red", "")
        words = title.split()
        widths = [d.textlength(w + " ", font=self.font_title) for w in words]
        x = (W - sum(widths) + d.textlength(" ", font=self.font_title)) / 2
        for w, ww in zip(words, widths):
            col = RED if red and w.strip(".,!?").upper() in red.upper().split() else WHITE
            d.text((x, 88), w, font=self.font_title, fill=col, stroke_width=4, stroke_fill=(0, 0, 0, 255))
            x += ww
        return img

    def paint(self, st, path):
        left, clock, cnt, step, since = st
        img = self.base.copy()
        # the countdown: the game's font, as wide as fits
        txt = hms(left)
        tw = E.text_width(self.jar, txt)
        S = max(8, min(24, 920 // max(1, tw)))
        col = WHITE
        if left <= 60.5:   # the last minute: red, a white flash on each new second
            frac = (math.ceil(left) - left) if left > 0 else 1
            k = max(0.0, 1 - frac / 0.35) if left > 0 else 0
            col = tuple(int(RED[i] + (255 - RED[i]) * k) for i in range(3)) + (255,)
        sh = max(3, S // 3)   # a thin drop shadow (the game's own is a whole pixel: S px at this size)
        E.draw_text(img, self.jar, txt, W // 2 + sh, 180 + sh, scale=S, color=tuple(int(v * 0.22) for v in col[:3]) + (255,), center=True, shadow_on=False)
        E.draw_text(img, self.jar, txt, W // 2, 180, scale=S, color=col, center=True, shadow_on=False)
        # the counter row in the bottom band's top half
        y0 = BAND + GAME_H + 26
        name = self.conf.get("counter", "")
        if cnt is not None:
            num = f"{cnt:,}"
            S2 = 9
            nw = E.text_width(self.jar, num) * S2
            lw = E.text_width(self.jar, " " + name) * 6 if name else 0
            iw = self.icon.width + 24 if self.icon else 0
            x = (W - (iw + nw + lw)) // 2
            if self.icon:
                img.alpha_composite(self.icon, (x, y0 + (8 * S2 - self.icon.height) // 2))
                x += iw
            E.draw_text(img, self.jar, num, x, y0, scale=S2)
            if name:
                E.draw_text(img, self.jar, " " + name, x + nw, y0 + 8 * S2 - 8 * 6, scale=6, color=GREY)
            if 0 < step <= 9 and since < 0.5:   # "+1" as one goes down, fading up and out
                a = int(255 * (1 - since / 0.5))
                E.draw_text(img, self.jar, f"+{step}", x + nw + lw + 18, y0 - int(30 * since), scale=6, color=(85, 255, 85, a), shadow_on=False)
        # the stream's progress: "HOUR 4 OF 8" over a bar
        stream = self.conf.get("stream", 8 * 3600)
        hours = max(1, round(stream / 3600))
        frac = min(1.0, max(0.0, clock / stream))
        by = y0 + 8 * 9 + 34
        d = ImageDraw.Draw(img)
        bx0, bx1 = 110, W - 110
        d.rectangle((bx0 - 4, by - 4, bx1 + 4, by + 30), fill=(0, 0, 0, 255), outline=(90, 90, 90, 255), width=4)
        d.rectangle((bx0, by, bx0 + int((bx1 - bx0) * frac), by + 26), fill=(222, 56, 40, 255))
        label = f"HOUR {min(hours, int(clock // 3600) + 1)} OF {hours}" if frac < 1 else self.conf.get("done", "NOW")
        E.draw_text(img, self.jar, label, W // 2, by + 44, scale=4, color=GREY, center=True)
        img.save(path)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("stunt")
    ap.add_argument("--video", required=True)
    ap.add_argument("--rec", required=True)
    ap.add_argument("--out")
    a = ap.parse_args()
    conf = live_conf(a.stunt)
    if not conf:
        sys.exit(f"live_overlay: stunts/{a.stunt}.js has no `live` block (only the live formats get the overlay)")
    rec = hb_time.load_rec(a.rec)
    fps, n = probe(a.video)
    states = frame_states(a.stunt, rec, conf, fps, n)
    P = Painter(conf)
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="live_ov_"))
    try:
        cache = {}
        for f, st in enumerate(states):
            left, clock, cnt, step, since = st
            key = (hms(left), round((math.ceil(left) - left) * 20) if left <= 60.5 else 0, int(clock // 36), cnt,
                   step if since < 0.5 else 0, round(since * 20) if since < 0.5 else 0)
            if key not in cache:
                p = tmp / f"u{len(cache):05d}.png"
                P.paint(st, p)
                cache[key] = p
            os.link(cache[key], tmp / f"f{f:05d}.png")
        print(f"live_overlay: {n} frames, {len(cache)} distinct overlays")
        out = pathlib.Path(a.out or a.video)
        dst = tmp / "out.mp4"
        dur = n / fps
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", a.video, "-framerate", f"{fps:g}", "-i", str(tmp / "f%05d.png"),
               "-filter_complex", "[0:v][1:v]overlay=0:0:eof_action=pass:format=auto,format=yuv420p[v]", "-map", "[v]", "-map", "0:a?",
               "-c:v", "libx264", *E.retention.x264(dur), "-c:a", "copy", "-movflags", "+faststart", str(dst)]
        subprocess.run(cmd, check=True)
        shutil.move(str(dst), str(out))
        print("live_overlay: wrote", out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
