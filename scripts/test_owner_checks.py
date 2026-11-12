"""Owner notes as checks (2026-11-11): scripts/owner_checks.py's aim rules (r:rffba12) and settle tracks (r:r24d99a),
and pace's edit captions (half_heart's subs counted as events)."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import owner_checks as OC  # noqa: E402


def acts(degs, on=True):
    return {"aim": {"actions": [{"kind": "place", "tick": 10 + i, "deg": d, "onScreen": on, "what": "stone", "x": 0, "y": 64, "z": i}
                                for i, d in enumerate(degs)]}}


class Aim(unittest.TestCase):
    def test_clean_build_passes(self):   # creeper_art: median 0, 5% over 6 deg, worst 12.1
        r = OC.aim_report(acts([0] * 170 + [7] * 9 + [12.1]), lambda t: True)
        self.assertTrue(r["ok"], r["findings"])
        self.assertTrue(any(lvl == "WARN" for lvl, _, _ in r["findings"]))

    def test_build_that_doesnt_track_blocks(self):   # heart_art: 72% over 6 deg
        r = OC.aim_report(acts([0] * 30 + [11] * 80), lambda t: True)
        self.assertFalse(r["ok"])
        self.assertIn("doesn't track", " ".join(m for _, _, m in r["findings"]))

    def test_one_far_off_action_blocks(self):   # rainbow_sheep's first dye: 21 deg
        r = OC.aim_report(acts([0, 0, 0, 21.3]), lambda t: True)
        self.assertFalse(r["ok"])

    def test_off_screen_blocks(self):
        self.assertFalse(OC.aim_report(acts([3], on=False), lambda t: True)["ok"])

    def test_one_slightly_off_dig_of_three_passes(self):   # hide_seek: 1 of 3 at 7.3 deg
        self.assertTrue(OC.aim_report(acts([0, 0, 7.3]), lambda t: True)["ok"])

    def test_outside_the_short_is_not_counted(self):
        self.assertTrue(OC.aim_report(acts([40]), lambda t: False)["ok"])


def falling(eid, t0, t1, x=0.5, y0=70.0, z=-5.0):
    return [[k, eid, "falling_block", x, y0 - 0.2 * (k - t0), z, 0, 0, None, None] for k in range(t0, t1 + 1)]


class Settle(unittest.TestCase):
    def rec(self, ents, tl=()):
        return {"poses": [[k, 0.5, 64, 0.5, 0.0, 0.0, 0, 0] for k in range(200)], "entities": ents, "timeline": list(tl)}

    def test_falling_sand_in_view_is_moving_until_it_lands(self):
        rec = self.rec(falling(7, 20, 60))
        tr = OC.debris_tracks(rec)
        cam = OC.pose_cam(rec)
        self.assertEqual(len(tr), 1)
        self.assertTrue(OC.moving(tr, 40, cam))
        self.assertFalse(OC.moving(tr, 70, cam))
        self.assertEqual(OC.settle_after(tr, 40, cam), 61)
        self.assertIn("falling block", OC.describe(tr))

    def test_sand_behind_the_camera_is_not_in_view(self):
        rec = self.rec(falling(7, 20, 60, z=6.0))
        self.assertFalse(OC.moving(OC.debris_tracks(rec), 40, OC.pose_cam(rec)))

    def test_explosion_items_are_drifting_debris_and_never_hold_a_cut(self):   # r:r188b46
        rows = [[k, 9, "item", 0.5 + 0.3 * min(k - 30, 10), 65, -5, 0, 0, None, {"item": "dirt"}] for k in range(30, 80)]
        rec = self.rec(rows, [{"t": 30 * 50, "event": "particles", "type": "explosion", "x": 0, "y": 64, "z": -5}])
        self.assertEqual(OC.debris_tracks(rec), [])

    def test_a_mob_death_moves_for_a_second(self):
        rows = [[k, 3, "zombie", 0.5, 64, -4, 0, 0, None, None] for k in range(0, 60)]
        rec = self.rec(rows, [{"t": 20 * 50, "event": "mob_death", "id": 3}])
        tr = OC.debris_tracks(rec)
        self.assertEqual((tr[0]["kind"], tr[0]["t0"], tr[0]["t1"]), ("death", 20, 40))

    def test_the_end_waits_out_the_blast_frame_but_not_its_smoke(self):   # r:r188b46 narrows r:r24d99a
        rec = self.rec([], [{"t": 30 * 50, "event": "particles", "type": "explosion", "x": 0.5, "y": 64, "z": -5}])
        self.assertEqual(OC.debris_tracks(rec), [])
        tr = OC.debris_tracks(rec, puffs=True)
        self.assertEqual((tr[0]["kind"], tr[0]["t0"], tr[0]["t1"]), ("puff", 30, 30 + OC.BLAST_TICKS))
        self.assertTrue(OC.moving(tr, 32, OC.pose_cam(rec)))      # the blast going off holds the end
        self.assertFalse(OC.moving(tr, 60, OC.pose_cam(rec)))     # 1.5 s later only its smoke moves: it doesn't
        self.assertEqual(OC.settle_after(tr, 32, OC.pose_cam(rec)), 30 + OC.BLAST_TICKS + 1)
        self.assertLess(OC.BLAST_TICKS, OC.SMOKE_TICKS)


class PaceTailMotion(unittest.TestCase):
    """pace.tail_motion: the last 0.6 s of the game view; a still or merely panning ending is ~0, debris falling across a
    still view blocks (which_door: 1.77%)."""
    def clip(self, frame_at, n=45):
        import subprocess, tempfile
        out = pathlib.Path(tempfile.mkdtemp()) / "c.mp4"
        raw = b"".join(frame_at(i).astype("uint8").tobytes() for i in range(n))
        subprocess.run(["ffmpeg", "-v", "error", "-f", "rawvideo", "-pix_fmt", "gray", "-s", "270x480", "-r", "30", "-i", "-",
                        "-vf", "scale=1080:1920:flags=neighbor", "-pix_fmt", "yuv420p", str(out)], input=raw, check=True)
        return out

    def test_still_panning_and_debris_endings(self):
        import numpy as np
        import pace
        rng = np.random.default_rng(3)
        world = np.kron(rng.integers(40, 220, (60, 80)), np.ones((10, 10)))   # blocky terrain, 600x800
        view = lambda i: world[60 + i: 540 + i, 200:470]                      # the camera tilts 1 px a frame
        specks = rng.integers(0, 270, (40, 2))
        def debris(i):
            f = world[60:540, 200:470].copy()
            for x, y in specks:
                yy = (y + 4 * i) % 470
                f[yy:yy + 3, x:x + 3] = 15                                    # dark crumbs falling 4 px a frame
            return f
        for fn, lo, hi in ((lambda i: world[60:540, 200:470], 0, pace.TAIL_STILL[0]), (view, 0, pace.TAIL_STILL[0]),
                           (debris, pace.TAIL_STILL[1], 100)):
            v = self.clip(fn)
            tm = pace.tail_motion(v, pace.probe_len(v))
            self.assertTrue(lo <= tm < hi, f"{tm:.3f} not in [{lo}, {hi})")


class PaceEditCaptions(unittest.TestCase):
    def test_subs_and_cards_count_as_caption_events(self):   # half_heart: "lava bridge", "almost there..." (nth 1)
        import pace

        class Clock:
            def out_of_src(self, s):
                return s - 1.0
        rec = {"timeline": [{"t": 9750, "event": "bridge"}, {"t": 5000, "event": "sound"}, {"t": 12500, "event": "sound"}]}
        edit = {"subs": [["bridge", "lava bridge", 2.8], ["sound", "almost there...", 1.6, 1]], "cards": [["bridge:0.5", "WOW"]]}
        got = pace.edit_caption_times("/nonexistent/short.mp4", edit, rec, Clock())
        self.assertEqual(sorted(got), [8.75, 9.25, 11.5])


if __name__ == "__main__":
    unittest.main()
