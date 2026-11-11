"""voice_drift: lines voiced in ONE one_take request (tts.py "one_take") warn instead of block on WOBBLE / OFFREF;
lines from different requests keep every rule (Buh Stories lead, 2026-11-11)."""
import sys
import pathlib
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import voice_drift as vd  # noqa: E402


VJ = {"beats": {
    "L01": {"lines": ["L01", "L02"], "take": "L01"},   # run 1 of the one take
    "L04": {"lines": ["L04"], "take": "L01"},          # run 2 of the same take (another speaker's line between)
    "L03": {"lines": ["L03"]},                         # its own request (the character line)
    "L05": {"lines": ["L05", "L06"]},                  # an ordinary beat take: not one_take
}}


class OneTake(unittest.TestCase):
    def test_lines_of_a_one_take_request(self):
        self.assertEqual(vd.one_take_of(VJ), {"L01": "L01", "L02": "L01", "L04": "L01"})

    def test_wobble_and_offref_warn_in_one_take(self):
        r = vd.one_take_flags({"id": "L02", "flags": ["WOBBLE", "OFFREF", "DRIFT"]}, vd.one_take_of(VJ))
        self.assertEqual(r["flags"], ["wobble", "offref", "DRIFT"])
        self.assertEqual(r["one_take"], "L01")

    def test_other_requests_keep_the_rule(self):
        for lid in ("L03", "L05"):
            r = vd.one_take_flags({"id": lid, "flags": ["WOBBLE", "OFFREF"]}, vd.one_take_of(VJ))
            self.assertEqual(r["flags"], ["WOBBLE", "OFFREF"])
            self.assertNotIn("one_take", r)

    def test_no_beats(self):
        self.assertEqual(vd.one_take_of({"lines": {}}), {})


if __name__ == "__main__":
    unittest.main()
