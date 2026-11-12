"""Is every character told apart from the narrator, and heard as their age and sex? (STANDARDS 2.7)

The owner caught both by ear: Light Sleeper's Mom (Sulafat) "is too similar to narrator" (r:rc31bfe), and Gold's
Grandma (Vindemiatrix) "sounds like a dude still" (r:rf8060c). This finds both without listening:

    ~/.hb-tts/bin/python scripts/voice_contrast.py stories/<name>              # table + verdict; exit 1 on a blocker
    ~/.hb-tts/bin/python scripts/voice_contrast.py stories/<name> --json
    ~/.hb-tts/bin/python scripts/voice_contrast.py stories/<name> --no-listen  # contrast + pitch only (no request)

It runs in `./hb voice` (after the take gate and the speaker/drift checks) and in `./hb check`.

CONTRAST (speaker_check's Resemblyzer embedding and pitch, the same story's takes): each character's lines (their mean
embedding) against the narrator's lines (their mean), and the median pitch of each in semitones. The bar is the
narrator against itself: each narrator line against the other narrator lines (leave-one-out), its 10th percentile,
held to 0.82-0.90. A character as close to the narrator as the narrator's own lines are to each other can't be told
apart at first hearing:
  BLOCK   similarity >= the bar, or within CLOSE (0.03) of it at under SAME_ST (2) semitones from the narrator
  WARN    within CLOSE of the bar, but apart in pitch
Calibration (brand/auditions/2026-11-11_mom_grandma): Sulafat's Mom L05 is 0.853 to Pip at Pip's own 215 Hz (the
owner's "too similar"); the Mom candidates are 0.755-0.799, 3-5 semitones under; Pip's lines are 0.836 (p10) to each
other. Here Light Sleeper's Mom is 0.86 to its narrator (bar 0.846, 1.4 st): BLOCK.

READ WAIVER: a story cast entry's `"read_waiver": "who: why"` turns that character's READ blockers into WAIVED
(printed with the reason; not a blocker). Only the read: a contrast BLOCK is never waived. Light Sleeper's Mom
(2026-11-12): the owner picked Pulcherrima, and the backwards listener hears the owner's own audition clip as a man.

READ (the age and sex the cast entry asks for, `reads_as: {"sex": "female", "age": [55, 85]}` in voices/cast.json or
the story's cast; else from the role's name: Grandma, Grandpa, Mom, Dad...): every character line goes to the blind
listener (scripts/who.py, played BACKWARDS so it hears the voice and not the words: forwards, "One's plenty,
sweetie" made Vindemiatrix a grandmother; backwards she is "a man, deep, raspy, gravelly"). Answers are cached by
the take's hash in voices/who_cache.json. The pitch is the second witness:
  female    >= 180 Hz agrees, 150-180 can't tell, < 150 disagrees
  male      <= 150 Hz agrees (a teen <= 180), up to 200 (a teen 260) can't tell, above disagrees
  a child   pitch can't tell the sex
  BLOCK   the listener hears the other sex AND the pitch doesn't confirm the intended one (Vindemiatrix: man, 170 Hz)
  WARN    only one of the two disagrees; or the listener's age range misses the intended band by more than 10 years
  NOTE    no listener answer (quota, offline, --no-listen): the pitch alone, which warns at most
"""
import json
import pathlib
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

BAR_PCT = 10            # the narrator's leave-one-out similarity percentile that is the bar
BAR_MIN, BAR_MAX = 0.82, 0.90
BAR_FEW = 0.84          # the bar when the narrator has under MIN_LINES lines
MIN_LINES = 4
CLOSE = 0.03            # within this of the bar = close
SAME_ST = 2.0           # semitones: under this = the same pitch as the narrator
AGE_SLACK = 10          # years the listener's range may miss the intended band by before a WARN

# the age and sex a role's name implies, when neither the story's cast nor voices/cast.json says (`reads_as`)
NAMED = [("grandma", "female", [55, 85]), ("granny", "female", [55, 85]), ("grandmother", "female", [55, 85]),
         ("grandpa", "male", [55, 85]), ("grandfather", "male", [55, 85]), ("elder", "male", [55, 85]),
         ("mom", "female", [25, 55]), ("mother", "female", [25, 55]), ("mum", "female", [25, 55]),
         ("dad", "male", [25, 55]), ("father", "male", [25, 55]), ("aunt", "female", [20, 60]), ("uncle", "male", [20, 60])]


# ---- the pure rules (unit-tested in scripts/test_voice_contrast.py) ----

def bar(loo):
    """The narrator-against-itself bar from its lines' leave-one-out similarities."""
    if len(loo) < MIN_LINES:
        return BAR_FEW
    return float(min(BAR_MAX, max(BAR_MIN, np.percentile(loo, BAR_PCT))))


def contrast(sim, st, b):
    """-> (level, why) for a character at embedding similarity sim and st semitones from the narrator, bar b."""
    if sim >= b:
        return "BLOCK", f"as close to the narrator as the narrator's own lines ({sim:.3f} >= {b:.3f}): told apart at first hearing? no (re-cast: STANDARDS 2.7, r:rc31bfe)"
    if sim >= b - CLOSE and st < SAME_ST:
        return "BLOCK", f"close to the narrator ({sim:.3f}, bar {b:.3f}) at the narrator's pitch ({st:.1f} st): re-cast (r:rc31bfe)"
    if sim >= b - CLOSE:
        return "WARN", f"close to the narrator in timbre ({sim:.3f}, bar {b:.3f}), apart in pitch ({st:.1f} st): listen"
    return "ok", f"{sim:.3f} to the narrator (bar {b:.3f}), {st:.1f} st apart"


def sex_of(word):
    w = str(word or "").lower()
    if w in ("woman", "girl", "female", "f"):
        return "female"
    if w in ("man", "boy", "male", "m"):
        return "male"
    return None


def pitch_read(f0, sex, age):
    """Does the median pitch confirm the intended sex? -> 'agrees' | 'unsure' | 'disagrees'."""
    lo = (age or [30])[0]
    if not f0 or not sex or lo < 13:
        return "unsure"
    if sex == "female":
        return "agrees" if f0 >= 180 else "unsure" if f0 >= 150 else "disagrees"
    ok, top = (180, 260) if lo < 18 else (150, 200)
    return "agrees" if f0 <= ok else "unsure" if f0 <= top else "disagrees"


def age_gap(heard, want):
    """Years between the listener's age range and the intended band (0 when they overlap)."""
    if not heard or not want:
        return 0
    return max(0.0, heard[0] - want[1], want[0] - heard[1])


def read_verdict(want, f0, heard):
    """-> (level, why) for one line: want = {'sex', 'age'}, heard = the listener's answer (or None)."""
    sex, age = want.get("sex"), want.get("age")
    p = pitch_read(f0, sex, age)
    hs = sex_of(heard.get("sex")) if heard else None
    desc = f"heard as {heard.get('sex')} {fmt_age(heard.get('age'))} ({heard.get('voice') or ''})".rstrip(" ()") if heard else "no listener answer"
    want_s = f"{sex or '?'} {fmt_age(age)}"
    if heard and sex and hs and hs != sex:
        if p != "agrees":
            return "BLOCK", f"{desc}, pitch {f0:.0f} Hz doesn't say {sex} either; wants {want_s} (re-cast: STANDARDS 2.7, r:rf8060c)"
        return "WARN", f"{desc}, but {f0:.0f} Hz is {sex}; wants {want_s}: listen"
    if p == "disagrees":
        return "WARN", f"pitch {f0:.0f} Hz isn't {sex}; {desc}; wants {want_s}: listen"
    g = age_gap(age_range(heard.get("age")) if heard else None, age)
    if g > AGE_SLACK:
        return "WARN", f"{desc}: {g:.0f} years off the {fmt_age(age)} it wants: listen"
    if not heard:
        return "NOTE", f"{desc}; pitch {f0:.0f} Hz {p} for {want_s}"
    return "ok", f"{desc}; pitch {f0:.0f} Hz {p}"


def fmt_age(a):
    a = age_range(a)
    return f"{a[0]:.0f}-{a[1]:.0f}" if a else "?"


def age_range(a):
    if a is None:
        return None
    import who
    return who.age_range(a)


def reads_as(key, entry, cast):
    """The intended {'sex', 'age'} for a story cast entry: its own reads_as, its voices/cast.json ref's, else its name's."""
    if entry.get("reads_as"):
        return entry["reads_as"]
    ref = cast.get(entry.get("ref") or "", {})
    if isinstance(ref, dict) and ref.get("reads_as"):
        return ref["reads_as"]
    for n in (key, entry.get("name"), entry.get("ref")):
        n = str(n or "").lower()
        for word, sex, age in NAMED:
            if n == word or n.startswith(word + " ") or n.endswith(" " + word):
                return {"sex": sex, "age": age}
    return None


def narrator_key(story_cast):
    for k, v in story_cast.items():
        if isinstance(v, dict) and v.get("role") == "narrator":
            return k
    return "N" if "N" in story_cast else None


# ---- the measure ----

def unit(v):
    v = np.asarray(v, dtype=np.float64)
    return v / (np.linalg.norm(v) or 1)


def check(d, listen=True, cast_file=ROOT / "voices" / "cast.json", measure=None, hearer=None):
    """-> {'rows': [...], 'findings': [...], 'narrator': {...}}. measure(path) -> (embedding, f0) and hearer(path,
    label) -> (answer, status) are injectable for tests."""
    d = pathlib.Path(d)
    story = json.loads((d / "story.json").read_text())
    vj = json.loads((d / "voice" / "voice.json").read_text())
    cast = json.loads(pathlib.Path(cast_file).read_text())
    sc = story.get("cast") or {}
    nk = narrator_key(sc)
    if measure is None:
        import speaker_check as S

        def measure(p):
            x = S.trim(S.load(p))
            return S.embed(x), S.f0(x)
    if hearer is None:
        import who

        def hearer(p, label):
            return who.cached(p, listen=listen, label=label)
    st = lambda a, b: abs(12 * np.log2(a / b)) if a and b else 0.0  # noqa: E731
    lines = {k: v for k, v in vj.get("lines", {}).items() if (d / "voice" / f"{k}.wav").exists()}
    M = {k: measure(d / "voice" / f"{k}.wav") for k in lines}
    N = [k for k in lines if lines[k].get("who") == nk]
    out = {"story": str(d), "narrator": {"who": nk, "lines": len(N)}, "rows": [], "findings": []}
    if not N:
        out["note"] = f"no narrator lines ({nk!r}) with a take: nothing to compare"
        return out
    nE = unit(np.mean([M[k][0] for k in N], 0))
    nF = float(np.median([M[k][1] for k in N if M[k][1]] or [0]))
    loo = [float(unit(M[k][0]) @ unit(np.mean([M[j][0] for j in N if j != k], 0))) for k in N] if len(N) > 1 else []
    b = bar(loo)
    out["narrator"].update({"f0": round(nF), "bar": round(b, 3), "loo_median": round(float(np.median(loo)), 3) if loo else None})
    chars = sorted({lines[k]["who"] for k in lines} - {nk})
    for c in chars:
        ids = [k for k in lines if lines[k]["who"] == c]
        cE = unit(np.mean([M[k][0] for k in ids], 0))
        cF = float(np.median([M[k][1] for k in ids if M[k][1]] or [0]))
        sim = float(cE @ nE)
        lvl, why = contrast(sim, st(cF, nF), b)
        row = {"who": c, "lines": ids, "sim": round(sim, 3), "f0": round(cF), "st": round(st(cF, nF), 1), "contrast": lvl,
               "per_line": {k: {"sim": round(float(unit(M[k][0]) @ nE), 3), "f0": round(M[k][1])} for k in ids}}
        out["findings"].append({"level": lvl, "check": "contrast", "who": c, "lines": ids, "msg": why})
        want = reads_as(c, sc.get(c, {}), cast)
        row["reads_as"] = want
        if want:
            for k in ids:
                heard, how = hearer(d / "voice" / f"{k}.wav", f"{d.name}/{k}")
                lvl2, why2 = read_verdict(want, M[k][1], heard)
                if how.startswith("error") and lvl2 in ("NOTE", "ok"):
                    why2 += f" ({how})"
                row["per_line"][k].update({"heard": {x: heard.get(x) for x in ("sex", "age", "voice", "model")} if heard else None,
                                           "listener": how, "read": lvl2})
                waiver = (sc.get(c) or {}).get("read_waiver")   # a reviewed decision (story cast), never the contrast
                if lvl2 == "BLOCK" and waiver:
                    lvl2, why2 = "WAIVED", f"{why2} -- waived: {waiver}"
                    row["per_line"][k]["read"] = lvl2
                out["findings"].append({"level": lvl2, "check": "read", "who": c, "lines": [k], "msg": why2})
        else:
            out["findings"].append({"level": "NOTE", "check": "read", "who": c, "lines": ids,
                                    "msg": "no reads_as (voices/cast.json or the story's cast) and no age/sex in the name: the read isn't checked"})
        out["rows"].append(row)
    return out


def table(rep):
    n = rep["narrator"]
    o = [f"voice contrast: {rep['story']} (narrator {n['who']}, {n['lines']} lines, {n.get('f0', '?')} Hz; bar {n.get('bar', '?')} = "
         f"its lines' leave-one-out p{BAR_PCT}, median {n.get('loo_median')})"]
    if rep.get("note"):
        o.append("  " + rep["note"])
    for r in rep["rows"]:
        o.append(f"  {r['who']:10} {' '.join(r['lines']):12} sim {r['sim']:.3f}  {r['f0']:>3} Hz  {r['st']:>4} st  wants "
                 f"{(r['reads_as'] or {}).get('sex', '?')} {fmt_age((r['reads_as'] or {}).get('age'))}")
        for k, pl in r["per_line"].items():
            h = pl.get("heard")
            o.append(f"      {k} sim {pl['sim']:.3f} {pl['f0']:>3} Hz" + (f"  heard {h['sex']} {fmt_age(h['age'])} ({h.get('model')}, {pl['listener']})" if h else
                                                                           f"  listener: {pl.get('listener', '-')}"))
    for f in rep["findings"]:
        if f["level"] != "ok":
            o.append(f"{f['level']:5} {f['check']:8} {f['who']} {' '.join(f['lines'])}: {f['msg']}")
    nb = sum(f["level"] == "BLOCK" for f in rep["findings"])
    nw = sum(f["level"] == "WARN" for f in rep["findings"])
    o.append(f"{'FAIL' if nb else 'OK'}: {nb} blocker(s), {nw} warning(s)" + (" (re-cast from an audition: docs/stories.md house rules)" if nb else ""))
    return "\n".join(o)


def main(a):
    if not a or a[0].startswith("-"):
        print(__doc__)
        return 2
    d = pathlib.Path(a[0])
    if not (d / "voice" / "voice.json").exists():
        print(f"voice contrast: {d}: not voiced yet (no voice/voice.json): skipped")
        return 0
    rep = check(d, listen="--no-listen" not in a)
    print(json.dumps(rep, indent=1) if "--json" in a else table(rep))
    return 1 if any(f["level"] == "BLOCK" for f in rep["findings"]) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
