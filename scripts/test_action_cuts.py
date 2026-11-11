"""scripts/action_cuts.py: no edit cut in the middle of a dig, place or use (owner r:r52f94c, pickaxe_race)."""
import math
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import action_cuts as C  # noqa: E402

INF = math.inf


def dig(t0, t1, slot=0, x=1):
    return [{"t": t0 * 1000, "event": "dig", "x": x, "y": 64, "z": 0, "slot": slot}, {"t": t1 * 1000, "event": "dig_end", "ok": True, "slot": slot}]


class ActionCuts(unittest.TestCase):
    def test_a_cut_that_starts_inside_a_dig_blocks(self):
        rows = C.action_cuts([(0, 1.5, 1.0), (1.5, 3.0, INF), (3.0, 9, 1.0)], dig(1.0, 2.0))
        self.assertTrue(any(r["edge"] == "starts" for r in rows), rows)

    def test_a_cut_that_ends_inside_a_place_swing_blocks(self):
        rows = C.action_cuts([(0, 1.0, 1.0), (1.0, 2.1, INF), (2.1, 9, 1.0)], [{"t": 2000, "event": "place_on", "x": 1, "y": 2, "z": 3}])
        self.assertEqual([r["edge"] for r in rows], ["ends"])

    def test_a_cut_between_two_separate_actions_is_quiet(self):
        tl = dig(1.0, 2.0, slot=0) + [{"t": 4500, "event": "place_on", "x": 1, "y": 2, "z": 3}]
        self.assertEqual(C.action_cuts([(0, 2.5, 1.0), (2.5, 4.0, INF), (4.0, 9, 1.0)], tl), [])

    def test_a_jump_cut_inside_one_wall_of_back_to_back_digs_blocks(self):
        # pickaxe_race: rests of 0.5 s between nine digs with one pick, the cut on two of the rests
        tl = []
        for k in range(9):
            tl += dig(1 + k * 1.3, 1.8 + k * 1.3, slot=0, x=k)
        rows = C.action_cuts([(0, 4.85, 1.0), (4.85, 9.95, INF), (9.95, 20, 1.0)], tl)
        self.assertEqual([r["edge"] for r in rows], ["sits"], rows)

    def test_a_cut_between_two_tools_is_quiet(self):
        tl = dig(1.0, 2.0, slot=0) + dig(2.4, 3.0, slot=1)
        self.assertEqual(C.action_cuts([(0, 2.1, 1.0), (2.1, 2.3, INF), (2.3, 9, 1.0)], tl), [])

    def test_a_time_lapse_jump_cut_is_left_to_lapse_cuts(self):
        tl = []
        for k in range(9):
            tl += dig(1 + k * 0.6, 1.4 + k * 0.6, slot=0, x=k)
        self.assertEqual(C.action_cuts([(0, 2.65, 3.0), (2.65, 3.3, INF), (3.3, 9, 3.0)], tl), [])


if __name__ == "__main__":
    unittest.main()
