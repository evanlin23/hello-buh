"""Tests for scripts/cast_motion.py (rec_check's cast checks, docs/STANDARDS.md 3b.2). Synthetic recordings only.
Run: python3 -m unittest scripts/test_cast_motion.py (npm test runs it through lib/hb/test/motion.test.js)."""
import math
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import cast_motion as CM  # noqa: E402


def row(t, eid, x, z=0.0, y=64.0, yaw=0.0, name="villager"):
    return [t, eid, name, x, y, z, yaw, 0, yaw, None]


def path(eid, t0, t1, every=1, x0=0.0, speed=0.15, name="villager"):
    """a walk sampled the way the client got it: a new position every `every` ticks"""
    out = []
    for t in range(t0, t1):
        k = t - (t - t0) % every
        out.append(row(t, eid, x0 + speed * (k - t0), name=name))
    return out


POSES = [[t, 0, 64, 0, 0, 0] for t in range(400)]


class CastMotion(unittest.TestCase):
    def test_stepped_cast_is_flagged_and_20hz_passes(self):
        ents = path(1, 0, 80, every=3) + path(2, 0, 80, every=1, x0=5)
        tl = [{"t": 0, "event": "actor", "tag": "old", "id": 1}, {"t": 0, "event": "actor", "tag": "pip", "id": 2}]
        f = CM.stepped(ents, tl, POSES)
        self.assertEqual([x["id"] for x in f], [1])
        self.assertEqual(f[0]["every"], 3)
        self.assertEqual(f[0]["tag"], "old")

    def test_occasional_hold_at_20hz_passes(self):
        # the live K.actor (2026-11-10 _cast_test): every tick, with a single held tick now and then (packets bunching)
        ents, x = [], 0.0
        for t in range(80):
            if t % 7 != 3 and t % 23 != 4:
                x += 0.1
            ents.append(row(t, 2, x))
        tl = [{"t": 0, "event": "actor", "tag": "pip", "id": 2}]
        self.assertEqual(CM.stepped(ents, tl, POSES), [])

    def test_keepalive_jitter_is_not_motion(self):
        ents = [row(t, 3, 0.002 if (t // 3) % 2 else -0.002) for t in range(60)]
        tl = [{"t": 0, "event": "actor", "tag": "dog", "id": 3}]
        self.assertEqual(CM.stepped(ents, tl, POSES), [])

    def test_late_landing_after_a_shot_mark(self):
        # placed 1.8 blocks with the 'beg' shot at tick 100, but the client has it there only at 102 (dog_hill)
        ents = [row(t, 5, 0.0 if t < 102 else 1.8) for t in range(90, 120)]
        tl = [{"t": 0, "event": "actor", "tag": "pip", "id": 5}, {"t": 100 * 50, "event": "shot", "name": "beg"}]
        f = CM.late_landings(ents, tl, POSES)
        self.assertEqual(len(f), 1)
        self.assertEqual((f[0]["late"], f[0]["cut"]), (2, 100))
        # K.cutShot: the mark waits for the landing, so it is on the same tick: clean
        tl2 = [tl[0], {"t": 102 * 50, "event": "shot", "name": "beg"}]
        self.assertEqual(CM.late_landings(ents, tl2, POSES), [])

    def test_a_cut_counts_from_the_player_landing(self):
        # K.cut marks 'cut' before its /tp; the camera lands 2 ticks later, the cast with it: clean. 2 ticks after that: late
        poses = [[t, 0 if t < 52 else 30, 64, 0, 0, 0] for t in range(100)]
        tl = [{"t": 0, "event": "actor", "tag": "mom", "id": 6}, {"t": 50 * 50, "event": "cut"}]
        on = [row(t, 6, 0.0 if t < 52 else 31) for t in range(40, 70)]
        late = [row(t, 6, 0.0 if t < 54 else 2) for t in range(40, 70)]
        self.assertEqual(CM.late_landings(on, tl, poses), [])
        self.assertEqual([f["late"] for f in CM.late_landings(late, tl, poses)], [2])

    def test_cast_without_actor_marks(self):
        # an older recording: Pip comes in from the sky park (a 70-block jump), a village donkey wanders in 3-tick steps
        pip = [row(t, 7, 70.0 if t < 102 else 0.0) for t in range(90, 140)] + path(7, 140, 200, every=3)
        donkey = path(8, 90, 200, every=3, x0=10, speed=0.3, name="donkey")
        tl = [{"t": 100 * 50, "event": "shot", "name": "beg"}]
        self.assertEqual(set(CM.cast_ids(CM.tracks(pip + donkey), tl)), {7})
        msgs = CM.messages(pip + donkey, tl, POSES)
        self.assertEqual(len(msgs), 2)
        self.assertTrue(any("2 tick(s) after the cut" in m for _, m in msgs))
        self.assertTrue(any("stair steps" in m for _, m in msgs))

    def test_marked_cast_only(self):
        # with 'actor' marks, ambient mobs are never checked (render.js eases them like the vanilla client)
        ents = path(1, 0, 80, every=1) + [row(t, 9, 80.0 if t < 40 else 0.0, name="cow") for t in range(80)]
        tl = [{"t": 0, "event": "actor", "tag": "pip", "id": 1}, {"t": 38 * 50, "event": "shot", "name": "x"}]
        self.assertEqual(CM.messages(ents, tl, POSES), [])


if __name__ == "__main__":
    unittest.main()
