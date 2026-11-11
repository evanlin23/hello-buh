"""scripts/pace.py: block placements in steady runs are events, so a build is never "dead" (lead 2026-11-11, pixel art:
7-20 blocks a second on screen through spans pace blocked), while a real 4 s of nothing still blocks."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pace  # noqa: E402


def place(t_s, sound="block.wool.place"):
    return {"t": int(t_s * 1000), "event": "sound", "sound": sound, "volume": 1}


def longest(events, dur):
    g = pace.gaps([(0.0, "start")] + events + [(dur, "end")])
    return g[0][2] if g else 0.0


class BuildEvents(unittest.TestCase):
    def test_a_steady_build_is_not_dead(self):
        tl = [place(1 + i * 0.1) for i in range(90)]            # 10 blocks a second, 1-10 s
        b = pace.build_events(tl, lambda t: t)
        self.assertEqual(len(b), 90)
        self.assertLessEqual(longest([(t, "block") for t in b], 11.0), pace.DEAD_WARN)

    def test_four_seconds_of_nothing_still_blocks(self):
        tl = [place(1 + i * 0.1) for i in range(20)] + [place(7 + i * 0.1) for i in range(20)]   # nothing 2.9-7 s
        b = pace.build_events(tl, lambda t: t)
        self.assertGreater(longest([(t, "block") for t in b], 9.0), pace.DEAD_BLOCK)

    def test_a_stray_block_or_other_sound_is_not_a_build(self):
        tl = [place(2.0), place(5.0), {"t": 3000, "event": "sound", "sound": "entity.sheep.ambient"}]
        self.assertEqual(pace.build_events(tl, lambda t: t), [])

    def test_breaks_and_place_marks_count_and_cut_spans_drop(self):
        tl = [place(1.0, "block.stone.break"), {"t": 1300, "event": "place"}, {"t": 1600, "event": "dig_end"}]
        self.assertEqual(pace.build_events(tl, lambda t: None if t > 1.5 else t), [1.0, 1.3])


if __name__ == "__main__":
    unittest.main()


class BuildStall(unittest.TestCase):
    """r:r478786: a marked build (X_start .. X_done) never goes over 1 s of output time without a block."""

    def tl(self, places, a=0.0, b=10.0, name="mid"):
        return [{"t": int(a * 1000), "event": f"{name}_start"}] + [place(t) for t in places] + [{"t": int(b * 1000), "event": f"{name}_done"}]

    def test_a_walk_with_no_block_mid_build_stalls(self):
        tl = self.tl([0.2 + i * 0.15 for i in range(10)] + [6.0 + i * 0.15 for i in range(10)])   # nothing 1.55-6.0 s
        st = pace.build_stalls(tl, lambda t: t / 3)                                               # a 3x time-lapse
        self.assertEqual(len(st), 1)
        self.assertGreater(st[0][3], pace.STALL_S)

    def test_the_same_walk_sped_up_does_not(self):
        tl = self.tl([0.2 + i * 0.15 for i in range(10)] + [6.0 + i * 0.15 for i in range(10)])
        fast = lambda t: t / 3 if t < 1.6 else (1.6 / 3 + (t - 1.6) / 8 if t < 6.0 else 1.6 / 3 + 4.4 / 8 + (t - 6.0) / 3)
        self.assertEqual(pace.build_stalls(tl, fast), [])

    def test_after_the_last_block_and_outside_builds_is_not_a_stall(self):
        tl = [place(0.1), place(0.2)] + self.tl([1.0 + i * 0.2 for i in range(10)], a=1.0, b=9.0) + [place(20.0)]
        self.assertEqual(pace.build_stalls(tl, lambda t: t), [])

    def test_a_stall_across_a_cut_counts_output_time(self):
        tl = self.tl([0.1 + i * 0.2 for i in range(5)] + [5.0 + i * 0.2 for i in range(5)])
        self.assertEqual(pace.build_stalls(tl, lambda t: t if t < 1.0 else (1.0 + (t - 4.8) if t > 4.8 else 1.0)), [])
