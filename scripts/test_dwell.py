"""The dwell check (scripts/dwell.py, r:r188b46): cut 0.3-0.6 s after an action's result reads; the end 0.5-0.8 s after
the payoff's result; smoke and particles never hold a cut. Run by lib/hb/test/dwell.test.js (npm test)."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dwell as DW  # noqa: E402


class Clock:
    """Output time = source time (no edit spans)."""
    def out_of_src(self, s):
        return round(s, 3)

    def at_out(self, o):
        return {"tick": o * 20}


def boom(s):
    return {"t": s * 1000, "event": "particles", "type": "explosion", "x": 0.5, "y": 64, "z": -5}


def rec(tl=(), ents=(), poses=None):
    return {"timeline": list(tl), "entities": list(ents),
            "poses": poses if poses is not None else [[k, 0.5, 64, 0.5, 0.0, 0.0, 0, 0] for k in range(400)]}


def check(r, edit, dur, payoff=None, text=False, news=()):
    bts = DW.beats(r, Clock(), edit)
    pr = None
    if payoff is not None:
        pr = max([payoff] + [b["reads"] for b in bts if b["result"] and abs(b["at"] - payoff) <= 0.15])
    return DW.check(bts, list(news), dur, payoff, pr, text, False, DW.busy_fn(r, Clock()))


class Dwell(unittest.TestCase):
    def test_tnt_waits_two_seconds_after_the_last_blast(self):
        # the owner's example (the queued tnt: chain 4.27-6.22 s, the crater flash at 8.50, the end 9.54)
        tl = [boom(t) for t in (4.27, 4.82, 4.97, 5.27, 5.57, 5.87, 6.22)] + [{"t": 8520, "event": "crater"}]
        F, s = check(rec(tl), {"endAfter": "crater:1.0", "flash": [["crater", 0, 0.35]]}, 9.54, payoff=8.52, news=[(8.5, "cut")])
        mids = [f for f in F if f[1] < 8.5]
        self.assertEqual(len(mids), 1)
        self.assertAlmostEqual(mids[0][1], 6.52, places=2)                  # the last blast's result (its frame: +0.3)
        self.assertIn("1.98 s after the blast", mids[0][2])
        self.assertEqual([f[0] for f in F if f[1] >= 8.5], ["WARN"])          # 1.02 s after the payoff: over 0.9
        self.assertAlmostEqual(s["end_tail"], 1.02, places=2)

    def test_a_chain_of_blasts_and_a_steady_build_never_dwell(self):
        tl = [boom(1.0 + 0.4 * k) for k in range(10)] + [{"t": (5.4 + 0.3 * k) * 1000, "event": "place"} for k in range(12)]
        F, s = check(rec(tl), {}, 9.4)
        self.assertEqual([f for f in F if f[0] != "WARN" or "past" not in f[2]], [])
        self.assertLessEqual(s["worst_mid"]["dwell"], 1.0)

    def test_the_end(self):
        tl = [{"t": 5000, "event": "reveal"}]
        edit = {"endAfter": "reveal:0.6", "sfx": [["impact", "reveal"]]}
        self.assertEqual(check(rec(tl), edit, 5.6, payoff=5.0)[0], [])           # 0.6 s: the owner's 0.5-0.8
        self.assertEqual([f[0] for f in check(rec(tl), edit, 6.0, payoff=5.0)[0]], ["WARN"])
        self.assertEqual([f[0] for f in check(rec(tl), edit, 6.5, payoff=5.0)[0]], ["BLOCK"])   # "wait forever"
        self.assertEqual(check(rec(tl), edit, 6.5, payoff=5.0, text=True)[0], [])   # a card / death screen reads 1.2-1.8 s

    def test_a_death_reads_after_its_fall_over(self):
        tl = [{"t": 5000, "event": "mob_death", "id": 3}]
        F, s = check(rec(tl), {}, 6.6, payoff=5.0)
        self.assertAlmostEqual(s["end_from"], 6.0)    # +1.0 s: a mob mid-death still holds the end
        self.assertEqual(F, [])

    def test_smoke_never_holds_but_the_action_going_on_does(self):
        # a blast at 2 s, then 2.5 s of only smoke before the next place: a dwell
        F, _ = check(rec([boom(2.0), {"t": 4800, "event": "place"}]), {}, 8.0)
        self.assertTrue(any("after the blast" in f[2] for f in F))
        # ... but a primed TNT in view (the next fuse burning) is the action going on: no dwell
        fuse = [[k, 50, "tnt", 0.5, 64, -5, 0, 0, None, None] for k in range(50, 96)]
        F, _ = check(rec([boom(2.0), {"t": 4800, "event": "place"}], fuse), {}, 8.0)
        self.assertFalse(any("after the blast" in f[2] for f in F))

    def test_busy(self):
        walk = [[k, 7, "zombie", 0.5 + 0.1 * k, 64, -6, 0, 0, None, None] for k in range(0, 40)]
        step = [[k, 8, "villager", 3.5 + (0.26 if k >= 20 else 0), 64, -6, 0, 0, None, None] for k in range(0, 40)]
        items = [[k, 9, "item", 0.5 + 0.3 * k, 65, -5, 0, 0, None, None] for k in range(0, 40)]
        B = DW.busy_ticks(rec([], walk))
        self.assertTrue(set(range(5, 25)) <= B)                               # a mob walking up
        self.assertEqual(DW.busy_ticks(rec([], step)), set())                 # one position step is not a walk
        self.assertEqual(DW.busy_ticks(rec([], items)), set())                # drifting debris is not action
        stepdown = [[k, 0.5, 64 - min(1.0, max(0, k - 100) * 0.25), 0.5, 0, 0, 0, 0] for k in range(200)]
        self.assertEqual(DW.busy_ticks(rec(poses=stepdown)), set())           # stepping down a block
        drop = [[k, 0.5, 100 - max(0, k - 100) * 0.6, 0.5, 0, 0, 0, 0] for k in range(200)]
        self.assertIn(150, DW.busy_ticks(rec(poses=drop)))                    # a drop is the action

    def test_edit_marks(self):
        edit = {"sfx": [["riser", "lit", "boom"], ["boom", "boom"], ["air", "start", "crater"], ["whoosh", "cut1b"], ["impact", "crater"]],
                "flash": [["crater", 0, 0.3]], "cards": [["lit", "1/10", 0.9]], "endAfter": "settle:0.5", "dropAt": "boom"}
        hit = {(ev, off) for ev, off, why, h in DW.edit_marks(edit) if h}
        news = {ev for ev, off, why, h in DW.edit_marks(edit)}
        self.assertEqual(hit, {("boom", 0.0), ("crater", 0.0)})              # the riser's lit, a card, a whoosh: news only
        self.assertEqual(news, {"lit", "boom", "cut1b", "crater"})            # settle (the end) and the air bed: not beats

    def test_a_repeated_mark_counts_at_the_occurrence_the_edit_names(self):
        # hack_banner_door: a pop + a sub on each reveal (sfx {nth}, sub's 4th field); a break at 3.0 s, the 3rd reveal at
        # 3.8 s is the next beat (only the first reveal counted before: 3.0 -> the payoff at 6.0 read as a 2.9 s dwell)
        tl = [{"t": 1000, "event": "reveal"}, {"t": 2000, "event": "reveal"}, {"t": 3000, "event": "dig_end"},
              {"t": 3800, "event": "reveal"}, {"t": 6000, "event": "payoff"}]
        edit = {"sfx": [["pop", "reveal", {"nth": k}] for k in range(3)] + [["impact", "payoff"]],
                "subs": [["reveal", "c", 1.0, 2]], "endAfter": "payoff:0.6"}
        news = {(ev, n) for ev, off, why, h, n in DW.edit_marks(edit, nth=True)}
        self.assertIn(("reveal", 2), news)
        F, s = check(rec(tl), edit, 6.6, payoff=6.0)
        self.assertEqual(F, [])
        self.assertLessEqual(s["worst_mid"]["dwell"], 0.75)

    def test_a_card_counts_at_its_nth_occurrence(self):
        # guess_sound: each round's answer card on 'lit' (the card's 5th field is the occurrence)
        tl = [{"t": 1000, "event": "lit"}, {"t": 4000, "event": "place"}, {"t": 4050, "event": "lit"}, {"t": 8000, "event": "end_mark"}]
        edit = {"cards": [["lit", "COW", 1.25, "green", 0], ["lit", "LLAMA", 1.25, "green", 1]]}
        news = {(ev, n) for ev, off, why, h, n in DW.edit_marks(edit, nth=True)}
        self.assertEqual(news, {("lit", 0), ("lit", 1)})
        bts = DW.beats(rec(tl), Clock(), edit)
        self.assertIn(4.05, [b["at"] for b in bts if b["name"] == "lit"])


if __name__ == "__main__":
    unittest.main()
