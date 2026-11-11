"""scripts/sound_levels.py: every sound mark loud enough to hear (thirty_one_raids' payoff horn: 2.2 x 0.01 = silent)."""
import json
import pathlib
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import sound_levels as L  # noqa: E402


def snd(t, sound, volume=1.0, **kw):
    return {"event": "sound", "t": int(t * 1000), "sound": sound, "volume": volume, "pitch": 1.0, **kw}


def rec(*marks):
    return {"timeline": sorted(marks, key=lambda e: e["t"]), "poses": []}


class Levels(unittest.TestCase):
    def test_table_has_the_horn(self):
        self.assertAlmostEqual(L.file_volume("event.raid.horn"), 0.01)
        self.assertEqual(L.vanilla_volume("event.raid.horn"), 64.0)
        self.assertEqual(L.file_volume("block.grass.step"), 1.0)
        self.assertAlmostEqual(L.gain("event.raid.horn", 64), 0.64)
        self.assertEqual(L.gain("block.bell.use", 2.0), 1.0)   # vanilla clamps volume x file volume to 1

    def test_the_raids_horn_blocks_and_normal_sounds_pass(self):
        r = rec(snd(31.6, "event.raid.horn", 1.2), snd(41.0, "event.raid.horn", 2.2),   # the first package's horns
                snd(2.0, "block.grass.step", 0.15), snd(3.0, "block.wooden_door.open", 0.9),
                snd(9.0, "block.portal.trigger", 0.08),   # gold_for_the_portal's deliberately quiet trigger
                snd(1.0, "weather.rain", 0.002))          # rain fading in from 0: ambience, never a blocker
        _, fs = L.findings(r)
        blocks = [f for f in fs if f["level"] == "BLOCK"]
        self.assertEqual([(round(f["t"], 1), f["sound"]) for f in blocks], [(31.6, "event.raid.horn"), (41.0, "event.raid.horn")])
        self.assertIn("ctx.vanillaSound('event.raid.horn')", blocks[1]["msg"])
        self.assertEqual([f for f in fs if f["level"] != "BLOCK"], [])

    def test_the_fixed_horns_pass(self):
        _, fs = L.findings(rec(snd(31.65, "event.raid.horn", 40), snd(41.05, "event.raid.horn", 64)))
        self.assertEqual(fs, [])

    def test_key_sounds_by_mark_and_flag(self):
        r = rec(snd(5.0, "event.raid.horn", 2.2), {"event": "horn", "t": 5000},
                snd(5.3, "item.crossbow.loading_start", 0.8),                  # a neighbour: not the key sound
                snd(8.0, "entity.villager.ambient", 0.1), {"event": "horn", "t": 8000},   # key, quiet: WARN
                {"event": "horn", "t": 12000},                                 # key mark with no sound at all
                snd(15.0, "entity.wolf.whine", 0.03, key=True))                 # flagged, under the floor
        rows, fs = L.findings(r, {"keySounds": ["horn"]})
        keyed = {(r_["t"], r_["sound"]): r_["key"] for r_ in rows if r_["key"]}
        self.assertEqual(sorted(keyed), [(5.0, "event.raid.horn"), (8.0, "entity.villager.ambient"), (15.0, "entity.wolf.whine")])
        lv = sorted((round(f["t"]), f["level"]) for f in fs)
        self.assertEqual(lv, [(5, "BLOCK"), (8, "WARN"), (12, "WARN"), (15, "BLOCK")])
        self.assertIn("KEY SOUND 'HORN'", next(f for f in fs if round(f["t"]) == 5)["msg"])

    def test_the_payoff_sound_from_story_json(self):
        with tempfile.TemporaryDirectory() as td:
            (pathlib.Path(td) / "story.json").write_text(json.dumps({"payoff": "raidbar+0.1", "lines": []}))
            r = rec({"event": "raidbar", "t": 42000}, snd(42.3, "event.raid.horn", 2.2))
            rows, fs = L.findings(r, {}, td)
            self.assertEqual(rows[0]["key"], "the payoff")
            self.assertIn("THE PAYOFF", fs[0]["msg"])
            self.assertEqual(fs[0]["level"], "BLOCK")


class Mix(unittest.TestCase):
    def test_matched_filter_finds_a_sound_and_not_its_absence(self):
        rng = np.random.default_rng(1)
        sr = L.SR
        t = np.arange(int(0.6 * sr)) / sr
        horn = (np.sin(2 * np.pi * 826 * t) + 0.5 * np.sin(2 * np.pi * 413 * t)) * np.exp(-t * 2)
        bed = 0.05 * rng.standard_normal(10 * sr)
        with_ = bed.copy()
        with_[4 * sr:4 * sr + len(horn)] += 0.2 * horn
        silent = bed.copy()
        silent[4 * sr:4 * sr + len(horn)] += 0.002 * horn   # 0.022 / 2.2 x quieter: the first package
        self.assertGreater(L.correlation(with_, 4.0, [horn]), 0.5)
        self.assertLess(L.correlation(silent, 4.0, [horn]), 0.1)


if __name__ == "__main__":
    unittest.main()
