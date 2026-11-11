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

    def test_a_cut_to_another_angle_is_a_new_shot_and_each_angle_keeps_the_limit(self):
        # owner r:r66efa4: several steady angles joined by hard cuts. Angle 1 (a slow crane) until 5.6 s, then a cut to
        # angle 2 (40 blocks round the side, 80 deg turned) inside the first jump cut, marked by lib/time_lapse.js
        def cam(t):
            if t < 5.6:
                return (-8 + 0.1 * t, 12 + 0.08 * t, 52 + 0.6 * t, 0.0, -0.1)
            return (40 + 0.1 * t, 20, 8 + 0.2 * t, 1.4, -0.2)
        P = poses(cam)
        TL = [{"t": 5600, "event": "cut"}, {"t": 5600, "event": "angle", "n": 1}]
        rows = L.lapse_cuts(SPANS, TL, P)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["angle"], "marked")
        self.assertEqual(rows[0]["problems"], [])            # the change of angle: a new shot
        self.assertIsNone(rows[1]["angle"])
        self.assertEqual(rows[1]["problems"], [])            # the second cut, within angle 2: its slow move passes

        # the same angle swinging inside its own shots still blocks: angle 2 swings 8 blocks between its cuts
        def swing(t):
            if t < 5.6:
                return cam(t)
            return (40 + (8 if t > 11.5 else 0), 20, 8 + 0.2 * t, 1.4 + (0.2 if t > 11.5 else 0), -0.2)
        rows = L.lapse_cuts(SPANS, TL, poses(swing))
        self.assertEqual(rows[0]["problems"], [])
        self.assertTrue(rows[1]["problems"], rows[1])

    def test_an_unmarked_big_pose_change_is_a_new_angle_but_a_jerk_is_not(self):
        big = poses(lambda t: (0, 20, 0, 0.0, 0.0) if t < 5.6 else (45, 30, -10, 1.5, -0.3))   # 85 deg, 47 blocks
        r = L.lapse_cuts(SPANS[:3], [], big)[0]
        self.assertEqual((r["angle"], r["problems"]), ("pose", []))
        jerk = poses(lambda t: (0, 20, 0, 0.0, 0.0) if t < 5.6 else (10, 20, 4, 0.25, 0.0))     # 14 deg, 10.8 blocks
        r = L.lapse_cuts(SPANS[:3], [], jerk)[0]
        self.assertIsNone(r["angle"])
        self.assertTrue(r["problems"])


if __name__ == "__main__":
    unittest.main()
