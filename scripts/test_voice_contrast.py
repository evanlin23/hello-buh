"""voice_contrast (STANDARDS 2.7): a character as close to the narrator as the narrator's own lines blocks (Light
Sleeper's Sulafat Mom, r:rc31bfe); a character heard as the other sex at a pitch that doesn't confirm theirs blocks
(Gold's Vindemiatrix Grandma, r:rf8060c); one witness alone warns. The numbers are today's measured takes."""
import json
import pathlib
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import voice_contrast as vc  # noqa: E402
import who  # noqa: E402

GRANDMA = {"sex": "female", "age": [55, 85]}
GRANDPA = {"sex": "male", "age": [60, 85]}
BUH = {"sex": "male", "age": [13, 20]}


class Contrast(unittest.TestCase):
    def test_bar_is_the_narrators_p10_clamped(self):
        self.assertAlmostEqual(vc.bar([0.80, 0.85, 0.90, 0.91, 0.92, 0.93]), float(np.percentile([0.80, 0.85, 0.90, 0.91, 0.92, 0.93], 10)))
        self.assertEqual(vc.bar([0.5, 0.6, 0.6, 0.7]), vc.BAR_MIN)
        self.assertEqual(vc.bar([0.97] * 6), vc.BAR_MAX)
        self.assertEqual(vc.bar([0.9, 0.9]), vc.BAR_FEW)   # too few narrator lines to calibrate

    def test_sulafat_mom_blocks(self):   # Light Sleeper: 0.864 to its narrator, bar 0.846, 1.4 st
        self.assertEqual(vc.contrast(0.864, 1.4, 0.846)[0], "BLOCK")

    def test_close_at_the_same_pitch_blocks(self):   # just under the bar: the pitch decides
        self.assertEqual(vc.contrast(0.83, 1.0, 0.846)[0], "BLOCK")
        self.assertEqual(vc.contrast(0.83, 3.0, 0.846)[0], "WARN")

    def test_the_mom_candidates_pass(self):   # 0.755-0.799 to Pip, 3-5 st under; Pip's bar 0.836
        for sim, st in [(0.755, 3.1), (0.799, 3.5), (0.775, 4.9)]:
            self.assertEqual(vc.contrast(sim, st, 0.836)[0], "ok")

    def test_todays_other_characters_pass(self):   # Dog Hill Buh/Grandpa, Raids Grandpa, Gold's Autonoe
        for sim, st, b in [(0.675, 0.6, 0.836), (0.582, 10.9, 0.836), (0.625, 16.2, 0.881), (0.702, 0.7, 0.889)]:
            self.assertEqual(vc.contrast(sim, st, b)[0], "ok")


class Read(unittest.TestCase):
    def test_pitch_witness(self):
        self.assertEqual(vc.pitch_read(230, "female", [60, 85]), "agrees")
        self.assertEqual(vc.pitch_read(170, "female", [55, 85]), "unsure")
        self.assertEqual(vc.pitch_read(110, "female", [55, 85]), "disagrees")
        self.assertEqual(vc.pitch_read(89, "male", [60, 85]), "agrees")
        self.assertEqual(vc.pitch_read(222, "male", [13, 20]), "unsure")   # Achird's teen Buh
        self.assertEqual(vc.pitch_read(222, "male", [30, 50]), "disagrees")
        self.assertEqual(vc.pitch_read(300, None, [6, 13]), "unsure")

    def test_vindemiatrix_grandma_blocks(self):   # heard (backwards) as a man 55-75, 170 Hz
        lvl, why = vc.read_verdict(GRANDMA, 170, {"sex": "man", "age": [55, 75], "voice": "raspy, gravelly"})
        self.assertEqual(lvl, "BLOCK")
        self.assertIn("rf8060c", why)

    def test_a_low_grandma_heard_as_a_man_blocks(self):
        self.assertEqual(vc.read_verdict(GRANDMA, 110, {"sex": "man", "age": [60, 80]})[0], "BLOCK")

    def test_one_witness_warns(self):
        # the listener says man, the pitch says woman (Light Sleeper's Mom L05 on flash-lite): WARN
        self.assertEqual(vc.read_verdict({"sex": "female", "age": [30, 50]}, 213, {"sex": "man", "age": [20, 40]})[0], "WARN")
        # the pitch says no, the listener says yes: WARN
        self.assertEqual(vc.read_verdict(GRANDMA, 120, {"sex": "woman", "age": [60, 80]})[0], "WARN")

    def test_no_listener_never_blocks(self):
        self.assertEqual(vc.read_verdict(GRANDMA, 120, None)[0], "WARN")
        self.assertEqual(vc.read_verdict(GRANDMA, 230, None)[0], "NOTE")

    def test_age(self):
        self.assertEqual(vc.read_verdict(GRANDPA, 114, {"sex": "man", "age": [40, 50]})[0], "ok")   # 10 years: within slack
        self.assertEqual(vc.read_verdict(BUH, 222, {"sex": "man", "age": [40, 50]})[0], "WARN")
        self.assertEqual(vc.read_verdict(GRANDPA, 89, {"sex": "man", "age": "40-60"})[0], "ok")

    def test_passes(self):
        self.assertEqual(vc.read_verdict(GRANDMA, 230, {"sex": "woman", "age": [40, 60]})[0], "ok")   # Gold's Autonoe
        self.assertEqual(vc.read_verdict(GRANDPA, 89, {"sex": "man", "age": [40, 60]})[0], "ok")      # Raids' Grandpa


class Cast(unittest.TestCase):
    CAST = {"grandma": {"reads_as": GRANDMA}, "buh": {"voice": "Achird"}}

    def test_story_entry_wins(self):
        self.assertEqual(vc.reads_as("Grandma", {"ref": "grandma", "reads_as": {"sex": "female", "age": [40, 50]}}, self.CAST)["age"], [40, 50])

    def test_cast_ref(self):
        self.assertEqual(vc.reads_as("Gran", {"ref": "grandma"}, self.CAST), GRANDMA)

    def test_name_fallback(self):   # Gold's Vindemiatrix entry had no ref
        self.assertEqual(vc.reads_as("Grandma", {"voice": "Vindemiatrix"}, self.CAST)["sex"], "female")
        self.assertEqual(vc.reads_as("Grandpa", {}, {})["sex"], "male")
        self.assertIsNone(vc.reads_as("Buh", {"ref": "buh"}, self.CAST))
        self.assertIsNone(vc.reads_as("Piglin", {}, {}))

    def test_the_real_cast_has_reads_as(self):
        cast = json.loads((vc.ROOT / "voices" / "cast.json").read_text())
        for k in ("mom", "grandma", "elder", "buh", "narrator", "pip"):
            self.assertIn("age", cast[k]["reads_as"], k)
        self.assertEqual(cast["grandma"]["reads_as"]["sex"], "female")
        self.assertEqual(cast["elder"]["reads_as"]["sex"], "male")

    def test_narrator_key(self):
        self.assertEqual(vc.narrator_key({"N": {"role": "narrator"}, "Mom": {"role": "character"}}), "N")
        self.assertEqual(vc.narrator_key({"Nico": {"role": "narrator"}}), "Nico")


class Story(unittest.TestCase):
    """check() end to end on a fake story (measure and listener injected)."""

    def story(self, lines, cast):
        d = pathlib.Path(tempfile.mkdtemp())
        (d / "voice").mkdir()
        (d / "story.json").write_text(json.dumps({"cast": cast}))
        (d / "voice" / "voice.json").write_text(json.dumps({"lines": {k: {"who": w} for k, (w, _, _) in lines.items()}}))
        for k in lines:
            (d / "voice" / f"{k}.wav").write_bytes(k.encode())
        cf = d / "cast.json"
        cf.write_text(json.dumps({"mom": {"reads_as": {"sex": "female", "age": [30, 50]}}}))
        return d, cf

    @staticmethod
    def vec(angle):
        v = np.zeros(256)
        v[0], v[1] = np.cos(angle), np.sin(angle)
        return v

    def run_check(self, mom_angle, heard):
        lines = {f"L0{i}": ("N", self.vec(0.05 * (i % 3)), 215.0) for i in range(1, 7)}
        lines["L09"] = ("Mom", self.vec(mom_angle), 214.0)
        d, cf = self.story(lines, {"N": {"role": "narrator"}, "Mom": {"role": "character", "ref": "mom"}})
        m = {f"{k}.wav": (v, f) for k, (_, v, f) in lines.items()}
        return vc.check(d, cast_file=cf, measure=lambda p: m[pathlib.Path(p).name], hearer=lambda p, label: (heard, "cache"))

    def test_mom_on_the_narrator_blocks(self):
        rep = self.run_check(0.02, {"sex": "woman", "age": [30, 45]})
        lv = {(f["check"], f["level"]) for f in rep["findings"]}
        self.assertIn(("contrast", "BLOCK"), lv)
        self.assertEqual(rep["rows"][0]["who"], "Mom")

    def test_a_distinct_mom_passes(self):
        rep = self.run_check(1.2, {"sex": "woman", "age": [30, 45]})
        self.assertFalse([f for f in rep["findings"] if f["level"] in ("BLOCK", "WARN")], rep["findings"])
        self.assertIn("OK: 0 blocker(s)", vc.table(rep))


class Who(unittest.TestCase):
    def test_age_range(self):
        self.assertEqual(who.age_range("55-75"), [55.0, 75.0])
        self.assertEqual(who.age_range([55, 70]), [55.0, 70.0])
        self.assertEqual(who.age_range(60), [60.0, 60.0])
        self.assertEqual(who.age_range({"min": 30, "max": 45}), [30.0, 45.0])
        self.assertIsNone(who.age_range("old"))

    def test_cache_is_by_content(self):
        d = pathlib.Path(tempfile.mkdtemp())
        a, b, c = d / "a.wav", d / "b.wav", d / "c.wav"
        a.write_bytes(b"take one")
        b.write_bytes(b"take one")   # the same take on another branch / path
        c.write_bytes(b"a re-take")
        calls = []
        real = who.hear
        who.hear = lambda p, reverse=True: calls.append(p) or {"sex": "woman", "age": [60, 80], "model": "fake", "reversed": reverse}
        try:
            cf = d / "cache.json"
            self.assertEqual(who.cached(a, cf)[1], "asked")
            self.assertEqual(who.cached(b, cf)[1], "cache")
            self.assertEqual(who.cached(c, cf, listen=False), (None, "off"))
            self.assertEqual(who.cached(c, cf)[1], "asked")
            self.assertEqual(len(calls), 2)
        finally:
            who.hear = real


if __name__ == "__main__":
    unittest.main()
