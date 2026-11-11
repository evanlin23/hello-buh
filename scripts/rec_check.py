"""Recording check: catch what reviewers flag from the recording alone, BEFORE the 25+ minute render.

  python3 scripts/rec_check.py <stunt> [work/<name>.rec.json | recording.json.gz] [--stunt-file F] [--story-dir D]

Reads the recording and the stunt's `edit` block, and works in OUTPUT time: the same speed/cut/slow-mo spans
as edit.py (scripts/timewarp.py), the same trim (startAt/start/endAfter), the same camera as render.js (cut
snaps, the eased crouch height). Times are printed as seconds of the Short (after a hook preview, if any) with
the source time and the marks nearby. BLOCKERs are things reviewers send back every time; WARNINGs need a look
(say why they're fine, or fix them). Exit code 1 if there is any blocker, 2 if the check couldn't run.
A published Short: python3 scripts/rec_check.py <name> --package ../hb-videos/shorts/<name> (its recording, source and edit).

Checks (ranked by how often reviews flagged them):
  1. cuts      around every hard cut (a teleport, a speed "cut" span, a respawn): the first frames after the cut
               must already be the new shot's pose (no second jump, no 1-3 frame snap of the aim or the position,
               no stand-up/crouch); no whip in the last frames before it; a time-of-day change lands ON a cut.
               Also teleports under 4 blocks with no `cut` mark (the renderer glides them). And a time-lapse's jump cuts
               (a speed "cut" between two sped-up spans, no teleport): the camera turns <= 6 deg, moves <= 3 blocks and
               <= 1.5 up/down across each (owner r:r200cfe; scripts/lapse_cuts.py).
  1b. cast     a cast member that jumps over 0.5 block 1-4 ticks after a cut's frame (the new shot opens on it in the
               old spot), or moves in stair steps (holds 2+ ticks, then moves, again and again: under 20 Hz, it reads as
               teleporting). scripts/cast_motion.py; the kit (K.actor, K.cutShot) makes both right by construction.
  2. held      stretches of 0.6 s+ in output time where the camera barely moves and nothing else does (mobs in
               view, block changes in view, particles, caption/card/overlay changes). And the ending: <= 1.0 s
               after the payoff mark (1.8 s for a text payoff: a death message, a card, a story caption).
  3. turns     big camera turns (scripts/beat_audit.py camera_turns): each needs an on-screen reason.
  4. set       visible falling blocks with nothing under them (floating sand/gravel) and liquids that should
               have flowed (a source with air beside it, water over air) near the camera (scripts/rec_world.js).
               And terrain still standing inside a set's cleared box (lib/story.js clearSet records it): stone,
               dirt, snow, gravel... over the set floor, in view (a /fill layer that failed left a hill in the set).
               If this check can't run (no node_modules, an exception) the report says so: the last line is
               "OK, BUT THE SET CHECK DID NOT RUN", and with --strict / REC_CHECK_STRICT=1 the exit code is 2.
  5. vanilla   digs faster than the held tool allows (dig/dig_end marks), mobs faster than vanilla, the player
               faster than sprint-jumping outside cuts.
  5c. sight   a clear line of sight to every dig and place (STANDARDS 3b.4, scripts/rec_sight.js): no face of the
               block (a place: the clicked face of a block it goes against) visible from the eye, or the crosshair
               hitting another block first
  5d. aim     the crosshair on every action (r:rffba12, scripts/owner_checks.py + lib/aim.js): a place, break, block or
               entity use (dye, shear, name tag) over 15 deg off its target or off-screen, or over 10% of them past 6 deg
  5e. settle  no hard cut or end while falling blocks, explosion debris or a dying mob still move in view
               (r:r24d99a, scripts/owner_checks.py)
  6-9. the owner's notes (2026-11-10), from `./hb owner` (lib/hb/owner.js; --no-owner skips them):
     flat      a story shot whose visible world is mostly a flat cleared plain (and the set's footprint and relief)
     subject   a line names a subject (lines[].look, or TORCH / MOM / LIBRARIAN...) and the camera isn't on it
     sync      an action before the word that announces it, a fall with no cause, "never X" over X
     glitch    doors moving by themselves, the player stuck on a block, camera jitter / one-tick snaps / stutter,
               fog / night / rain the story promises and the recording lacks
"""
import argparse
import contextlib
import io
import json
import math
import os
import pathlib
import subprocess
import sys
from bisect import bisect_left, bisect_right

HERE = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE / "scripts"))
from beat_audit import SKIP, camera_turns, edit_config, load_rec, payoff_report, trim_start  # noqa: E402
from timewarp import Warp, edit_spans  # noqa: E402
import owner_checks as OC  # noqa: E402

FPS = 60
EYE = 1.62
TAU = 2 * math.pi
# marks that say nothing about the story (left out of "near:")
NOISE = (SKIP - {"line", "cut", "start", "end"}) | {"vel", "slot", "health", "hurt", "mob_hurt", "swing", "xp", "effect", "effect_end", "hurt_dir", "block_action",
                "block_entity", "collect", "aim", "place", "tick", "use_start", "use_stop", "keep_inventory", "ent_swing",
                "death_message", "weather", "time", "dig", "dig_end", "pose", "mob_death", "cart_primed", "face_on", "face_off"}


def wrap(a):
    while a > math.pi:
        a -= TAU
    while a < -math.pi:
        a += TAU
    return a


class Camera:
    """render.js camAtLive without the view bob and the slow-pan smoothing: position, aim and eye height at a
    (fractional) tick, with the same cut rules (isCutStep: a step over 4 blocks, or over 0.8 blocks / 20
    degrees within 4 ticks after a cut or respawn mark, snaps; the tick before a cut extrapolates)."""

    def __init__(self, rec):
        self.P = P = rec["poses"]
        tl = rec.get("timeline", [])
        self.cut_marks = sorted(e["t"] / 50 for e in tl if e["event"] in ("cut", "respawn"))
        n = len(P)
        self.cutstep = [False] * n
        for i in range(n - 1):
            self.cutstep[i] = self._is_cut_step(i, P[i], P[i + 1])
        self.eyeh, eh = [], EYE
        for q in P:
            fl = q[7] if len(q) > 7 else 0
            eh += ((1.27 if (fl or 0) & 1 else EYE) - eh) * 0.5
            self.eyeh.append(eh)

    def _is_cut_step(self, i, a, b):
        d = math.dist(a[1:4], b[1:4])
        if d > 4:
            return True
        j = bisect_left(self.cut_marks, i + 1 - 4 - 1e-9)
        if not (j < len(self.cut_marks) and self.cut_marks[j] <= i + 1 + 1e-9):
            return False
        return d > 0.8 or abs(wrap(b[4] - a[4])) > 0.35 or abs(b[5] - a[5]) > 0.35

    def at(self, t):
        P = self.P
        i = min(len(P) - 2, max(0, int(math.floor(t))))
        a, b = P[i], P[i + 1]
        if self.cutstep[i]:
            p0 = P[i - 1] if i > 0 else None
            if p0 is not None and not self.cutstep[i - 1]:
                b = [a[0]] + [a[k] + (a[k] - p0[k]) for k in range(1, 6)]
            else:
                b = a
        f = min(1.0, max(0.0, t - i))
        e0, e1 = self.eyeh[i], self.eyeh[min(len(P) - 1, i + 1)]
        return (a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f,
                a[4] + wrap(b[4] - a[4]) * f, a[5] + (b[5] - a[5]) * f, e0 + (e1 - e0) * f)


def view_dir(yaw, pitch):
    return (-math.sin(yaw) * math.cos(pitch), math.sin(pitch), -math.cos(yaw) * math.cos(pitch))


def ang_between(c0, c1):
    """Degrees between two cameras' view directions."""
    a, b = view_dir(c0[3], c0[4]), view_dir(c1[3], c1[4])
    return math.degrees(math.acos(max(-1.0, min(1.0, sum(x * y for x, y in zip(a, b))))))


def in_view(cam, x, y, z, max_d, cone=40):
    dx, dy, dz = x - cam[0], y - (cam[1] + cam[5]), z - cam[2]
    d = math.sqrt(dx * dx + dy * dy + dz * dz)
    if d > max_d:
        return False
    if d < 1.5:
        return True
    v = view_dir(cam[3], cam[4])
    return (dx * v[0] + dy * v[1] + dz * v[2]) / d >= math.cos(math.radians(cone))


class Report:
    def __init__(self):
        self.items = []

    def add(self, level, check, t, msg, near=""):
        self.items.append((level, check, t, msg, near))


HOTBAR_MIN = 7        # filled slots (lib/story.js HOTBAR_MIN; docs/STANDARDS.md 3.6)
HOTBAR_MAX_LOW = 0.2  # the share of first-person frames allowed under it


def hotbar_coverage(tl, frames):
    """The hotbar check (STANDARDS 3.6; owner 2026-11-10: "fill our hotbar with like ridiculous items"): frames is
    [(source tick, hud_visible)] per output frame. Only frames where the HUD is on screen count (not a camera shot,
    F1, the death screen or an open container). -> {visible, low, frac, min_filled, first_low}: low = visible frames
    whose last 'hotbar' mark has fewer than HOTBAR_MIN filled slots (none at all counts as 0)."""
    bars = sorted((e["t"] / 50, sum(1 for x in (e.get("items") or []) if x)) for e in tl if e.get("event") == "hotbar")
    bt = [b[0] for b in bars]
    vis = low = 0
    mn, first = None, None
    for tick, shown in frames:
        if not shown:
            continue
        vis += 1
        k = bisect_right(bt, tick + 1e-9) - 1
        n = bars[k][1] if k >= 0 else 0
        mn = n if mn is None else min(mn, n)
        if n < HOTBAR_MIN:
            low += 1
            if first is None:
                first = tick
    return {"visible": vis, "low": low, "frac": low / vis if vis else 0.0, "min_filled": mn, "first_low": first}


def stunt_hud(stunt, stunt_file):
    """stunt.hud (false: no HUD anywhere in the Short)."""
    mod = stunt_file or str(HERE / "stunts" / f"{stunt}.js")
    try:
        js = "const m=require(process.argv[1]);process.stdout.write(JSON.stringify(m.hud===undefined?null:m.hud))"
        return json.loads(subprocess.run(["node", "-e", js, os.path.abspath(mod)], capture_output=True, text=True, check=True, cwd=HERE).stdout or "null")
    except Exception:
        return None


def camera_shot_spans(stunt, stunt_file, tl):
    """[(tick0, tick1)] where a camera shot (not a POV one) is on screen: each 'shot' mark to the next."""
    marks = [(e["t"] / 50, e.get("name")) for e in tl if e["event"] == "shot"]
    if not marks:
        return []
    mod = stunt_file or str(HERE / "stunts" / f"{stunt}.js")
    try:
        js = "const m=require(process.argv[1]);process.stdout.write(JSON.stringify(m.shots||{}))"
        shots = json.loads(subprocess.run(["node", "-e", js, os.path.abspath(mod)], capture_output=True, text=True, check=True).stdout or "{}")
    except Exception:
        shots = {}
    out = []
    for k, (t0, name) in enumerate(marks):
        t1 = marks[k + 1][0] if k + 1 < len(marks) else 1e9
        if not (shots.get(name) or {}).get("pov"):
            out.append((t0, t1))
    return out


# ---------------------------------------------------------------- 5c. sight: line of sight to every dig and place
# (owner, 2026-11-10: "we need to ensure there is a clear line of sight to the stuff we are placing or breaking",
# STANDARDS 3b.4). The geometry is lib/sight.js (what K.dig / K.place aim with), run over the recording by
# scripts/rec_sight.js. Kept apart from the other checks.
NOISE |= {"place_on"}   # the kit's mark for K.place (which block it went against): not a story beat


def sight_findings(rec_p):
    """scripts/rec_sight.js over the recording -> {digs, places, found: [...], aim} or {error} (scripts/owner_checks.py)."""
    return OC.sight_json(rec_p)


def sight_findings_msgs(res):
    """rec_sight.js findings -> [(level, source tick, message)]. A hidden block, a crosshair through another block on 3+
    ticks of a dig or on a place's swing: BLOCK; 1-2 ticks of a dig, or a place guessed from a swing (no place mark): WARN."""
    out = []
    for f in res.get("found", []):
        b = f.get("blocker")
        by = f"{b['name']} at {b['x']} {b['y']} {b['z']}" if b else "nothing faces the eye"
        what = f"{'breaking' if f['kind'] == 'dig' else 'placing'} {f['block'] if f['block'] != 'block' else 'a block'} at {f['x']} {f['y']} {f['z']}"
        if f["problem"] == "hidden":
            on = f" (against {', '.join(f['against'])})" if f.get("against") else ""
            msg = f"{what}{on}: no face of it is visible from the eye, {by} is in the way"
            lvl = "BLOCK"
        else:
            msg = f"{what}: the crosshair hits {by} first" + (f" on {f['n']}/{f['of']} ticks of the dig" if f["kind"] == "dig" else " on the swing")
            lvl = "BLOCK" if f["kind"] == "place" or f["n"] >= 3 else "WARN"
        if f.get("source") == "inferred":
            lvl = "WARN"
            msg += " (a place guessed from a swing and a new block: K.place marks its own)"
        out.append((lvl, f["tick"], msg + ": stand where the eye sees it, or let A.place / A.dig (lib/act.js) or K.dig / K.place pick the face (STANDARDS 3b.4)"))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("stunt")
    ap.add_argument("rec", nargs="?", help="recording (default work/<stunt>.rec.json; .gz works)")
    ap.add_argument("--stunt-file", help="the stunt module (default stunts/<stunt>.js; e.g. a package's source/<name>.js)")
    ap.add_argument("--story-dir", help="stories/<name> with voice/voice.json, for the caption times (default: the edit's `story`)")
    ap.add_argument("--radius", type=int, default=16, help="set check: blocks from the camera (default 16)")
    ap.add_argument("--no-world", action="store_true", help="skip the set check (chunk scan, the slow part)")
    ap.add_argument("--no-owner", action="store_true", help="skip the owner-note checks (./hb owner; hb check runs them itself)")
    ap.add_argument("--strict", action="store_true", default=os.environ.get("REC_CHECK_STRICT") == "1",
                    help="exit 2 when a check could not run (default with REC_CHECK_STRICT=1)")
    ap.add_argument("--summary", help="write the aim and settle results (and every finding) as JSON here (scripts/gates.py, ./hb review)")
    ap.add_argument("--package", help="a videos-branch package (shorts/<name>): its recording.json.gz, source/<name>.js and the "
                    "edit it was published with (metadata.json), for checking published Shorts")
    a = ap.parse_args()
    if a.package:
        pk = pathlib.Path(a.package)
        a.rec = a.rec or str(pk / "recording.json.gz")
        if not a.stunt_file and (pk / "source" / f"{a.stunt}.js").exists():
            a.stunt_file = str(pk / "source" / f"{a.stunt}.js")
        meta = json.loads((pk / "metadata.json").read_text()) if (pk / "metadata.json").exists() else {}
        if isinstance(meta.get("edit"), dict):   # the edit as published wins over the source's (a lib may have changed since)
            os.environ["EDIT_EXTRA"] = json.dumps({**{k: v for k, v in meta["edit"].items() if k != "args"}, **json.loads(os.environ.get("EDIT_EXTRA") or "{}")})

    rec_p = pathlib.Path(a.rec) if a.rec else HERE / "work" / f"{a.stunt}.rec.json"
    if not rec_p.exists():
        sys.exit(f"rec_check: no recording at {rec_p}")
    rec = load_rec(rec_p)
    ed = edit_config(a.stunt, a.stunt_file)
    P = rec.get("poses") or []
    if len(P) < 3:
        sys.exit("rec_check: the recording has no poses")
    tl = sorted(rec.get("timeline", []), key=lambda e: e["t"])
    R = Report()

    # ---------------------------------------------------------------- the edit's time map
    spans = edit_spans(ed.get("speed"), ed.get("slowmo"), ed.get("freeze"))
    warp = None
    if spans:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            warp = Warp(spans, tl)
        for ln in buf.getvalue().splitlines():   # a span whose event is missing: the edit silently drops it
            R.add("WARN", "edit", None, ln.strip())
    out_t = (lambda s: warp.out(s)) if warp else (lambda s: s)       # source s -> output s
    src_t = (lambda o: warp.src(o)) if warp else (lambda o: o)
    factor = (lambda o: warp.factor_at(o)) if warp else (lambda o: 1.0)
    cut_spans = [(sa, sb) for sa, sb, f in (warp.spans if warp else []) if f == math.inf]
    first = {}
    for e in tl:
        first.setdefault(e["event"], out_t(e["t"] / 1000))
    start = math.floor(trim_start(ed, first) * FPS + 1e-6) / FPS
    n_src = int(math.floor((len(P) - 1) / 20 * FPS))
    k0 = int(round(start * FPS))
    k1 = k0
    while (warp.frame(k1, FPS) if warp else k1) < n_src:
        k1 += 1
    end_o = k1 / FPS
    if ed.get("endAfter"):
        ev, secs = ed["endAfter"].rsplit(":", 1)
        if ev in first:
            end_o = min(end_o, first[ev] + float(secs))
        else:
            R.add("BLOCK", "edit", None, f"endAfter '{ed['endAfter']}': no '{ev}' mark in the recording (the Short runs to the end of the recording)")
    if ed.get("startAt") and ed["startAt"].rsplit(":", 1)[0] not in first:
        R.add("BLOCK", "edit", None, f"startAt '{ed['startAt']}': no such mark in the recording (the Short starts at 0)")
    k1 = min(k1, int(math.ceil(end_o * FPS - 1e-6)))
    dur = (k1 - k0) / FPS
    from retention import hook_len
    hook = hook_len(ed)
    vt = lambda o: o - start + hook          # output s -> seconds of the Short

    # source tick of every output frame (the frame edit.py shows: Warp.frame's floor; slow-mo in-betweens are real)
    ks = list(range(k0, k1))
    src_tick = []
    for k in ks:
        if warp:
            s = warp.src(k / FPS) * 20
            st = s if warp.factor_at(k / FPS) < 0.99 else warp.frame(k, FPS) / 3
        else:
            st = k / 3
        src_tick.append(min(st, len(P) - 1.0))
    cam = Camera(rec)
    C = [cam.at(t) for t in src_tick]

    # deaths: from the death mark to the respawn's camera jump (edit.py's windows); the death screen is up there
    import edit as _edit
    _edit.DEATH_POSES[:] = P
    deaths = [(d0 * 20, d1 * 20) for d0, d1 in _edit.death_windows(tl)]
    in_death = [any(d0 <= t < d1 for d0, d1 in deaths) for t in src_tick]

    # marks for "near:" (source ticks)
    marks = [(e["t"] / 50, (f"line {e.get('id')}" if e["event"] == "line" else e["event"])) for e in tl if e["event"] not in NOISE]
    mark_ticks = [m[0] for m in marks]

    def near(tick, win=2.0):
        o = out_t(tick / 20)
        lo, hi = bisect_left(mark_ticks, tick - 60), bisect_right(mark_ticks, tick + 60)
        cands = []
        for m_t, name in marks[lo:hi]:
            d = out_t(m_t / 20) - o
            if abs(d) <= win:
                cands.append((abs(d), d, name))
        cands.sort()
        seen, parts = set(), []
        for _, d, name in cands:
            if name in seen:
                continue
            seen.add(name)
            parts.append(f"{name} {d:+.2f}s")
            if len(parts) == 3:
                break
        return "near: " + ", ".join(parts) if parts else ""

    def where(j):
        """'12.35s (src 34.20s)' for output frame index j (into ks)."""
        return vt(ks[j] / FPS), src_tick[j]

    # camera shots (stunt.shots + 'shot' marks: the movie engine's camera director, docs/movie_engine.md): the picture
    # there comes from the shot's camera, not the bot's eye, so the POV checks (cuts, held, turns, set) don't apply.
    # `LINT=1 node render.js <rec>` checks those spans (camera in a block, subject hidden or frozen, line crossed).
    cam_spans = camera_shot_spans(a.stunt, a.stunt_file, tl)
    in_cam = lambda tick: any(c0 <= tick < c1 for c0, c1 in cam_spans)
    skipped = {}

    def add(level, check, j, msg, tick=None):
        t_short, st = where(j) if j is not None else (None, tick)
        if check in ("cuts", "held", "turns", "set") and in_cam(tick if tick is not None else st):
            skipped[check] = skipped.get(check, 0) + 1
            return
        R.add(level, check, (t_short, (tick if tick is not None else st) / 20), msg, near(tick if tick is not None else st))

    # ---------------------------------------------------------------- 1. cuts
    n = len(ks)
    # a time-lapse holds one steady camera (or one smooth move) across its jump cuts (owner r:r200cfe, scripts/lapse_cuts.py)
    import lapse_cuts
    for r_ in lapse_cuts.lapse_cuts(warp.spans if warp else [], tl, P):
        if r_["problems"]:
            o_ = out_t(r_["a"])
            R.add("BLOCK", "cuts", (vt(o_) if start <= o_ <= end_o else None, r_["a"]), lapse_cuts.message(r_), near(r_["a"] * 20))
    # F1 windows (HUD hidden, render.js/edit.py): a cinematic drone camera, not a player
    f1, f1_on = [], None
    for e in tl:
        if e["event"] == "f1_on" and f1_on is None:
            f1_on = e["t"] / 50
        elif e["event"] == "f1_off" and f1_on is not None:
            f1.append((f1_on, e["t"] / 50)); f1_on = None
    if f1_on is not None:
        f1.append((f1_on, 1e9))
    in_f1 = lambda t: any(a0 <= t < b0 for a0, b0 in f1)
    # 3+ cut steps in a row are a camera move faster than 4 blocks a tick (a pull-back), not a cut: render.js
    # snaps every tick of it (a stepped 20 fps move)
    dolly = set()
    i = 0
    while i < len(P) - 1:
        if cam.cutstep[i]:
            i2 = i
            while i2 + 1 < len(P) - 1 and cam.cutstep[i2 + 1]:
                i2 += 1
            if i2 - i >= 2:
                dolly.update(range(i, i2 + 1))
                o = out_t((i + 1) / 20)
                if start <= o < end_o and factor(o) < 2 and not in_f1(i + 1):
                    j = min(n - 1, max(0, int(round(o * FPS)) - k0))
                    add("WARN", "cuts", j, f"the camera moves over 4 blocks a tick for {i2 - i + 1} ticks: render.js snaps each tick "
                        f"(a stepped 20 fps move); slow it under 4 blocks a tick or speed the span up", tick=i + 1)
            i = i2 + 1
        else:
            i += 1
    cuts = []   # (j: first frame of the new shot, kind)
    resp_snaps = [d1 for _, d1 in deaths if d1 < 1e6 * 20]
    for j in range(1, n):
        a_, b_ = src_tick[j - 1], src_tick[j]
        kind = None
        if any(src_t(ks[j - 1] / FPS) <= sa + 1e-6 and src_t(ks[j] / FPS) >= sb - 1e-6 for sa, sb in cut_spans):
            kind = "edit cut"
        elif any(cam.cutstep[i] and i not in dolly for i in range(int(math.floor(a_)), int(math.floor(b_))) if a_ < i + 1 <= b_):
            kind = "teleport"
        elif any(a_ < r <= b_ for r in resp_snaps):
            kind = "respawn"
        if kind and not in_death[j]:
            cuts.append((j, kind))
    cut_frames = [j for j, _ in cuts]

    def pos_d(c0, c1):
        return math.dist(c0[:3], c1[:3])

    for j, kind in cuts:
        # a second jump right after the cut: the new shot shows for a few frames, then snaps again
        nxt = next((jj for jj in cut_frames if j < jj <= j + 12), None)
        if nxt is not None:
            add("BLOCK", "cuts", j, f"{kind} then another jump {nxt - j} frame(s) later: {nxt - j} frame(s) of an in-between shot "
                f"(carry the aim and the spot in ONE /tp; don't look or move until it lands)")
            continue
        end = min(n - 1, j + 24)
        nxt_cut = next((jj for jj in cut_frames if jj > j), n)
        end = min(end, nxt_cut - 1)
        if end - j >= 12:
            # the aim settling in the first frames: 3 frames (one tick) carry far more turn than the shot that follows
            a3 = ang_between(C[j], C[j + 3])
            rest = max((ang_between(C[m], C[m + 3]) for m in range(j + 3, end - 2, 3)), default=0.0)
            if a3 > 6 and a3 > 2.5 * rest + 2:
                add("BLOCK", "cuts", j, f"after the {kind} the aim snaps {a3:.0f} deg in the first 3 frames (then <= {rest:.1f} deg per 3 frames): "
                    f"the /tp landed on the old aim. Put yaw/pitch in the /tp itself")
            p3 = pos_d(C[j], C[j + 3])
            prest = max((pos_d(C[m], C[m + 3]) for m in range(j + 3, end - 2, 3)), default=0.0)
            if p3 > 0.3 and p3 > 2.5 * prest + 0.1:
                add("BLOCK", "cuts", j, f"after the {kind} the camera slides {p3:.2f} blocks in the first 3 frames (then <= {prest:.2f}): "
                    f"the landing spot isn't the shot's spot (ground height, a second move)")
        if end - j >= 6:
            de = max(abs(C[m][5] - C[j][5]) for m in range(j, min(end, j + 15) + 1))
            if de > 0.08:
                t0 = int(src_tick[j])
                fl = [(P[m][7] if len(P[m]) > 7 else 0) & 1 for m in range(max(0, t0 - 4), min(len(P), t0 + 8))]
                runs_ = [[fl[0], 1]]
                for v in fl[1:]:
                    if v == runs_[-1][0]:
                        runs_[-1][1] += 1
                    else:
                        runs_.append([v, 1])
                blip = next((r_ for r_ in runs_[1:-1] if r_[1] <= 3 and runs_[0][0] == runs_[-1][0] != r_[0]), None)
                why = (f"sneak is {'off' if not blip[0] else 'on'} for {blip[1]} tick(s) at the cut (a stopAll()/clearControlStates before "
                       f"the teleport?): keep the sneak key held across the cut") if blip else "set the sneak state a few ticks before the cut"
                add("BLOCK", "cuts", j, f"after the {kind} the eye height moves {de:.2f} blocks (crouch/stand-up easing into the new shot): {why}")
        # the last frames of the old shot: a whip right before the cut
        prev_cut = max([jj for jj in cut_frames if jj < j], default=-1)
        b0 = max(prev_cut, j - 24)
        if j - 1 - b0 >= 9:
            l3 = ang_between(C[j - 4], C[j - 1])
            before = max((ang_between(C[m - 3], C[m]) for m in range(j - 4, b0 + 3, -3)), default=0.0)
            if l3 > 10 and l3 > 2.5 * before + 3:
                add("WARN", "cuts", j - 1, f"the old shot turns {l3:.0f} deg in its last 3 frames before the {kind} (it was <= {before:.1f}): "
                    f"a look sent before the teleport landed")

    # teleports under 4 blocks without a cut mark: render.js glides them over a tick
    for i in range(1, len(P) - 1):
        if cam.cutstep[i]:
            continue
        a_, b_ = P[i], P[i + 1]
        hd = math.hypot(b_[1] - a_[1], b_[3] - a_[3])
        if hd > 1.2 and not in_f1(i + 1):
            around = [math.hypot(P[m + 1][1] - P[m][1], P[m + 1][3] - P[m][3]) for m in range(max(0, i - 3), min(len(P) - 1, i + 4)) if m != i]
            if around and hd < 3 * max(around):
                continue   # part of a fast move (flying, a dolly), not a jump
            o = out_t((i + 1) / 20)
            if start <= o <= end_o and not any(sa <= (i + 1) / 20 <= sb for sa, sb in cut_spans) and not any(d0 <= i + 1 < d1 for d0, d1 in deaths):
                j = min(n - 1, max(0, int(round(o * FPS)) - k0))
                add("WARN", "cuts", j, f"the camera moves {hd:.1f} blocks in one tick with no cut mark: it renders as a 3-frame glide "
                    f"(teleport with ctx.cmd('/tp @s ...') or ctx.mark('cut') first)", tick=i + 1)

    # time of day: a jump that isn't on a cut is a sky flash
    times = [(0.0, rec.get("time", 6000))] + [(e["t"] / 50, e.get("time")) for e in tl if e["event"] == "time" and e.get("time") is not None]

    def day_at(t):
        v = times[0][1]
        for a0, d in times:
            if t >= a0:
                v = d
        return v
    dv = [day_at(t) for t in src_tick]
    for j in range(1, n):
        d = abs(dv[j] - dv[j - 1]) % 24000
        d = min(d, 24000 - d)
        if d < 600 or in_death[j]:
            continue
        if j in cut_frames:
            continue
        cj = min(cut_frames, key=lambda c: abs(c - j), default=None)
        off = (j - cj) if cj is not None else None
        if off is not None and abs(off) <= 30:
            add("BLOCK", "cuts", j, f"time of day changes {d} ticks {abs(off)} frame(s) {'after' if off > 0 else 'before'} the cut "
                f"({abs(off) / 3:.0f} tick(s) off): the {'new' if off > 0 else 'old'} shot flashes the wrong sky. setTime on the cut's tick")
        else:
            add("WARN", "cuts", j, f"time of day changes {d} ticks mid-shot (no cut nearby): the sky and the light jump")

    # ---------------------------------------------------------------- 1b. the cast (scripts/cast_motion.py; STANDARDS 3b.2)
    # a cast member landing 1-4 ticks after a cut's frame (the new shot opens on it in the old spot), and a cast member
    # moving in stair steps (2+ tick holds, again and again: a /tp loop the client gets every 3rd tick). Camera shots
    # included: the cast is on screen there too
    import cast_motion
    for tick, msg in cast_motion.messages(rec.get("entities") or [], tl, P):
        o = out_t(tick / 20)
        if start <= o < end_o:
            add("BLOCK", "cast", min(n - 1, max(0, int(round(o * FPS)) - k0)), msg, tick=tick)

    # ---------------------------------------------------------------- 2. held shots
    # camera speed per frame, smoothed over 0.2 s
    ang = [0.0] + [ang_between(C[j - 1], C[j]) for j in range(1, n)]
    mov = [0.0] + [pos_d(C[j - 1], C[j]) + abs(C[j][5] - C[j - 1][5]) for j in range(1, n)]
    for j in cut_frames:
        ang[j] = mov[j] = 0.0
    W = 6
    still = []
    for j in range(n):
        lo, hi = max(1, j - W), min(n, j + W + 1)
        span = max(1, hi - lo)
        still.append(sum(ang[lo:hi]) / span * FPS < 2.5 and sum(mov[lo:hi]) / span * FPS < 0.2)
    # activity in view (source ticks): mobs moving or turning, block changes, particles, hurt flashes
    active = set()
    ents = rec.get("entities") or []
    last = {}
    for row in ents:
        t, eid, name, x, y, z, yw, pt = row[:8]
        hy = row[8] if len(row) > 8 else None
        p = last.get(eid)
        last[eid] = (t, x, y, z, yw, hy)
        ex = row[9] if len(row) > 9 and isinstance(row[9], dict) else {}
        if name == "tnt" or ex.get("swellDir") == 1 or ex.get("fire"):   # a primed TNT blinks and smokes, a swelling creeper, flames
            if in_view(cam.at(min(len(P) - 1, int(t))), x, y + 0.5, z, 40):
                active.update(range(int(t) - 1, int(t) + 2))
            continue
        if p is None or t - p[0] > 5 or t - p[0] <= 0:
            continue
        dt = t - p[0]
        sp = math.dist((x, y, z), p[1:4]) / dt
        rot = max(abs(wrap(yw - p[4])), abs(wrap((hy if hy is not None else 0) - (p[5] if p[5] is not None else 0)))) / dt
        if (0.02 < sp < 4) or rot > 0.03:
            ti = min(len(P) - 1, int(t))
            c = cam.at(ti)
            if in_view(c, x, y + 1, z, 40):
                for u in range(int(t) - 3, int(t) + 4):
                    active.add(u)
    for row in rec.get("blocks") or []:
        t = row[0]
        c = cam.at(min(len(P) - 1, t))
        if in_view(c, row[1] + 0.5, row[2] + 0.5, row[3] + 0.5, 48, 45):
            for u in range(int(t) - 3, int(t) + 6):
                active.add(u)
    for e in tl:
        if e["event"] in ("particles", "hurt", "mob_hurt", "hurt_dir", "mob_death", "flash", "dig"):
            t = e["t"] / 50
            hold = 20 if e.get("type") == "explosion" else 10
            if e["event"] == "particles" and "x" in e:
                c = cam.at(min(len(P) - 1, t))
                if not in_view(c, e["x"], e["y"], e["z"], 48, 50):
                    continue
            for u in range(int(t), int(t) + hold):
                active.add(u)
        if e["event"] == "dig" and e.get("ms"):
            nd = next((x["t"] for x in tl if x["event"] == "dig_end" and x["t"] >= e["t"]), e["t"] + e["ms"])
            for u in range(int(e["t"] / 50), int(nd / 50) + 1):
                active.add(u)   # the crack overlay grows
    # a container window is up: the view holds still by rule (the mouse drives the cursor; docs/engine_features.md
    # "Motion by construction") and the screen with its items is what's on screen, so it is not a held pause
    win = None
    for e in tl:
        if e["event"] == "container" and win is None:
            win = e["t"] / 50
        elif e["event"] == "container_close" and win is not None:
            active.update(range(int(win), int(e["t"] / 50) + 2))
            win = None
    if win is not None:
        active.update(range(int(win), len(P) + 1))
    # overlay changes (output s): story captions, line marks, subs, cards, counters... every edit entry anchored on a mark
    overlay = set()

    def ev_time(spec):
        if not isinstance(spec, str):
            return None
        if spec in first:
            return first[spec]
        k_, _, off = spec.rpartition(":")
        if k_ in first:
            try:
                return first[k_] + float(off)
            except ValueError:
                return None
        return None

    def walk(x):
        if isinstance(x, str):
            t = ev_time(x)
            if t is not None:
                overlay.add(t)
        elif isinstance(x, list):
            for v in x:
                walk(v)
        elif isinstance(x, dict):
            for v in x.values():
                walk(v)
    for key_, v in ed.items():
        if key_ not in ("speed", "slowmo", "freeze", "startAt", "endAfter", "dropAt", "sfx", "replay", "song", "caption", "red", "colors", "story"):
            walk(v)
    for e in tl:
        if e["event"] in ("line", "meter", "death"):
            overlay.add(out_t(e["t"] / 1000))
    story_dir = a.story_dir or ed.get("story")
    caps_note = ""
    if story_dir:
        sd = pathlib.Path(story_dir) if pathlib.Path(story_dir).is_absolute() else HERE / story_dir
        if (sd / "voice" / "voice.json").exists() and (sd / "story.json").exists():
            import story_track
            story_track.POSES = P if not warp else None
            tl_o = [{**e, "t": int(round(out_t(e["t"] / 1000) * 1000))} for e in tl] if warp else tl
            for t0, t1, _ in story_track.caption_events(str(sd), tl_o, start, dur):
                overlay.add(t0 + start)
        else:
            caps_note = f" (no {story_dir}/voice/voice.json: caption chunk changes not counted, only line marks)"
    ov_frames = sorted(int(round(t * FPS)) - k0 for t in overlay)
    held = []
    j = 0
    while j < n:
        frozen = factor(ks[j] / FPS) < 0.2   # an edit freeze frame is on purpose
        tick_act = any(u in active for u in range(int(src_tick[j - 1] if j else src_tick[j]), int(src_tick[j]) + 1))
        if still[j] and not tick_act and not frozen:
            j2 = j
            while j2 + 1 < n and still[j2 + 1] and factor(ks[j2 + 1] / FPS) >= 0.2 and not any(
                    u in active for u in range(int(src_tick[j2]), int(src_tick[j2 + 1]) + 1)) and (j2 + 1) not in cut_frames:
                j2 += 1
            # split at overlay changes (a new caption is something new on screen)
            lo = j
            for of in [f for f in ov_frames if j < f <= j2] + [j2 + 1]:
                if (of - lo) / FPS >= 0.6:
                    held.append((lo, of - 1))
                lo = of
            j = j2 + 1
        else:
            j += 1
    for lo, hi in held:
        secs = (hi - lo + 1) / FPS
        dead = in_death[lo] and in_death[hi]
        tail = hi >= n - 2
        lvl = "BLOCK" if secs >= 1.0 and not dead else "WARN"
        what = "a still death screen (bring something on screen behind it)" if dead else \
            ("the Short ends on a still shot" if tail else "held pause: the camera barely moves and nothing in view changes")
        add(lvl, "held", lo, f"{secs:.2f}s to {vt(ks[hi] / FPS):.2f}s: {what}")

    # the ending
    text_pay = False
    pay = ed.get("endAfter", "").rsplit(":", 1)[0] if ed.get("endAfter") else None
    if pay and pay in first:
        pt = first[pay]
        text_pay = bool(ed.get("story")) or any(e["event"] in ("death_message", "death") and abs(out_t(e["t"] / 1000) - pt) <= 0.6 for e in tl) \
            or any(isinstance(c, list) and c and isinstance(c[0], str) and ev_time(c[0]) is not None and abs(ev_time(c[0]) - pt) <= 0.4
                   for c in (ed.get("cards") or []) + (ed.get("subs") or []))
    rp = ed.get("replay")
    rlen = (float(rp.get("before", 1.5)) + float(rp.get("after", 0.5))) / float(rp.get("speed", 0.5)) if isinstance(rp, dict) else 0.0
    lines, _, ok = payoff_report(ed, first, start, dur + rlen, text_payoff=text_pay)
    ending = lines
    if not ok:
        R.add("BLOCK", "ending", (dur + hook, src_t(end_o)), lines[-1] + (" (change endAfter)" if not rp else ""))

    # ---------------------------------------------------------------- 3. camera turns
    cut_ticks = [e["t"] / 50 for e in tl if e["event"] in ("cut", "respawn", "teleported")]
    for t, d, back in camera_turns(P, cut_ticks):
        o = out_t(t / 20)
        if not (start <= o < end_o) or any(sa <= t / 20 <= sb for sa, sb in cut_spans) or any(d0 <= t < d1 for d0, d1 in deaths):
            continue
        j = min(n - 1, max(0, int(round(o * FPS)) - k0))
        add("WARN", "turns", j, f"camera turns {d:+.0f} deg{' and back' if back else ''}: name what on screen motivates it", tick=t)

    # ---------------------------------------------------------------- 4. set edges (rec_world.js)
    world_note = ""
    not_run = []   # checks that should have run and didn't (said in the verdict; exit 2 under --strict)
    # digs (for check 5): the held item from the hotbar marks (every mark carries the slot)
    digs, bar = [], [None] * 9
    for i_, e in enumerate(tl):
        if e["event"] == "hotbar" and e.get("items"):
            bar = e["items"]
        if e["event"] != "dig":
            continue
        end_e = next((x for x in tl[i_ + 1:] if x["event"] in ("dig_end", "dig")), None)
        if not end_e or end_e["event"] != "dig_end" or not end_e.get("ok", True):
            continue
        sl = e.get("slot") or 0
        it = bar[sl] if 0 <= sl < len(bar) else None
        haste = any(x["event"] == "effect" and x.get("effect") in ("haste", "conduit_power") and x["t"] <= e["t"] for x in tl) \
            and not any(x["event"] == "effect_end" and x.get("effect") in ("haste", "conduit_power") and x["t"] <= e["t"] for x in tl)
        digs.append((e, end_e["t"] - e["t"], it, haste))
    world = {"found": [], "digs": [None] * len(digs)}
    cleared = rec.get("cleared") or []
    if not rec.get("columns") and not a.no_world:
        not_run.append("set (the recording has no chunk columns)")
    if (not a.no_world or digs) and rec.get("columns"):
        samp = []
        for j in range(0, n, 6):
            if in_death[j]:
                continue
            c = C[j]
            samp.append([src_tick[j], c[0], c[1] + c[5], c[2], c[3], c[4]])
        if a.no_world:
            samp = []
        dig_in = [[e["t"] / 50, e.get("x"), e.get("y"), e.get("z"), it[0] if it else None, bool(it and len(it) > 2 and it[2])] for e, _, it, _ in digs]
        try:
            res = subprocess.run(["node", str(HERE / "scripts" / "rec_world.js")],
                                 input=json.dumps({"rec": str(rec_p.resolve()), "radius": a.radius, "samples": samp, "digs": dig_in,
                                                   "cleared": [] if a.no_world else cleared}),
                                 capture_output=True, text=True, cwd=HERE)
            err = None if res.returncode == 0 else (res.stderr.strip().splitlines() or ["?"])
        except OSError as e:   # no node at all
            res, err = None, [str(e)]
        if err is not None:
            # e.g. a fresh checkout without `npm ci`: "Cannot find module 'prismarine-chunk'". The report used to end
            # "OK" all the same (story_nitwit's reviewer); say plainly that the set was NOT checked
            why = next((ln.strip() for ln in reversed(err) if "Cannot find module" in ln or "Error" in ln), err[-1].strip())
            if "Cannot find module" in why:
                why += " (run `npm ci`)"
            world_note = f"SET CHECK DID NOT RUN: {why}"
            not_run.append("set" + ("" if a.no_world else " (floating blocks, unflowed liquids, terrain left in the set)") + (", digs" if digs else ""))
        else:
            world = json.loads(res.stdout or "{}")
            if not a.no_world and not cleared:
                world_note = "terrain check: no cleared box in the recording (lib/story.js clearSet records one), skipped"
            for tr in sorted(world.get("terrain", []), key=lambda f: f["ticks"][0] if f["ticks"][0] is not None else 1e9):
                secs = tr["seen"] * 6 / FPS
                if tr["seen"] == 0 or (tr["n"] < 6 and "snow" not in tr["block"]) or secs < 0.3:
                    continue
                o = out_t(tr["ticks"][0] / 20)
                j = min(n - 1, max(0, int(round(o * FPS)) - k0))
                bx = tr["box"]
                lvl = "BLOCK" if tr["n"] >= 64 and secs >= 0.5 else "WARN"
                add(lvl, "set", j, f"terrain left in the cleared set: {tr['n']} blocks ({tr['block']}) at {bx[0]}..{bx[3]} {bx[1]}..{bx[4]} "
                    f"{bx[2]}..{bx[5]}, {tr['dist']} blocks from the camera, in view ~{secs:.1f}s (a clearing /fill failed? "
                    f"look for COMMAND ERROR in the bot log; built on purpose: clearSet(..., {{ checkTerrain: false }}))", tick=tr["ticks"][0])
            for f in sorted(world.get("found", []), key=lambda f: f["ticks"][0]):
                secs = f["seen"] * 6 / FPS
                if secs < 0.3:
                    continue
                o = out_t(f["ticks"][0] / 20)
                j = min(n - 1, max(0, int(round(o * FPS)) - k0))
                what = (f"floating {f['block']} (nothing under it: vanilla drops it)" if f["kind"] == "floating"
                        else f"{f['block']} that should have flowed (a source beside air, or over air)")
                lvl = "BLOCK" if f["kind"] == "floating" and f["dist"] <= 10 and secs >= 0.5 else "WARN"
                add(lvl, "set", j, f"{what} at {f['x']} {f['y']} {f['z']}, {f['dist']} blocks from the camera, in view ~{secs:.1f}s", tick=f["ticks"][0])

    # ---------------------------------------------------------------- 5. vanilla plausibility
    # digs: at least half as long as vanilla takes with the held tool, on the ground (rec_world.js; Efficiency V if it's
    # enchanted), so only a dig that tool could never do is flagged. Haste/Conduit Power: skipped. A dig cut short in the edit is fine.
    for (e, took, it, haste), w in zip(digs, world.get("digs") or [None] * len(digs)):
        if haste or not w or w.get("ms") is None or w["ms"] <= 50:
            continue
        if took < 0.5 * w["ms"] - 50:   # (a vanilla server accepts a break at 70% progress; finished bots run ~30% quick)
            o = out_t(e["t"] / 1000)
            if start <= o < end_o:
                j = min(n - 1, max(0, int(round(o * FPS)) - k0))
                add("WARN", "vanilla", j, f"{w['block']} at {e.get('x')} {e.get('y')} {e.get('z')} breaks in {took / 1000:.2f}s; vanilla takes at least "
                    f"{w['ms'] / 1000:.2f}s with {it[0] if it else 'an empty hand'}{' (enchanted: Efficiency V assumed)' if it and len(it) > 2 and it[2] else ''}"
                    f" (use a better tool, Haste, or dig for the full time)", tick=e["t"] / 50)
    # mobs: sustained ground speed over vanilla (10-tick average, not airborne, no teleport hops)
    NOT_MOBS = ("item", "experience_orb", "arrow", "spectral_arrow", "trident", "snowball", "egg", "ender_pearl", "potion", "splash_potion",
                "lingering_potion", "experience_bottle", "fireball", "small_fireball", "dragon_fireball", "wither_skull", "firework_rocket",
                "falling_block", "tnt", "fishing_bobber", "llama_spit", "shulker_bullet", "wind_charge", "breeze_wind_charge", "eye_of_ender",
                "area_effect_cloud", "lightning_bolt", "armor_stand", "item_frame", "glow_item_frame", "painting", "marker", "block_display",
                "item_display", "text_display", "interaction", "player", "ender_dragon", "phantom", "horse", "skeleton_horse", "zombie_horse",
                "donkey", "mule", "camel", "experience_bottle", "evoker_fangs", "leash_knot", "end_crystal", "ominous_item_spawner")
    FLY = {"bee": 0.6, "parrot": 0.6, "bat": 0.6, "ghast": 0.6, "happy_ghast": 0.6, "blaze": 0.6, "vex": 0.8, "allay": 0.6}
    tracks = {}
    for row in ents:
        name = row[2]
        if name in NOT_MOBS or name.endswith(("minecart", "boat", "raft", "_arrow")):
            continue
        tracks.setdefault(row[1], []).append(row)
    flagged = set()
    for eid, rows in tracks.items():
        lim = FLY.get(rows[0][2], 0.45)
        for i_ in range(len(rows)):
            t0 = rows[i_][0]
            i2 = i_
            while i2 + 1 < len(rows) and rows[i2 + 1][0] - t0 <= 10 and math.dist(rows[i2 + 1][3:6], rows[i2][3:6]) < 4:
                i2 += 1
            if rows[i2][0] - t0 < 10:
                continue
            seg = rows[i_:i2 + 1]
            hd = math.hypot(seg[-1][3] - seg[0][3], seg[-1][5] - seg[0][5]) / (seg[-1][0] - t0)
            ys = [r[4] for r in seg]
            if hd > lim and max(ys) - min(ys) < 1.0 and eid not in flagged:
                tick = t0
                o = out_t(tick / 20)
                if not (start <= o < end_o) or any(sa <= tick / 20 <= sb for sa, sb in cut_spans):
                    continue
                c = cam.at(min(len(P) - 1, tick))
                if not in_view(c, seg[0][3], seg[0][4] + 1, seg[0][5], 40):
                    continue
                flagged.add(eid)
                j = min(n - 1, max(0, int(round(o * FPS)) - k0))
                add("WARN", "vanilla", j, f"{rows[0][2]} #{eid} moves {hd * 20:.1f} blocks/s for 0.5s on the ground (vanilla mobs top out near "
                    f"{lim * 20:.0f}); slow its /tp steps", tick=tick)
    # the player: faster than sprint-jumping (~7.1 b/s) on the ground, outside cuts
    grid = lambda y: abs(y * 16 - round(y * 16)) < 0.03
    last_flag = -999
    for i in range(0, len(P) - 9):
        seg = P[i:i + 9]
        if any(cam.cutstep[m] for m in range(i, i + 8)) or in_f1(i):
            continue
        hd = math.hypot(seg[-1][1] - seg[0][1], seg[-1][3] - seg[0][3]) / 8
        if hd <= 0.42 or i - last_flag < 40:
            continue
        ys = [q[2] for q in seg]
        if max(ys) - min(ys) > 1.3 or sum(grid(y) for y in ys) < 5:
            continue   # falling, gliding, swimming: not a run
        o = out_t(i / 20)
        if not (start <= o < end_o) or any(sa <= i / 20 <= sb for sa, sb in cut_spans) or any(d0 <= i < d1 for d0, d1 in deaths):
            continue
        last_flag = i
        j = min(n - 1, max(0, int(round(o * FPS)) - k0))
        add("WARN", "vanilla", j, f"the player moves {hd * 20:.1f} blocks/s on the ground for 0.4s (sprint-jumping tops out near 7.1): "
            f"a camera dolly faster than a player can run", tick=i)

    # ---------------------------------------------------------------- 5b. hotbar (story Shorts, STANDARDS 3.6)
    # all 9 slots filled (the story's tools, then 1-3 ridiculous items): fewer than 7 on more than 20% of the frames
    # where the HUD is on screen is a WARN. Not counted: camera shots and F1 (no HUD), the death screen, an open
    # container (its screen covers the hotbar), stunt.hud === false.
    if ed.get("story") or a.stunt.startswith("story_"):
        if stunt_hud(a.stunt, a.stunt_file) is not False:
            conts, c_on = [], None
            for e in tl:
                if e["event"] == "container" and c_on is None:
                    c_on = e["t"] / 50
                elif e["event"] == "container_close" and c_on is not None:
                    conts.append((c_on, e["t"] / 50)); c_on = None
            if c_on is not None:
                conts.append((c_on, 1e9))
            shown = [not (in_f1(st) or in_cam(st) or in_death[j] or any(c0 <= st < c1 for c0, c1 in conts)) for j, st in enumerate(src_tick)]
            hc = hotbar_coverage(tl, list(zip(src_tick, shown)))
            if hc["visible"] and hc["frac"] > HOTBAR_MAX_LOW:
                ft = hc["first_low"]
                add("WARN", "hotbar", None, f"the hotbar has fewer than {HOTBAR_MIN} filled slots on {hc['frac'] * 100:.0f}% of the "
                    f"{hc['visible']} first-person frames (at least {hc['min_filled']}; max {HOTBAR_MAX_LOW * 100:.0f}%): fill story.json "
                    f"\"hotbar\" (the story's tools, then 1-3 ridiculous items: STANDARDS 3.6); a stunt's own ctx.hotbar replaces it "
                    f"(lib/story.js mergeHotbar keeps the story's items)", tick=ft)

    # ---------------------------------------------------------------- 5c. sight (STANDARDS 3b.4, scripts/rec_sight.js)
    sight_res = OC.sight_json(rec_p)
    if sight_res.get("error"):
        not_run.append(f"sight ({sight_res['error']})")
    for lvl, tick, msg in sight_findings_msgs(sight_res):
        o = out_t(tick / 20)
        # (camera shots too: a third-person shot shows the player breaking a block through another just the same)
        if not (start <= o < end_o) or any(sa <= tick / 20 <= sb for sa, sb in cut_spans):
            continue
        add(lvl, "sight", min(n - 1, max(0, int(round(o * FPS)) - k0)), msg, tick=tick)

    # ---------------------------------------------------------------- 5d. aim on the action (r:rffba12, scripts/owner_checks.py)
    def first_person(tick):
        o = out_t(tick / 20)
        return start <= o < end_o and not any(sa <= tick / 20 <= sb for sa, sb in cut_spans) and not in_f1(tick) and not in_cam(tick)
    aim_res = OC.aim_report(sight_res, first_person) if "aim" in sight_res else None
    if aim_res is None:
        not_run.append(f"aim ({sight_res.get('error') or 'rec_sight.js gave no aim'})")
    else:
        for lvl, tick, msg in aim_res["findings"]:
            add(lvl, "aim", min(n - 1, max(0, int(round(out_t(tick / 20) * FPS)) - k0)), msg, tick=tick)

    # ---------------------------------------------------------------- 5e. let the payoff settle (r:r24d99a)
    # the last frames before every hard cut and the end: falling blocks / debris / a death still moving in view
    tracks = OC.debris_tracks(rec)
    tracks_end = OC.debris_tracks(rec, puffs=True)   # the end also waits out the rendered smoke and debris (which_door)
    cam_at = lambda k: cam.at(min(len(P) - 1, k))
    settle_res = {"tracks": len(tracks_end), "ok": True, "findings": []}
    if tracks_end:
        checks_at = [(j - 1, kind) for j, kind in cuts] + [(n - 1, "end")]
        for j, kind in checks_at:
            if j < 0 or kind == "respawn":   # (a respawn cut follows the death screen: the world isn't on screen)
                continue
            k_out = src_tick[j]
            any_v = in_cam(k_out) or in_f1(k_out)   # (a camera shot: anything near the player)
            trs = tracks_end if kind == "end" else tracks
            mv = OC.moving(trs, k_out, cam_at, any_v, seen=3) or OC.moving(trs, k_out - 1, cam_at, any_v, seen=3)
            if not mv:
                continue
            k_set = OC.settle_after(trs, k_out, cam_at, 400, any_v)
            more = (k_set - k_out) / 20 if k_set is not None else None   # (recording seconds: past a cut the edit never shows it)
            if more is not None and more <= OC.SETTLE_GRACE:
                continue
            when = (f"it settles at src {k_set / 20:.2f}s, {more:.2f} s of recording later" if more is not None else "still moving 20 s later")
            what = "ends" if kind == "end" else f"cuts ({kind})"
            msg = (f"settle: the Short {what} while {OC.describe(mv)} still move{'s' if len(mv) == 1 else ''} in view ({when}): "
                   + ("end after it (endAfter on a mark after the settle, +1.0 s at most)" if kind == "end" else "cut after it lands")
                   + " (owner: let the last pillar of sand all fall before we end/cut; STANDARDS r:r24d99a)")
            # only the rendered smoke left (PUFF_TICKS is an estimate): a WARN here; pace measures the finished mp4's last
            # 0.6 s and blocks when the picture still moves
            lvl = "WARN" if kind == "end" and all(t["kind"] == "puff" for t in mv) else "BLOCK"
            settle_res["findings"].append((lvl, k_out, msg))
            add(lvl, "settle", j, msg, tick=k_out)
        settle_res["ok"] = not any(lvl == "BLOCK" for lvl, _, _ in settle_res["findings"])

    # ---------------------------------------------------------------- 6-9. the owner's notes (./hb owner, lib/hb/owner.js)
    owner_note = ""
    if not a.no_owner:
        cmd = ["node", str(HERE / "hb"), "owner", a.stunt, "--rec", str(rec_p.resolve()), "--json"]
        if a.stunt_file:
            cmd += ["--stunt-file", str(pathlib.Path(a.stunt_file).resolve())]
        if a.story_dir:
            cmd += ["--story", str(pathlib.Path(a.story_dir).resolve())]
        res = subprocess.run(cmd, capture_output=True, text=True, cwd=HERE)
        try:
            ow = json.loads((res.stdout or "").strip().splitlines()[-1])
        except Exception:
            ow = None
        if not ow or ow.get("error"):
            owner_note = f"owner checks could not run: {((ow or {}).get('error') or (res.stderr or '').strip().splitlines()[-1:] or ['?'])}"
        else:
            for f in ow.get("findings", []):
                if f["level"] not in ("BLOCK", "WARN"):
                    continue
                tick = f.get("tick")
                t_short = f.get("out")
                R.add(f["level"], f["check"], (t_short, tick / 20) if tick is not None else None,
                      (f"{f['line']}: " if f.get("line") else "") + f["msg"], near(tick) if tick is not None else "")
            for n_ in ow.get("notes", []):
                owner_note += f"\n  owner: {n_}"

    # ---------------------------------------------------------------- on-screen sounds (docs/audio.md): not a gate
    # every visible event that makes a sound in vanilla gets it; audio.py adds the missing ones for a story
    sound_note = ""
    try:
        import onscreen_sfx
        _rec, _p = onscreen_sfx.load_rec(rec_p)
        _rec["_path"] = str(_p)
        _ev = onscreen_sfx.events(_rec)
        _miss = [o for o in _ev if not o["has"]]
        if _ev:
            sound_note = (f"on-screen sounds: {len(_ev)} visible sound-making events, {len(_miss)} with no sound mark"
                          + (" (audio.py adds them for a story; list: python3 scripts/onscreen_sfx.py " + str(rec_p) + ")" if _miss else ""))
    except Exception as e:   # never block on this
        sound_note = f"on-screen sound check could not run: {e}"

    # ---------------------------------------------------------------- audible sounds (scripts/sound_levels.py): a gate
    # every sound mark's level = play volume x its sounds.json file volume; under the floor nobody hears it
    # (thirty_one_raids' payoff horn at 2.2 x 0.01 = 0.022, 2026-11-11). Key sounds: edit.keySounds, the payoff.
    try:
        import sound_levels
        _sd = None
        if story_dir:
            _sd = pathlib.Path(story_dir) if pathlib.Path(story_dir).is_absolute() else HERE / story_dir
        _rows, _fs = sound_levels.findings(rec, ed, str(_sd) if _sd else None)
        for f in _fs:
            o_ = out_t(f["t"])
            R.add(f["level"], "audible", (vt(o_), f["t"]), f["msg"])
        _keys = [r for r in _rows if r["key"]]
        sound_note = (sound_note + "\n  " if sound_note else "") + (
            f"sound levels: {len(_rows)} sound marks, {len(_keys)} key/payoff"
            + (" (" + ", ".join(f"{r['sound']} {r['gain']:.2f}" for r in _keys[:4]) + ")" if _keys else "")
            + f", {sum(f['level'] == 'BLOCK' for f in _fs)} under the floor {sound_levels.FLOOR:g}")
    except Exception as e:
        not_run.append(f"sound levels ({e})")

    # ---------------------------------------------------------------- the report
    nb = sum(1 for it in R.items if it[0] == "BLOCK")
    nw = len(R.items) - nb
    print(f"rec_check {a.stunt}: {rec_p}")
    print(f"  {dur:.2f}s Short{f' (+{hook:.2f}s hook preview first: times below include it)' if hook else ''}"
          f"{f' (+{rlen:.2f}s replay after)' if rlen else ''}; recording {len(P) / 20:.1f}s from {start:.2f}s (output time)"
          f"{'; speed spans: ' + ', '.join(f'{sa:.2f}-{sb:.2f}s x{f:g}' for sa, sb, f in warp.spans) if warp else ''}")
    print(f"  {len(cuts)} hard cut(s), {len(deaths)} death window(s)")
    for ln in ending:
        print("  " + ln)
    if caps_note:
        print("  held-shot check" + caps_note)
    if world_note:
        print("  " + world_note)
    if owner_note:
        print("  " + owner_note.strip())
    if sound_note:
        print("  " + sound_note)
    if aim_res is not None:
        print(f"  aim (r:rffba12): {aim_res['summary']}" + ("" if aim_res["ok"] else f": {aim_res['blockers']} BLOCKER(s)"))
    print(f"  settle (r:r24d99a): {len(tracks)} falling block / debris / death track(s)" + (f", {len(settle_res['findings'])} cut/end while they move" if settle_res["findings"] else ", none moving at a cut or the end"))
    if cam_spans:
        secs = sum(min(c1, len(P)) - c0 for c0, c1 in cam_spans) / 20
        print(f"  {len(cam_spans)} camera shot(s), {secs:.1f}s: POV checks skipped there"
              f"{' (' + ', '.join(f'{v} {k}' for k, v in skipped.items()) + ')' if skipped else ''}; run LINT=1 node render.js {rec_p} for the cameras")
    order = {"cuts": 0, "held": 1, "ending": 2, "turns": 3, "set": 4, "vanilla": 5, "hotbar": 5.5, "sight": 5.7, "aim": 5.8, "settle": 5.9, "audible": 5.95, "flat": 6, "subject": 7, "sync": 8, "glitch": 9, "edit": -1}
    for level, title in (("BLOCK", "BLOCKERS"), ("WARN", "WARNINGS")):
        items = sorted([it for it in R.items if it[0] == level], key=lambda it: (order.get(it[1], 9), it[2][0] if it[2] and it[2][0] is not None else -1))
        print(f"\n{title} ({len(items)}):" if items else f"\n{title}: none")
        for _, check, t, msg, nr in items:
            ts = f"{t[0]:6.2f}s (src {t[1]:6.2f}s)" if t and t[0] is not None else (f"   src {t[1]:6.2f}s     " if t else " " * 22)
            print(f"  [{check:<7}] {ts}  {msg}" + (f"   [{nr}]" if nr else ""))
    if a.summary:
        pathlib.Path(a.summary).write_text(json.dumps({
            "aim": {k: v for k, v in (aim_res or {"ok": None, "summary": "did not run"}).items()},
            "settle": settle_res, "blockers": nb, "warnings": nw,
            "items": [{"level": l, "check": c, "out": t[0] if t else None, "src": t[1] if t else None, "msg": m} for l, c, t, m, _ in R.items]}, indent=1))
    verdict = "FAIL" if nb else ("OK, BUT THE SET CHECK DID NOT RUN" if not_run else "OK")
    print(f"\n{verdict}: {nb} blocker(s), {nw} warning(s)" + (" -- fix by re-recording before rendering" if nb else "")
          + (f"\n  not checked: {'; '.join(not_run)}" + (" (exit 2: --strict / REC_CHECK_STRICT=1)" if a.strict else "") if not_run else ""))
    sys.exit(1 if nb else (2 if not_run and a.strict else 0))


if __name__ == "__main__":
    try:
        main()
    except SystemExit as e:   # a usage problem (no recording, a stunt that won't load) is exit 2, not "blockers"
        if isinstance(e.code, str):
            print(e.code, file=sys.stderr)
            sys.exit(2)
        raise
