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


def _voice(sec, f0=120.0, amp=0.3):
    """A buzzy voiced tone (harmonics, like a voice) at voice_drift's rate."""
    import numpy as np
    t = np.arange(int(sec * vd.SR)) / vd.SR
    syll = ((t % 0.4) < 0.3).astype(np.float32)   # syllables: 0.3 s voiced, 0.1 s gap (as speech; a flat tone isn't)
    return (amp * syll * sum(np.sin(2 * np.pi * f0 * k * t) / k for k in range(1, 8))).astype(np.float32)


def _breath(sec, amp=0.006):
    import numpy as np
    return (amp * np.random.default_rng(1).standard_normal(int(sec * vd.SR))).astype(np.float32)


class VoicedWindows(unittest.TestCase):
    """Silent and breath-only stretches are not scored for WOBBLE (Thirty-One Raids L08, Buh Stories lead 2026-11-11)."""

    def test_silent_gap_window_skipped(self):
        import numpy as np
        x = np.concatenate([_voice(1.5), np.zeros(int(1.6 * vd.SR), np.float32), _voice(1.5)])
        starts = [t for t, _ in vd.windows(x)]
        self.assertIn(0.0, starts)
        self.assertNotIn(1.5, starts)   # 1.5-3.0 s: silence

    def test_breath_window_skipped(self):
        import numpy as np
        x = np.concatenate([_voice(1.5), _breath(1.6), _voice(1.5)])
        self.assertNotIn(1.5, [t for t, _ in vd.windows(x)])

    def test_voiced_speech_kept(self):
        x = _voice(4.0)
        self.assertEqual(len(vd.windows(x)), 4)   # 0, 0.75, 1.5, 2.25

    def test_nothing_voiced_falls_back_to_the_line(self):
        x = _breath(4.0)
        self.assertEqual([t for t, _ in vd.windows(x)], [0.0])
