"""Audible sounds: every sound a stunt plays must be loud enough to hear, the key and payoff sounds first of all.

2026-11-11, thirty_one_raids: the payoff sound, the raid horn, was silent in the first package. Vanilla's sounds.json
gives `event.raid.horn` a FILE volume of 0.01 because the game plays it at 64 (Raid.playSound: it carries across the
village); the stunt played it at 2.2, so audio.py mixed it at 2.2 x 0.01 = 0.022 (-33 dB): nothing. No check caught
it. This one does, from the recording alone (before any render):

  effective level = the mark's play volume x the event's sounds.json file volume (the mean over its variants)
                    (vanilla clamps the product to 1.0; audio.py's Mixer doesn't distance-attenuate a `sound` mark)

- BLOCK: any `sound` mark under FLOOR (0.04, -28 dB) in a story Short, ambience aside (weather / ambient loops: the
  harness fades rain in from 0) and events with no files. In a HelloBuh stunt a WARN: chain / cells stunts relay the
  server's own sounds, distance-attenuated like vanilla (cells_lab's far pistons and mob steps at 0.02-0.04,
  chain_reaction's anvil landing at 0.03: all 76 packages of 2026-11-11 checked, those two the only hits). Calibrated on the five stories of 2026-11-11: the old horns were 0.012 and 0.022; the quietest sound a
  stunt meant to play is gold_for_the_portal's portal trigger at 0.08 (its file is loud); steps are 0.15.
- a KEY sound: a mark flagged `key` (ctx.sound(..., { key: true }) / ctx.vanillaSound), a sound within KEY_WIN of an
  edit.keySounds mark, or one within KEY_WIN of the story's payoff (story.json `payoff`, scripts/story_audio.py):
  under the floor is a BLOCK naming it as the payoff; under KEY_WARN (0.15, -16 dB) a WARN.
- the fix: play the event at the volume the game does, ctx.vanillaSound(event) (lib/sound_level.js: the horn at 64,
  a bell at 2, an explosion at 4, thunder at 10000...), or a volume that clears the floor.
- with --video: the finished mix, measured. For each key / payoff sound, its own waveform (each variant of its .ogg at
  the mark's pitch, as audio.Mixer plays it) correlated with the mp4 around its frame (a matched filter: a band-energy
  rise was fooled by the narrator saying "HORN"). Heard: rho >= 0.2 and >= 2x its correlation with the same mix 3.5-7 s
  away. Not heard: a WARN (listen there), never a BLOCK: a sound quiet by design (a drink: 0.08-0.25 against a 0.05
  null) correlates weakly, so the level floor above is the gate. Raids, payoff horn: the silent package 0.07 (null
  0.09), the fixed one 0.60 (null 0.09).

The file volumes and vanilla's play volumes live in lib/sound_volumes.json (generated from this version's sounds.json:
`python3 scripts/sound_levels.py --gen`), so the check runs offline and the harness warns at record time.
rec_check.py runs findings() (./hb record stops on a BLOCK; ./hb check's rec_check step); ./hb check runs the CLI
with --video --mix-only on a rendered Short (the "audible sound" step: WARNs only).

  python3 scripts/sound_levels.py <rec.json[.gz]> [--stunt <name>] [--story stories/<name>] [--video out/x.mp4] [--json]
  python3 scripts/sound_levels.py --gen      # rebuild lib/sound_volumes.json from work/'s sounds.json
exit 1 on a BLOCK, 2 if it couldn't run.
"""
import argparse
import gzip
import json
import math
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TABLE = ROOT / "lib" / "sound_volumes.json"
FLOOR = 0.04          # effective level under this is inaudible in the mix (-28 dB)
KEY_WARN = 0.15       # a key / payoff sound under this is quiet for the moment it carries (-16 dB)
KEY_WIN = (-0.15, 0.6)   # s around a key mark / the payoff: the sounds that are its sound
AMBIENT = re.compile(r"^(weather\.|ambient\.|music\.|music_disc\.)")

# Vanilla's own play volume for events the game plays far louder than 1 (the source's literal, 1.21): a stunt that
# plays them at 1 gets the file volume alone (the horn: 0.01). Keys: the event; values: the volume the game passes.
VANILLA_PLAY = {
    "event.raid.horn": 64.0,                      # Raid.playSound
    "entity.generic.explode": 4.0,                # Explosion / ClientLevel: 4.0F
    "entity.lightning_bolt.thunder": 10000.0,     # LightningBolt.tick
    "entity.lightning_bolt.impact": 2.0,
    "block.bell.use": 2.0,                        # BellBlock.attemptToRing
    "entity.wither.spawn": 1.0,                   # a global level event: full volume anywhere
    "entity.ender_dragon.death": 5.0,             # LevelRenderer.globalLevelEvent 1028
    "block.end_portal.spawn": 1.0,
    "item.goat_horn.sound.0": 16.0, "item.goat_horn.sound.1": 16.0, "item.goat_horn.sound.2": 16.0,
    "item.goat_horn.sound.3": 16.0, "item.goat_horn.sound.4": 16.0, "item.goat_horn.sound.5": 16.0,
    "item.goat_horn.sound.6": 16.0, "item.goat_horn.sound.7": 16.0,   # Instrument range 256 / 16
    "entity.firework_rocket.launch": 3.0, "entity.firework_rocket.blast": 20.0,
    "entity.firework_rocket.large_blast": 20.0, "entity.firework_rocket.twinkle": 20.0,
    "entity.warden.sonic_boom": 3.0, "entity.warden.roar": 3.0, "entity.warden.emerge": 3.0,
    "block.sculk_shrieker.shriek": 2.0,
    "entity.elder_guardian.curse": 1.0,
}


# ------------------------------------------------------------------ the table
def gen_table(defs, mc_version):
    """sounds.json -> the table: each event's mean file volume where it isn't 1, and vanilla's play volumes."""
    def fv(ev, seen=()):
        sounds = (defs.get(ev) or {}).get("sounds") or []
        vals = []
        for s in sounds:
            s = {"name": s} if isinstance(s, str) else s
            v = s.get("volume", 1.0)
            if s.get("type") == "event" and s["name"] not in seen:
                v *= fv(s["name"], seen + (ev,))
            vals.append(v)
        return sum(vals) / len(vals) if vals else 0.0
    file = {}
    for ev in sorted(defs):
        v = round(fv(ev), 4)
        if abs(v - 1.0) > 1e-6:
            file[ev] = v
    return {"mc": mc_version, "note": "generated by scripts/sound_levels.py --gen from this version's sounds.json; "
            "file: each event's mean file volume where it is not 1 (0: no files); play: the volume vanilla plays it at",
            "floor": FLOOR, "key_warn": KEY_WARN, "file": file, "play": VANILLA_PLAY}


_TAB = None


def table():
    global _TAB
    if _TAB is None:
        _TAB = json.loads(TABLE.read_text()) if TABLE.exists() else {"file": {}, "play": VANILLA_PLAY}
    return _TAB


def file_volume(event):
    return table()["file"].get(event, 1.0)


def gain(event, volume=1.0):
    """The level the mix plays a `sound` mark at (audio.Mixer: volume x file volume), clamped to 1 like vanilla."""
    return min(1.0, float(volume) * file_volume(event))


def vanilla_volume(event):
    return table()["play"].get(event, 1.0)


def db(g):
    return 20 * math.log10(max(g, 1e-6))


# ------------------------------------------------------------------ the key moments
def key_times(rec, edit=None, story_dir=None):
    """[(recording s, why)]: each edit.keySounds mark, and the story's payoff."""
    tl = rec.get("timeline", [])
    edit = edit or {}
    out = [(e["t"] / 1000, f"key sound '{e['event']}'") for e in tl if e["event"] in set(edit.get("keySounds") or [])]
    if story_dir and (pathlib.Path(story_dir) / "story.json").exists():
        try:
            sys.path.insert(0, str(ROOT / "scripts"))
            import story_audio
            ea = edit.get("endAfter")
            t = story_audio.payoff_time(str(story_dir), tl, 0.0, end_after=ea)
            if t is not None:
                out.append((t, "the payoff"))
        except Exception as e:   # no voice yet: a line id can't be timed, a mark name still can
            spec = str(json.loads((pathlib.Path(story_dir) / "story.json").read_text()).get("payoff") or "")
            name, _, off = re.split(r"[+:]", spec)[0], None, re.search(r"[+:](-?[\d.]+)$", spec)
            t = next((m["t"] / 1000 for m in tl if name and m["event"] == name), None)
            if t is None and not spec:
                t = next((m["t"] / 1000 for m in tl if m["event"] in ("payoff", "reveal", "boom")), None)
            if t is not None:
                out.append((t + (float(off.group(1)) if off else 0.0), "the payoff"))
            elif spec:
                print(f"sound levels: the payoff '{spec}' couldn't be timed ({e})", file=sys.stderr)
    return out


def is_story(rec, edit=None, story_dir=None):
    """A story Short (a narrated story_*): its stunt name, its edit's story, a story dir, or `line` marks."""
    return bool(story_dir or (edit or {}).get("story") or str(rec.get("stunt") or "").startswith("story_")
                or any(e["event"] == "line" for e in rec.get("timeline", [])))


def findings(rec, edit=None, story_dir=None):
    """Every sound mark checked -> (rows, findings). A row: {t, sound, volume, file, gain, key}; a finding:
    {level, t, sound, msg}. Under the floor: a BLOCK in a story; in a HelloBuh stunt a WARN (they relay the server's own
    sounds, already distance-attenuated: far pistons and mob steps are quiet on purpose), but a key sound BLOCKs anywhere."""
    keys = key_times(rec, edit, story_dir)
    story = is_story(rec, edit, story_dir)
    rows, out = [], []
    marks = [e for e in rec.get("timeline", []) if e["event"] == "sound" and e.get("sound")]
    # each key moment's sound: the (non-ambient) sound mark nearest it inside KEY_WIN
    nearest = {}
    for kt, w in keys:
        near = [e for e in marks if KEY_WIN[0] <= e["t"] / 1000 - kt <= KEY_WIN[1] and not AMBIENT.match(e["sound"])]
        if near:
            nearest.setdefault(id(min(near, key=lambda e: abs(e["t"] / 1000 - kt))), w)
    for e in marks:
        t = e["t"] / 1000
        s, vol = e["sound"], float(e.get("volume", 1.0))
        why = "a key sound (flagged)" if e.get("key") else nearest.get(id(e))
        g = gain(s, vol)
        rows.append({"t": round(t, 3), "sound": s, "volume": vol, "pitch": float(e.get("pitch", 1.0)), "file": file_volume(s), "gain": round(g, 4), "key": why})
        if (AMBIENT.match(s) and not why) or file_volume(s) == 0:   # no files (snow golem ambient): vanilla plays nothing
            continue
        vv = vanilla_volume(s)
        fix = (f"play it as the game does: ctx.vanillaSound('{s}') (volume {vv:g})" if vv * file_volume(s) >= FLOOR
               else f"raise its volume to >= {FLOOR / max(file_volume(s), 1e-6):.2g}")
        what = f"{s} at volume {vol:g} x file volume {file_volume(s):g} = {g:.3f} ({db(g):.0f} dB)"
        if g < FLOOR:
            out.append({"level": "BLOCK" if story or why else "WARN", "t": t, "sound": s, "gain": g, "key": why,
                        "msg": f"inaudible{' ' + why.upper() if why else ''}: {what}, under the floor {FLOOR:g} ({db(FLOOR):.0f} dB): {fix}"})
        elif why and g < KEY_WARN:
            out.append({"level": "WARN", "t": t, "sound": s, "gain": g, "key": why,
                        "msg": f"quiet {why}: {what}, under {KEY_WARN:g} ({db(KEY_WARN):.0f} dB) for the sound the moment hangs on: {fix}"})
    for kt, why in keys:
        if why.startswith("key sound") and not any(r["key"] == why and KEY_WIN[0] <= r["t"] - kt <= KEY_WIN[1] for r in rows):
            out.append({"level": "WARN", "t": kt, "sound": None, "gain": None, "key": why,
                        "msg": f"{why}: no sound mark within {KEY_WIN[0]:+g}..{KEY_WIN[1]:+g} s of it (is its sound recorded?)"})
    return rows, out


# ------------------------------------------------------------------ the finished mix
SR = 24000
MIX_RHO = 0.2         # the sound's own waveform must explain this much of the mix (normalised correlation) ...
MIX_OVER_NULL = 2.0   # ... and this many times its correlation with the same mix seconds away (tonal sounds match voice)
NULL_AT = (-7.0, -5.0, -3.5, 3.5, 5.0, 7.0)


def pcm(path, sr=SR):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    import numpy as np
    return np.frombuffer(raw, np.float32)


def templates(event, pitch=1.0, dur=0.8):
    """The event's variants as audio.Mixer plays them (pitch = rate change), first `dur` s, via audio.py's cache."""
    sys.path.insert(0, str(ROOT))
    import audio
    defs = json.loads(audio.asset("minecraft/sounds.json").read_text())
    out = []
    for v in defs[event]["sounds"]:
        v = {"name": v} if isinstance(v, str) else v
        if v.get("type") == "event":
            out += templates(v["name"], pitch * v.get("pitch", 1.0), dur)
            continue
        x = pcm(audio.asset(f"minecraft/sounds/{v['name']}.ogg"), int(SR / (pitch * v.get("pitch", 1.0))))[: int(dur * SR)]
        if len(x) > SR // 50:   # its audible part only (a short click padded with silence matches anything)
            import numpy as np
            env = np.convolve(np.abs(x), np.ones(SR // 100) / (SR // 100), "same")
            loud = np.nonzero(env >= env.max() * 10 ** (-30 / 20))[0]
            x = x[: max(SR // 20, int(loud[-1]) + 1)] if len(loud) else x
            out.append(x - x.mean())
    return out


def correlation(x, t, tpls, slack=0.25):
    """The best normalised correlation of any template with the mix, its start within t +- slack s."""
    import numpy as np
    best = 0.0
    for s in tpls:
        i0 = max(0, int((t - slack) * SR))
        seg = x[i0:i0 + len(s) + int(2 * slack * SR)].astype(np.float64)
        if len(seg) < len(s):
            continue
        n = len(seg) + len(s)
        c = np.fft.irfft(np.fft.rfft(seg, n) * np.conj(np.fft.rfft(s, n)), n)[: len(seg) - len(s) + 1]
        e = np.sqrt(np.maximum(np.convolve(seg ** 2, np.ones(len(s)), "valid"), 1e-12))
        best = max(best, float((np.abs(c) / (e * np.linalg.norm(s) + 1e-9)).max()))
    return best


def presence(x, t, event, pitch=1.0):
    """(rho at t, rho of the same templates elsewhere in the mix: the median over NULL_AT)."""
    import numpy as np
    tpls = templates(event, pitch)
    rho = correlation(x, t, tpls)
    null = [correlation(x, t + d, tpls) for d in NULL_AT if 0.5 < t + d < len(x) / SR - 1]
    return rho, float(np.median(null)) if null else 0.0


def short_clock(rec, edit):
    """recording s -> Short s, the way the edit trims and warps (scripts/key_sounds.package_clock)."""
    sys.path.insert(0, str(ROOT / "scripts"))
    from timewarp import Warp, edit_spans
    from retention import hook_len
    spans = edit_spans(edit.get("speed"), edit.get("slowmo"), edit.get("freeze"))
    warp = Warp(spans, rec["timeline"]) if spans else None
    out = (lambda s: warp.out(s)) if warp else (lambda s: s)
    ev = {}
    for e in rec["timeline"]:
        ev.setdefault(e["event"], out(e["t"] / 1000))
    start = float(edit.get("start", 0))
    if edit.get("startAt"):
        k, off = edit["startAt"].rsplit(":", 1)
        if k in ev:
            start = max(0.0, ev[k] + float(off))
    return lambda s: out(s) - start + hook_len(edit)


def mix_findings(video, rec, rows, edit, measure=()):
    """For each key / payoff sound (and each mark of the `measure` events), its band's rise in the mp4 -> findings."""
    x = pcm(video)
    clock = short_clock(rec, edit or {})
    best = {}
    for r in rows:
        if r["key"] or r["sound"] in measure:
            r = {**r, "key": r["key"] or "measured"}
            k = (r["key"], round(r["t"] * 2) / 2)
            if k not in best or r["gain"] > best[k]["gain"]:
                best[k] = r
    out = []
    for r in sorted(best.values(), key=lambda r: r["t"]):
        ts = clock(r["t"])
        try:
            rho, null = presence(x, ts, r["sound"], r.get("pitch", 1.0))
        except Exception as e:
            out.append({"level": "INFO", "t": r["t"], "sound": r["sound"], "msg": f"mix: {r['sound']}: no file to measure ({e})"})
            continue
        heard = rho >= MIX_RHO and rho >= MIX_OVER_NULL * null
        lvl = "OK" if heard else "WARN"   # a report: quiet-by-design sounds (a drink, a far horn) correlate weakly
        out.append({"level": lvl, "t": r["t"], "short_t": round(ts, 2), "sound": r["sound"], "rho": round(rho, 3), "null": round(null, 3),
                    "msg": f"mix: {r['key']} {r['sound']} at {ts:.2f} s of the Short: its waveform correlates {rho:.2f} with the mix "
                           f"(elsewhere {null:.2f}; heard: >= {MIX_RHO:g} and >= {MIX_OVER_NULL:g}x)"
                           + ("" if heard else ": NOT FOUND in the mix (too quiet, or covered: listen)")})
    return out


# ------------------------------------------------------------------ CLI
def load_rec(p):
    p = pathlib.Path(p)
    return json.loads(gzip.decompress(p.read_bytes()) if p.suffix == ".gz" else p.read_text())


def stunt_edit(name, stunt_file=None):
    js = ("const m=require(process.argv[1]);process.stdout.write(JSON.stringify(m.edit||{}))")
    f = pathlib.Path(stunt_file).resolve() if stunt_file else ROOT / "stunts" / f"{name}.js"
    if not f.exists():
        return {}
    r = subprocess.run(["node", "-e", js, str(f)], capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout or "{}") if r.returncode == 0 else {}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("rec", nargs="?")
    ap.add_argument("--stunt", help="stunts/<name>.js: its edit (keySounds, startAt, story)")
    ap.add_argument("--stunt-file", help="the stunt module (default stunts/<stunt>.js; e.g. a package's source/<name>.js)")
    ap.add_argument("--story", help="stories/<name> (default: the edit's story)")
    ap.add_argument("--video", help="the finished Short: measure each key / payoff sound in the mix")
    ap.add_argument("--measure", action="append", default=[], help="with --video: also measure every mark of this sound event")
    ap.add_argument("--mix-only", action="store_true", help="with --video: only the mix (rec_check already gates the levels)")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--all", action="store_true", help="list every sound mark with its level")
    ap.add_argument("--gen", action="store_true", help="rebuild lib/sound_volumes.json from work/'s sounds.json")
    a = ap.parse_args(argv)
    if a.gen:
        sys.path.insert(0, str(ROOT))
        import audio
        defs = json.loads(audio.asset("minecraft/sounds.json").read_text())
        env = dict(l.split("=", 1) for l in (ROOT / "versions.env").read_text().splitlines() if "=" in l and not l.startswith("#"))
        TABLE.write_text(json.dumps(gen_table(defs, env.get("MC_VERSION")), indent=1, sort_keys=True) + "\n")
        print(f"wrote {TABLE.relative_to(ROOT)}")
        return 0
    if not a.rec:
        ap.error("a recording")
    rec = load_rec(a.rec)
    edit = stunt_edit(a.stunt, a.stunt_file) if a.stunt or a.stunt_file else {}
    story = a.story or edit.get("story")
    story = str(ROOT / story) if story and not pathlib.Path(story).is_absolute() else story
    rows, fs = findings(rec, edit, story)
    if a.mix_only:
        fs = []
    if a.video:
        fs += mix_findings(a.video, rec, rows, edit, set(a.measure))
    nb = sum(f["level"] == "BLOCK" for f in fs)
    if a.json:
        print(json.dumps({"rows": rows if a.all else [r for r in rows if r["key"]], "findings": fs, "blockers": nb}, indent=1))
    else:
        if a.all:
            for r in rows:
                print(f"  {r['t']:7.2f}s  {r['sound']:<40} vol {r['volume']:<6g} x file {r['file']:<5g} = {r['gain']:.3f}" + (f"  [{r['key']}]" if r["key"] else ""))
        for f in fs:
            print(f"{f['level']:<5} [audible] {f['t']:7.2f}s (rec)  {f['msg']}")
        ks = sum(1 for r in rows if r["key"])
        print(f"sound levels: {len(rows)} sound marks, {ks} key/payoff, {nb} under the floor{' or missing from the mix' if a.video else ''}"
              f" ({'BLOCK' if nb else 'OK'})")
    return 1 if nb else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"sound levels could not run: {e}", file=sys.stderr)
        sys.exit(2)
