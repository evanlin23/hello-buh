"""The opening check (owner r:r0f3da0): frame 0 to 1.5 s of a finished Short, measured on the game view only.

Owner rule r:r0f3da0 (docs/lessons.md "Openings: frame 0 to 1.5 s"): frame 0 shows the Short's subject, in motion by
0.5 s; never an empty field, plain grass, a bare wall or a still room; a reaction caption, not a label. Run by
scripts/pace.py (so `./hb pace`, `./hb check`, `./hb review` and publish's gates all see it); by hand:

    python3 scripts/opening.py VIDEO [VIDEO...] [--auto-box] [--json]      # the metrics + findings per video

Checks (on the game view under the caption band, the hotbar rows left out):
  interest  the first 0.25 s (frame 0, a thumbnail's glance; its best frame): the share of the view that differs from
            its dominant colour (`busy`, contrast-normalised so a dark cave counts like a lit field) and the same in the
            middle half (`centre`, where the subject sits). Flat = centre < 0.20 and busy < 0.35: plain grass, sky, one
            texture, the subject off in a corner. BLOCK, unless the recording has a mob/player in the camera's view at
            the first tick (then WARN: it's there but too small to read).
  motion    0-0.5 s: the mean frame-to-frame change (`motion`, 0-255 grey, camera or subject) and the share of the view
            changed since frame 0 (`change`: a path drawn, a block placed). BLOCK when motion < 0.5 and change < 1.5%
            (a photo); WARN when motion < 2.0 and change < 15% (a slow drift).
  sound     a hit in 0-0.5 s no more than SOUND_DB under the clip's loudest 50 ms: WARN.
  caption   text in the top band on frame 0 (WARN if none), and the edit's caption <= 10 words (WARN).
  hold      a still stretch over HOLD_S in the first 3 s (WARN).
Calibrated 2026-11-11 on the owner's 32 reference Shorts and 24 of ours (the lead's weak/strong openers): the table is
in docs/lessons.md "Openings" and lib/hb/test/fixtures/opening_calibration.json.
"""
import json
import math
import pathlib
import re
import subprocess
import sys

import numpy as np

W, H, BAND, GAME_H = 1080, 1920, 455, 1011
FPS = 30
SW, SH = 216, 202                # analysis size of the game view (5x down)
CELL = 8                         # 8x8-pixel cells of the analysis frame: 27 x 22 after the hotbar rows go
HOTBAR = 0.12                    # the bottom 12% of the game view: the drawn HUD, the same in every Short

# thresholds (calibration in the module docstring)
GLANCE = 0.25                    # s: "frame 0" = the best frame of the first 0.25 s (a block broken on frame 3 counts)
FLAT_CENTRE, FLAT_BUSY = 0.20, 0.35   # flat: the middle half under 0.20 AND the whole view under 0.35
MOTION_S = 0.5
MOTION_MIN, CHANGE_MIN = 0.5, 0.015   # BLOCK under both (a photo); refs' slowest: motion 0.14 + a path drawn (2.8%)
SLOW_MOTION, SLOW_CHANGE = 2.0, 0.15  # WARN under both: a slow drift (4 of the owner's references are here too)
SOUND_S, SOUND_DB = 0.5, 6.0
HOLD_S, HOLD_SPAN = 1.5, 3.0
HOLD_MOTION, HOLD_CHANGE = 0.6, 0.004
CAPTION_WORDS = 10
CAPTION_INK = 0.4                # % of the band's pixels bright enough to be caption text


# ---------------------------------------------------------------- picture
def auto_box(video):
    """The game view's rows in a 1080x1920 frame for a Short not made by edit.py (the owner's references): the longest
    run of rows that aren't mostly pure black over the first 2 s."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-t", "2", "-vf", "fps=5,scale=108:192,format=gray",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    g = np.frombuffer(raw, np.uint8)[: len(raw) // (108 * 192) * 108 * 192].reshape(-1, 192, 108).astype(np.float32)
    if not len(g):
        return BAND, BAND + GAME_H
    rows = (g < 10).mean(axis=(0, 2)) < 0.5
    best, i = (0, 192), 0
    best = (0, 0)
    while i < 192:
        if rows[i]:
            j = i
            while j < 192 and rows[j]:
                j += 1
            if j - i > best[1] - best[0]:
                best = (i, j)
            i = j
        else:
            i += 1
    return (best[0] * 10, best[1] * 10) if best[1] - best[0] >= 20 else (0, H)


def frames(video, box=(BAND, BAND + GAME_H), secs=HOLD_SPAN):
    y0, y1 = box
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-t", f"{secs:.3f}", "-vf",
                          f"fps={FPS},scale={W}:{H},crop={W}:{y1 - y0}:0:{y0},scale={SW}:{SH}:flags=area,format=rgb24",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    n = len(raw) // (SW * SH * 3)
    return np.frombuffer(raw, np.uint8)[: n * SW * SH * 3].reshape(n, SH, SW, 3).astype(np.float32)


def busy(fr):
    """(whole, centre): the share of cells whose colour is far from the view's dominant (median) colour, the distance
    scaled by the view's brightness (90th percentile luma, at least 30) so a dark cave wall reads like a lit field."""
    x = fr[: int(SH * (1 - HOTBAR))]
    h, w = x.shape[0] // CELL * CELL, x.shape[1] // CELL * CELL
    s = x[:h, :w].reshape(h // CELL, CELL, w // CELL, CELL, 3).mean(axis=(1, 3))
    med = np.median(s.reshape(-1, 3), axis=0)
    scale = max(30.0, float(np.percentile(s.mean(-1), 90)))
    far = np.abs(s - med).sum(-1) / scale > 0.5
    a, b = far.shape
    return float(far.mean()), float(far[a // 4: a - a // 4, b // 4: b - b // 4].mean()), [round(float(c)) for c in med]


def hot(rgb):
    """Lava or fire as the view's main colour: the danger itself fills the frame (lava_crossing's lava sea)."""
    r, g, b = rgb
    return r > 180 and b < 90 and r - g > 60


def picture_metrics(f):
    """The opening's picture numbers from frames(): see the module docstring."""
    if len(f) < 2:
        return None
    k = max(1, int(round(GLANCE * FPS)))
    bs = [busy(x) for x in f[: k + 1]]
    g = f.mean(-1)
    step = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))           # frame to frame, 0-255
    m = int(round(MOTION_S * FPS))
    change = [float((np.abs(g[i] - g[0]) > 25).mean()) for i in range(1, min(len(g), m + 1))]
    # a still stretch: frames where almost nothing moves (the mean change and the share of pixels changing both tiny)
    still = [(step[i] < HOLD_MOTION and float((np.abs(g[i + 1] - g[i]) > 25).mean()) < HOLD_CHANGE) for i in range(len(step))]
    run = best = 0
    best_at = 0.0
    for i, s in enumerate(still):
        run = run + 1 if s else 0
        if run > best:
            best, best_at = run, (i + 1 - run) / FPS
    return {"busy0": round(bs[0][0], 3), "busy": round(max(b[0] for b in bs), 3), "centre": round(max(b[1] for b in bs), 3), "main": bs[0][2],
            "motion": round(float(step[:m].mean()), 2), "change": round(max(change) if change else 0.0, 3),
            "hold": round(best / FPS, 2), "hold_at": round(best_at, 2), "secs": round(len(f) / FPS, 2)}


def caption_ink(video, box=(0, BAND)):
    """% of the top band's pixels on frame 0 bright enough to be caption text (white or red letters on black)."""
    y0, y1 = box
    if y1 - y0 < 20:
        return 0.0
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-frames:v", "1", "-vf",
                          f"scale={W}:{H},crop={W}:{y1 - y0}:0:{y0},scale=270:{max(1, (y1 - y0) // 4)},format=rgb24", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(np.float32)
    if not len(a):
        return 0.0
    return round(float(((a.max(axis=1) > 170)).mean() * 100), 2)


# ---------------------------------------------------------------- sound
def sound_metrics(video, level=None, hop=0.01):
    """The loudest 50 ms in 0-SOUND_S against the clip's loudest (dB), and when. `level`: pace.sound()'s envelope."""
    if level is None:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                             capture_output=True).stdout
        x = np.frombuffer(raw, np.float32)
        hp, win = 160, 800
        if len(x) < win:
            return None
        n = (len(x) - win) // hp + 1
        idx = np.arange(win)[None, :] + hp * np.arange(n)[:, None]
        level = 10 * np.log10(np.mean(x[idx] ** 2, axis=1) + 1e-12)
    level = np.asarray(level)
    if not len(level):
        return None
    k = int(round(SOUND_S / hop)) + 1
    w = level[:k]
    peak = float(level.max())
    return {"hit_db": round(float(w.max()) - peak, 1), "hit_at": round(int(w.argmax()) * hop, 2), "peak_db": round(peak, 1)}


# ---------------------------------------------------------------- the verdict (pure)
def words(text):
    """Caption words: emoji and punctuation-only tokens don't count."""
    return [t for t in re.split(r"\s+", str(text or "").strip()) if re.search(r"[0-9A-Za-z]", t)]


def verdict(pm, sm=None, ink=None, caption=None, subject=None):
    """Findings [(level, check, t, msg, fix)] from the measured numbers. subject: None (no recording), [] (recording,
    nothing in view at the first tick) or the names in view."""
    F = []
    if pm:
        flat = pm["centre"] < FLAT_CENTRE and pm["busy"] < FLAT_BUSY
        nums = f"centre {pm['centre']:.2f} (min {FLAT_CENTRE:g}), whole view {pm['busy']:.2f} (min {FLAT_BUSY:g}) differs from its main colour"
        if flat and hot(pm.get("main") or (0, 0, 0)):
            F.append(("WARN", "opening", 0.0, f"frame 0 is one texture ({nums}), but it's lava/fire: the danger fills the frame. Make sure the player/subject is in it too",
                      "open with the player at the lava's edge or the subject in the middle"))
        elif flat and subject:
            F.append(("WARN", "opening", 0.0, f"frame 0 is a flat view ({nums}) though {', '.join(subject[:3])} is in the camera's view: too small or too far to read",
                      "open closer on it (FS or tighter), in the middle third"))
        elif flat:
            F.append(("BLOCK", "opening", 0.0, f"frame 0 is a flat view: one colour/texture fills it ({nums})" + (", and the recording has no mob or player in view" if subject == [] else "")
                      + ". Owner r:r0f3da0: frame 0 shows the subject, never an empty field, plain grass, a bare wall or sky",
                      "startAt where the subject (the mob, the trap, the build, the danger) is already in view, or open on the payoff's setup"))
        if pm["motion"] < MOTION_MIN and pm["change"] < CHANGE_MIN:
            F.append(("BLOCK", "opening", 0.0, f"nothing moves by {MOTION_S:g} s (motion {pm['motion']:.2f}, min {MOTION_MIN:g}; {pm['change'] * 100:.1f}% of the view changed, min {CHANGE_MIN * 100:g}%). "
                      "Owner r:r0f3da0: in motion by 0.5 s, never a still room",
                      "start mid-move (startAt a few frames into a push, a fall or a swing) or with the subject already moving"))
        elif pm["motion"] < SLOW_MOTION and pm["change"] < SLOW_CHANGE:
            F.append(("WARN", "opening", 0.0, f"a slow opening: motion {pm['motion']:.2f} over 0-{MOTION_S:g} s (strong openers 3+), {pm['change'] * 100:.0f}% of the view changed",
                      "a faster push, the subject moving, or a hit/cut in the first 0.5 s"))
        if pm["hold"] > HOLD_S:
            F.append(("WARN", "opening", pm["hold_at"], f"a {pm['hold']:.2f} s still hold at {pm['hold_at']:.2f} s in the first {HOLD_SPAN:g} s (max {HOLD_S:g} s)",
                      "cut it shorter or keep the camera/subject moving through it"))
    if sm and sm["hit_db"] < -SOUND_DB:
        F.append(("WARN", "opening", sm["hit_at"], f"no sound hit by {SOUND_S:g} s: the loudest moment there is {-sm['hit_db']:.1f} dB under the clip's peak (max {SOUND_DB:g})",
                  "a hit, a place, a hiss or the first line on frame 0-15 (the drop or an impact on the opening action)"))
    if ink is not None and ink < CAPTION_INK:
        F.append(("WARN", "opening", 0.0, f"no caption on frame 0 (the band's text covers {ink:.2f}% of it)", "show the edit's caption from frame 0"))
    n = len(words(caption)) if caption else 0
    if n > CAPTION_WORDS:
        F.append(("WARN", "opening", 0.0, f"the caption is {n} words (max {CAPTION_WORDS}; aim 3-7): \"{caption}\"", "cut it to a short reaction (\"Am i cooked?\", \"bro found dirt for ONCE\")"))
    return F


def summary(m):
    p, s = m.get("picture") or {}, m.get("sound") or {}
    return (f"opening (r:r0f3da0): frame 0 centre {p.get('centre')} / view {p.get('busy')} busy; 0-{MOTION_S:g} s motion {p.get('motion')}, "
            f"{(p.get('change') or 0) * 100:.0f}% changed; longest still {p.get('hold')} s; sound hit {s.get('hit_db')} dB at {s.get('hit_at')} s; caption ink {m.get('caption_ink')}%")


def measure(video, box=None, level=None):
    box = box or (BAND, BAND + GAME_H)
    pm = picture_metrics(frames(video, box))
    sm = sound_metrics(video, level)
    ink = caption_ink(video, (0, box[0]))
    return {"picture": pm, "sound": sm, "caption_ink": ink, "box": list(box)}


# ---------------------------------------------------------------- the recording (optional): who is in view at the first tick
IGNORE = {"item", "experience_orb", "arrow", "armor_stand", "item_frame", "marker", "area_effect_cloud", "lightning_bolt",
          # ambient mobs: a squid 30 blocks out in the ocean isn't the Short's subject (rainbow_wool)
          "squid", "glow_squid", "salmon", "cod", "tropical_fish", "pufferfish", "bat"}


def in_view_names(rec, tick, cone=35.0, max_d=48.0):
    """Mobs, players (not the camera's own), falling blocks and lit TNT within `cone` degrees of the camera's look at `tick` (pose_cam's camera)."""
    P = rec.get("poses") or []
    if not P:
        return []
    q = P[max(0, min(len(P) - 1, int(round(tick))))]
    cam = (q[1], q[2] + (1.27 if (len(q) > 7 and (q[7] or 0) & 1) else 1.62), q[3], q[4], q[5])
    v = (-math.sin(cam[3]) * math.cos(cam[4]), math.sin(cam[4]), -math.cos(cam[3]) * math.cos(cam[4]))
    me = (rec.get("user") or "").lower()
    names, best = {}, {}
    for e in rec.get("entities") or []:
        if not isinstance(e, list) or len(e) < 6 or abs(e[0] - tick) > 0.5:
            continue
        kind = str(e[2])
        if kind in IGNORE or kind.endswith("_display"):
            continue
        meta = e[9] if len(e) > 9 and isinstance(e[9], dict) else {}
        if kind == "player" and str(meta.get("user", "")).lower() == me:
            continue
        dx, dy, dz = e[3] - cam[0], e[4] + 0.9 - cam[1], e[5] - cam[2]
        d = math.sqrt(dx * dx + dy * dy + dz * dz)
        if d < 0.5 or d > max_d:
            continue
        if (dx * v[0] + dy * v[1] + dz * v[2]) / d >= math.cos(math.radians(cone)):
            names[e[1]] = kind.replace("_", " ")
            best[e[1]] = d
    return [f"{names[i]} ({best[i]:.0f} blocks)" for i in sorted(names, key=lambda i: best[i])]


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("videos", nargs="+")
    ap.add_argument("--auto-box", action="store_true", help="find the game view (a Short not made by edit.py)")
    ap.add_argument("--caption", help="the edit's caption (word count)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    bad = 0
    for v in a.videos:
        m = measure(v, auto_box(v) if a.auto_box else None)
        F = verdict(m["picture"], m["sound"], m["caption_ink"], a.caption)
        nb = sum(f[0] == "BLOCK" for f in F)
        bad += bool(nb)
        if a.json:
            print(json.dumps({"video": v, **m, "findings": F, "ok": not nb}))
        else:
            p, s = m["picture"] or {}, m["sound"] or {}
            print(f"{pathlib.Path(v).name[:40]:40s} busy {p.get('busy')} centre {p.get('centre')} motion {p.get('motion')} change {p.get('change')} "
                  f"hold {p.get('hold')} hit {s.get('hit_db')} dB @{s.get('hit_at')} ink {m['caption_ink']}: {'FAIL' if nb else 'ok'}")
            for f in F:
                print(f"    {f[0]:<5} {f[3]}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
