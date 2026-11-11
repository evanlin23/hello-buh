"""scripts/opening.py, the opening check (owner r:r0f3da0): the calibration set and synthetic clips.

The calibration (lib/hb/test/fixtures/opening_calibration.json, measured 2026-11-11): the owner's 32 reference Shorts,
our queued Shorts the lead judged STRONG or WEAK openers, the stories and the rest of the videos branch. The verdict on
the stored numbers must keep: every reference and every STRONG opener free of blockers, and the WEAK ones it catches.
"""
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import opening as O  # noqa: E402

CAL = json.loads((HERE.parent / "lib/hb/test/fixtures/opening_calibration.json").read_text())
CAUGHT = {"creeper", "trap_free_diamonds", "cave_reveal", "faketrick_gold_portal"}   # the weak openers check 1 blocks


def blocks(o, ink=True):
    F = O.verdict(o["picture"], o["sound"], o["caption_ink"] if ink else None, o.get("caption"), o.get("subject"))
    return [f for f in F if f[0] == "BLOCK"]


class Calibration(unittest.TestCase):
    def test_every_owner_reference_passes(self):
        refs = [o for o in CAL if o["group"] == "ref"]
        self.assertEqual(len(refs), 32)
        for o in refs:
            self.assertEqual(blocks(o, ink=False), [], o["name"])

    def test_every_strong_opener_passes(self):
        strong = [o for o in CAL if o["group"] == "strong"]
        self.assertEqual(len(strong), 16)
        for o in strong:
            self.assertEqual(blocks(o), [], o["name"])

    def test_stories_pass(self):
        for o in CAL:
            if o["group"] == "story":
                self.assertEqual(blocks(o), [], o["name"])

    def test_the_weak_flat_openers_block(self):
        weak = {o["name"]: o for o in CAL if o["group"] == "weak"}
        self.assertEqual(len(weak), 8)
        for n in CAUGHT:
            b = blocks(weak[n])
            self.assertTrue(b, n)
            self.assertIn("flat view", b[0][3])

    def test_dilemma_mace_is_saved_by_the_wolf_in_view(self):
        o = next(o for o in CAL if o["name"] == "dilemma_mace")
        self.assertTrue(o["subject"])
        self.assertEqual(blocks(o), [])
        self.assertTrue(blocks({**o, "subject": []}))   # the same frame with nobody in view would block

    def test_slow_openers_warn(self):
        o = next(o for o in CAL if o["name"] == "mega_sponge")
        F = O.verdict(o["picture"], o["sound"], o["caption_ink"], None, None)
        self.assertTrue(any(f[0] == "WARN" and "slow opening" in f[3] for f in F))


class Verdict(unittest.TestCase):
    PM = {"busy0": 0.5, "busy": 0.5, "centre": 0.5, "main": [90, 140, 50], "motion": 5.0, "change": 0.3, "hold": 0.0, "hold_at": 0.0, "secs": 3.0}

    def levels(self, **kw):
        pm = {**self.PM, **kw.pop("pm", {})}
        return [(f[0], f[3]) for f in O.verdict(pm, kw.get("sm"), kw.get("ink"), kw.get("caption"), kw.get("subject"))]

    def test_clean(self):
        self.assertEqual(self.levels(sm={"hit_db": -1.0, "hit_at": 0.1}, ink=5.0, caption="Am i cooked?"), [])

    def test_flat_blocks_flat_with_a_mob_warns_lava_warns(self):
        self.assertEqual(self.levels(pm={"centre": 0.1, "busy": 0.2})[0][0], "BLOCK")
        self.assertEqual(self.levels(pm={"centre": 0.1, "busy": 0.2}, subject=["wolf (12 blocks)"])[0][0], "WARN")
        self.assertEqual(self.levels(pm={"centre": 0.1, "busy": 0.2, "main": [230, 110, 20]})[0][0], "WARN")
        self.assertEqual(self.levels(pm={"centre": 0.1, "busy": 0.5}), [])   # busy around an empty middle: not flat

    def test_motion(self):
        self.assertEqual(self.levels(pm={"motion": 0.2, "change": 0.005})[0][0], "BLOCK")
        self.assertEqual([l for l, _ in self.levels(pm={"motion": 0.14, "change": 0.028})], ["WARN"])   # a path drawn: slow, not still
        self.assertEqual(self.levels(pm={"motion": 3.2, "change": 0.05}), [])

    def test_sound_caption_hold_warn(self):
        lv = self.levels(sm={"hit_db": -8.0, "hit_at": 0.4}, ink=0.0, caption="one two three four five six seven eight nine ten eleven 💀",
                         pm={"hold": 1.8, "hold_at": 0.9})
        self.assertEqual(sorted(l for l, _ in lv), ["WARN"] * 4)
        self.assertTrue(any("11 words" in m for _, m in lv))

    def test_words_skip_emoji(self):
        self.assertEqual(len(O.words("POV: you lit 75 TNT 💀")), 5)
        self.assertEqual(len(O.words("Who tf is doing this 😭 🙏")), 5)


def clip(path, src):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", src, "-f", "lavfi", "-i", "sine=f=440:d=3",
                    "-t", "3", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "ultrafast", "-shortest", str(path)], check=True)


class Video(unittest.TestCase):
    """Synthetic 1080x1920 clips through measure(): a plain green field held still, and a moving test pattern."""

    def test_plain_still_field_blocks_twice_moving_pattern_passes(self):
        with tempfile.TemporaryDirectory() as d:
            flat, busy = pathlib.Path(d, "flat.mp4"), pathlib.Path(d, "busy.mp4")
            clip(flat, "color=c=0x5a8c32:s=1080x1920:r=30")
            clip(busy, "testsrc2=s=1080x1920:r=30")
            m = O.measure(flat)
            b = [f[3] for f in O.verdict(m["picture"], m["sound"], m["caption_ink"]) if f[0] == "BLOCK"]
            self.assertEqual(len(b), 2, b)
            self.assertTrue(any("flat view" in x for x in b) and any("nothing moves" in x for x in b))
            m = O.measure(busy)
            self.assertEqual([f for f in O.verdict(m["picture"], m["sound"], None) if f[0] == "BLOCK"], [])
            self.assertGreater(m["picture"]["motion"], O.MOTION_MIN)


if __name__ == "__main__":
    unittest.main()
