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

    def test_explosion_items_are_debris_while_flying(self):
        rows = [[k, 9, "item", 0.5 + 0.3 * min(k - 30, 10), 65, -5, 0, 0, None, {"item": "dirt"}] for k in range(30, 80)]
        rec = self.rec(rows, [{"t": 30 * 50, "event": "particles", "type": "explosion", "x": 0, "y": 64, "z": -5}])
        tr = OC.debris_tracks(rec)
        self.assertEqual([t["kind"] for t in tr], ["debris"])
        self.assertEqual(tr[0]["t1"], 40)

    def test_a_mob_death_moves_for_a_second(self):
        rows = [[k, 3, "zombie", 0.5, 64, -4, 0, 0, None, None] for k in range(0, 60)]
        rec = self.rec(rows, [{"t": 20 * 50, "event": "mob_death", "id": 3}])
        tr = OC.debris_tracks(rec)
        self.assertEqual((tr[0]["kind"], tr[0]["t0"], tr[0]["t1"]), ("death", 20, 40))

    def test_the_end_also_waits_out_the_rendered_blast_smoke(self):   # which_door: debris past "You Died!"
        rec = self.rec([], [{"t": 30 * 50, "event": "particles", "type": "explosion", "x": 0.5, "y": 64, "z": -5}])
        self.assertEqual(OC.debris_tracks(rec), [])
        tr = OC.debris_tracks(rec, puffs=True)
        self.assertEqual((tr[0]["kind"], tr[0]["t0"], tr[0]["t1"]), ("puff", 30, 30 + OC.PUFF_TICKS))
        self.assertTrue(OC.moving(tr, 60, OC.pose_cam(rec)))
        self.assertEqual(OC.settle_after(tr, 60, OC.pose_cam(rec)), 30 + OC.PUFF_TICKS + 1)


class PaceTailMotion(unittest.TestCase):
    """pace.tail_motion: the last 0.6 s of the game view; a still ending is ~0, a moving one blocks (which_door 3.3%)."""
    def clip(self, src):
        import subprocess, tempfile
        out = pathlib.Path(tempfile.mkdtemp()) / "c.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", src, "-t", "1.5", "-pix_fmt", "yuv420p", str(out)], check=True)
        return out

    def test_still_and_moving_endings(self):
        import pace
        still = self.clip("color=c=0x553322:s=1080x1920:r=30")
        moving = self.clip("testsrc2=s=1080x1920:r=30")
        self.assertLess(pace.tail_motion(still, pace.probe_len(still)), pace.TAIL_STILL[0])
        self.assertGreaterEqual(pace.tail_motion(moving, pace.probe_len(moving)), pace.TAIL_STILL[1])


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
