"""The live overlay of the vertical long-form / live formats (owner 2026-11-14, r:r584b30; docs/livestream.md).

    python3 scripts/live_overlay.py <stunt> --video out/<name>.mp4 --rec work/<name>.rec.json [--out FILE]

Only for stunts with a `live` block (stunts/live_*.js); a Short never has one, and scripts/finish_render.sh calls this
only when the stunt does. It takes the finished edit (1080x1920, the Shorts layout) and draws, from the recording's
stream-clock marks (lib/live.js: `live` {clock, rate}, `live_target` {label, red, at}, `live_count` {n},
`live_stat` {label, value}):
  top band     the current target's line ("THIS HOUSE EXPLODES IN", its `red` words in red) over a big countdown to
               it in the game's font (M:SS, H:MM:SS over an hour), red with a white flash each second in the last
               minute, 0:00 once it's due. No target marks: live.title over a countdown to the stream's end
  bottom band  the counter (live.counter: "TNT" with the TNT icon, "+1" pops as they go down; hidden while n is
               null), the long countdown (live.final: "WHOLE VILLAGE 4:42:00", hidden when the target is the end),
               and the stat line ("HOUSES LEFT 7"), all in the band's top half (the Shorts player's title and a
               live's chat cover the bottom)
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
import retention  # noqa: E402  (the x264 settings of every full-video encode)
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


def ms(s):
    """M:SS under an hour (a round's countdown), H:MM:SS over."""
    s = max(0, int(math.ceil(s - 1e-6)))
    return hms(s) if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def last(marks, times, tick):
    i = bisect.bisect_right(times, tick) - 1
    return marks[i] if i >= 0 else None


def frame_states(stunt, rec, conf, fps, n):
    """Per output frame: a dict of what the bands show (clock, the target, the counter and its last step, the stat)."""
    ck = hb_time.Clock(stunt, rec)
    tl = rec.get("timeline", [])
    def marks(ev):
        m = sorted(((e["t"] / 50, e) for e in tl if e["event"] == ev), key=lambda x: x[0])
        return [x[1] for x in m], [x[0] for x in m]
    cm, ct = marks("live")
    tm, tt = marks("live_target")
    nm, nt = marks("live_count")
    sm, st = marks("live_stat")
    gm, gt = marks("live_goal")
    if not cm:
        sys.exit("live_overlay: the recording has no `live` clock marks (lib/live.js L.clock)")
    stream = conf.get("stream", 8 * 3600)
    out, prev = [], None
    for f in range(n):
        tick = ck.at_out(f / fps)["tick"]
        if tick is None:
            out.append(prev)
            continue
        c = last(cm, ct, tick) or cm[0]
        clock = c["clock"] + c.get("rate", 1) * (tick - c["t"] / 50) / 20
        tg = last(tm, tt, tick)
        target = (tg["label"], tg.get("red", ""), tg["at"]) if tg else (conf.get("title", ""), conf.get("red", ""), stream)
        j = bisect.bisect_right(nt, tick) - 1
        cnt = nm[j].get("n") if j >= 0 else None
        step = (nm[j]["n"] - nm[j - 1]["n"]) if j >= 1 and nm[j].get("n") is not None and nm[j - 1].get("n") is not None else 0
        since = (tick - nt[j]) / 20 if j >= 0 else 99
        sv = last(sm, st, tick)
        gv = last(gm, gt, tick)
        prev = {"clock": clock, "stream": stream, "target": target, "count": cnt, "step": step, "since": since,
                "stat": (sv["label"], sv["value"]) if sv else None, "goal": gv["of"] if gv else None}
        out.append(prev)
    first = next((x for x in out if x), None)
    return [x or first for x in out]


def state_key(st):
    label, red, at = st["target"]
    left = at - st["clock"] if at is not None else None
    flash = round((math.ceil(left) - left) * 20) if left is not None and 0 < left <= 60.5 else 0
    fin = ms(st["stream"] - st["clock"]) if at is not None and at < st["stream"] else None
    pop = (st["step"], round(st["since"] * 20)) if 0 < st["step"] <= 9 and st["since"] < 0.5 else None
    pct = goal_pct(st)
    gflash = round(st["since"] * 20) % 10 if pct is not None and pct >= 100 else 0
    return (label, red, ms(left) if left is not None else None, flash, fin, st["count"], pop, st["stat"], st.get("goal"), pct, gflash)


def goal_pct(st):
    """The goal mode's big number: n of the goal, in whole percent (99% until the last one is down)."""
    g, n = st.get("goal"), st["count"]
    if not g or n is None:
        return None
    return 100 if n >= g else min(99, int(100 * n / g))


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
        self.tops = {}

    def top(self, label, red):
        """The top band without the countdown: opaque black, the target's line (cached per line)."""
        if (label, red) in self.tops:
            return self.tops[(label, red)]
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rectangle((0, 0, W, BAND), fill=(0, 0, 0, 255))
        font = self.font_title
        while d.textlength(label, font=font) > W - 80 and font.size > 36:
            font = ImageFont.truetype(E.FONT, font.size - 4)
        reds = set(w.upper() for w in (red or "").split())
        words = label.split()
        widths = [d.textlength(w + " ", font=font) for w in words]
        x = (W - sum(widths) + d.textlength(" ", font=font)) / 2
        for w, ww in zip(words, widths):
            col = RED if w.strip(".,!?:").upper() in reds else WHITE
            d.text((x, 88 + (60 - font.size) // 2), w, font=font, fill=col, stroke_width=4, stroke_fill=(0, 0, 0, 255))
            x += ww
        self.tops[(label, red)] = img
        return img

    def big(self, img, txt, y, col, max_w=920, max_s=24):
        tw = E.text_width(self.jar, txt)
        S = max(8, min(max_s, max_w // max(1, tw)))
        sh = max(3, S // 3)   # a thin drop shadow (the game's own is a whole pixel: S px at this size)
        E.draw_text(img, self.jar, txt, W // 2 + sh, y + sh, scale=S, color=tuple(int(v * 0.22) for v in col[:3]) + (255,), center=True, shadow_on=False)
        E.draw_text(img, self.jar, txt, W // 2, y, scale=S, color=col, center=True, shadow_on=False)

    def paint(self, st, path):
        label, red, at = st["target"]
        img = self.top(label, red).copy()
        clock, stream = st["clock"], st["stream"]
        if at is not None:   # the countdown to the current target
            left = at - clock
            col = WHITE
            if left <= 60.5:   # the last minute: red, a white flash on each new second; 0:00 once due
                frac = (math.ceil(left) - left) if left > 0 else 1
                k = max(0.0, 1 - frac / 0.35) if left > 0 else 0
                col = tuple(int(RED[i] + (255 - RED[i]) * k) for i in range(3)) + (255,)
            self.big(img, ms(left), 180, col)
        elif goal_pct(st) is not None:   # the goal mode: n of the goal in percent; 100% flashes red
            pct = goal_pct(st)
            col = WHITE if pct < 100 else (RED if int(st["since"] * 4) % 2 == 0 else WHITE)
            self.big(img, f"{pct}%", 180, col, max_s=22)
        y0 = BAND + GAME_H + 22
        cnt = st["count"]
        name = self.conf.get("counter", "")
        if cnt is not None:   # the counter row
            num = f"{cnt:,}" + (f" / {st['goal']:,}" if st.get("goal") else "")
            S2 = 8
            nw = E.text_width(self.jar, num) * S2
            lw = E.text_width(self.jar, " " + name) * 5 if name else 0
            iw = self.icon.width + 22 if self.icon else 0
            x = (W - (iw + nw + lw)) // 2
            if self.icon:
                img.alpha_composite(self.icon, (x, y0 + (8 * S2 - self.icon.height) // 2))
                x += iw
            E.draw_text(img, self.jar, num, x, y0, scale=S2)
            if name:
                E.draw_text(img, self.jar, " " + name, x + nw, y0 + 8 * S2 - 8 * 5, scale=5, color=GREY)
            if 0 < st["step"] <= 9 and st["since"] < 0.5:   # "+1" as one goes down, fading up and out
                a = int(255 * (1 - st["since"] / 0.5))
                E.draw_text(img, self.jar, f"+{st['step']}", x + nw + lw + 18, y0 - int(30 * st["since"]), scale=5, color=(85, 255, 85, a), shadow_on=False)
        y1 = y0 + 8 * 8 + 26
        final = self.conf.get("final")
        if final and at is not None and at < stream:   # the long countdown, small
            txt = f"{final}: {hms(stream - clock)}"
            E.draw_text(img, self.jar, txt, W // 2, y1, scale=5, color=(255, 200, 70, 255), center=True)
            y1 += 8 * 5 + 18
        if st["stat"]:
            E.draw_text(img, self.jar, f"{st['stat'][0]}: {st['stat'][1]}", W // 2, y1, scale=4, color=GREY, center=True)
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
            key = state_key(st)
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
               "-c:v", "libx264", *retention.x264(dur), "-c:a", "copy", "-movflags", "+faststart", str(dst)]
        subprocess.run(cmd, check=True)
        shutil.move(str(dst), str(out))
        print("live_overlay: wrote", out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
