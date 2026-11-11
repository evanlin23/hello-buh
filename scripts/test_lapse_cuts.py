"""scripts/lapse_cuts.py: a time-lapse's jump cuts keep one steady camera (owner r:r200cfe, lapse_rocket)."""
import math
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import lapse_cuts as L  # noqa: E402


def poses(cam):
    """cam(t_s) -> (x, y, z, yaw, pitch); one pose a tick for 20 s."""
    return [[i, *cam(i / 20)] for i in range(400)]


SPANS = [(0.0, 5.0, 3.0), (5.0, 6.2, math.inf), (6.2, 11.0, 3.0), (11.0, 12.2, math.inf), (12.2, 18.0, 3.0)]


class LapseCuts(unittest.TestCase):
    def test_a_swinging_rail_jumps_across_the_cuts(self):
        P = poses(lambda t: (10 * math.sin(t / 2), 20 + t, 40 + 5 * t, t / 3, -0.2))     # ~5 blocks a second, swinging
        rows = L.lapse_cuts(SPANS, [], P)
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(r["problems"] for r in rows))

    def test_one_slow_crane_is_quiet(self):
        P = poses(lambda t: (-8 + 0.1 * t, 12 + 0.08 * t, 52 + 0.6 * t, 0.0, -0.1 + 0.002 * t))
        rows = L.lapse_cuts(SPANS, [], P)
        self.assertEqual(len(rows), 2)
        self.assertEqual([r["problems"] for r in rows], [[], []])

    def test_a_teleport_between_builds_and_cuts_out_of_real_time_are_not_lapse_cuts(self):
        P = poses(lambda t: (0 if t < 5.5 else 60, 20, 0, 0.0 if t < 5.5 else 2.0, 0.0))
        self.assertEqual(L.lapse_cuts(SPANS[:3], [{"t": 5000, "event": "cut"}], P), [])   # the stunt's own teleport cut
        self.assertEqual(L.lapse_cuts([(0.0, 5.0, 1.0), (5.0, 6.2, math.inf), (6.2, 11.0, 3.0)], [], P), [])   # from real time


if __name__ == "__main__":
    unittest.main()
