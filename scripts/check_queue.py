"""The posting mix for @HelloBuh (owner rules): never the same format twice in a row, at most 1 pixel-art per 3.

    python3 scripts/check_queue.py [../hb-videos]   # check uploads/queue.txt (after what's already uploaded)

series(name) is the format a Short belongs to; youtube_upload.py uses mix_ok() before every upload.
Exit 1 if the queue breaks a rule, names a Short that isn't on the videos branch, or repeats a title.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# format families: same-family Shorts never go up back to back
FAMILIES = [
    ("ai", lambda n: n.startswith("ai_")),
    ("lapse", lambda n: n.startswith("lapse_") or n in ("house_sizes",)),
    ("spot", lambda n: n.startswith("spot_wrong")),
    ("guess", lambda n: n.startswith("guess_sound")),
    ("worse", lambda n: n.startswith("worse_")),
    ("story", lambda n: n.startswith("story_")),
    ("dilemma", lambda n: n.startswith("dilemma_")),   # the mace and the dog... (docs/formats.md)
    ("psycho", lambda n: n.startswith("psycho_")),   # the fake psycho house tour (docs/formats.md, r:rc40696)
    ("fakerun", lambda n: n.startswith("fakerun_")),   # an obviously fake speedrun in jump cuts (lib/fakerun.js, r:r9105ba)
    ("sandart", lambda n: n.startswith("sandart_")),   # a huge picture poured from the sky in falling blocks (lib/sandart.js, r:r718ec5)
    ("art", lambda n: n.endswith("_art") or n == "looks_wrong"),
    ("clutch", lambda n: "clutch" in n or n in ("one_in_a_million",)),
    ("versus", lambda n: n in ("tnt_1000", "noob_pro_hacker", "villager_crowd", "speed_build")),
    ("inside", lambda n: n.startswith("inside_")),
    ("desire", lambda n: n.startswith("desire_")),
    ("cells", lambda n: n.startswith("cells_")),
    ("mislabel", lambda n: n.startswith("mislabel_")),
    ("race", lambda n: n.startswith("race_")),   # format race (lib/race.js, r:rbe60ef)
    ("interrupt", lambda n: n.startswith("interrupt_")),   # owner's pick 2026-11-11 (r:re05b89): a normal video, a mob interrupts
    ("hack", lambda n: n.startswith("hack_")),   # one real block trick per Short (docs/formats.md, r:rc15847)
    ("faketrick", lambda n: n.startswith("faketrick_")),   # an impossible "secret trick" played straight (lib/faketrick.js, r:rfcab11)
    ("mega", lambda n: n.startswith("mega_")),   # huge generated builds, flown round (owner 2026-11-11, r:r8bb1e3)
    ("cooked", lambda n: n.startswith("cooked_")),   # an impossible feat, then "X joined the game" on the drop (lib/cooked.js, r:r5ee125)
    ("love", lambda n: n.startswith("love_")),   # a cute heart build lit at night, made to be sent (owner 2026-11-11, r:rf91fef)
    ("herobrine", lambda n: n.startswith("herobrine_")),   # secret herobrine: the "lag" that never was (lib/herobrine.js, r:r047388)
    ("lucky", lambda n: n.startswith("lucky_")),   # fake super lucky: a dig where every block is luckier (r:r934ea4)
    ("fakeworld", lambda n: n.startswith("fakeworld_")),   # a whole world of one wrong block; one ordinary block is treasure (lib/fakeworld.js, r:r62f46d)
    ("dropper", lambda n: n.startswith("dropper_")),   # a huge first-person dropper: quick fails, the clean landing (lib/dropper.js, r:r304cb5)
    ("mobpov", lambda n: n.startswith("mobpov_")),   # a mob's annoying trait as an absurd POV chase (lib/mobpov.js, r:r8048f1)
    ("trap", lambda n: n.startswith("trap_")),   # trapping a friend: a bait over a real vanilla trap (lib/trap.js, r:refc733)
    ("logic", lambda n: n.startswith("logic_")),   # rapid real vanilla quirks, one caption (lib/logic.js, r:r40f7c7)
    ("underdog", lambda n: n.startswith("underdog_")),   # every mob gets X... but what about him? (lib/underdog.js, r:r8dcdb4)
    ("stages", lambda n: n.startswith("stages_")),   # 3 titled chapters (lib/stages.js, r:redb7c0)
    ("fakemod", lambda n: n.startswith("fakemod_")),   # a fake mod's popup, the choice plays out (lib/fakemod.js, r:rd551de)
    ("friend", lambda n: n.startswith("friend_")),   # that one friend, from my POV (owner 2026-11-11, r:ra64f79; lib/friend.js)
]


def series(name: str) -> str:
    for fam, f in FAMILIES:
        if f(name):
            return fam
    return name


def mix_ok(history: list, name: str) -> bool:
    """history: names already up, oldest first."""
    if history and series(history[-1]) == series(name):
        return False
    if series(name) == "art" and any(series(h) == "art" for h in history[-2:]):
        return False
    return True


def main():
    vd = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / "hb-videos")
    done = json.loads((ROOT / "uploads/uploads.json").read_text())
    hist = [k for k, _ in sorted(done.items(), key=lambda kv: kv[1].get("uploaded", ""))]
    q = [l.split("#")[0].strip() for l in (ROOT / "uploads/queue.txt").read_text().splitlines()]
    q = [x for x in q if x and x not in done]
    bad, titles = [], {v.get("title", "").strip() for v in done.values()}
    for n in q:
        m = vd / "shorts" / n / "metadata.json"
        if not m.exists():
            bad.append(f"{n}: not on the videos branch"); continue
        meta = json.loads(m.read_text())
        t = meta["youtube"]["title"].strip()
        if meta.get("status") != "ready":
            bad.append(f"{n}: status {meta.get('status')}")
        if t in titles:
            bad.append(f"{n}: title {t!r} repeats an earlier one")
        titles.add(t)
        if not mix_ok(hist, n):
            bad.append(f"{n}: breaks the mix after {hist[-1]} ({series(n)})")
        hist.append(n)
    print("\n".join(bad) if bad else f"queue OK: {len(q)} Shorts, {len(q)} days at 1 a day")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
