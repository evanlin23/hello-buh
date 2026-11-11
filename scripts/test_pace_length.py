"""scripts/pace.py length floor: 25 s for a story (the narration floor), 8 s for an unnarrated stunt (lead 2026-11-11)."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pace  # noqa: E402


class LengthFloor(unittest.TestCase):
    def test_story_keeps_the_narration_floor(self):
        self.assertEqual(pace.length_floor(True), 25.0)

    def test_stunt_floor_is_8_s(self):
        self.assertEqual(pace.length_floor(False), 8.0)
        self.assertLess(pace.length_floor(False), 11.1)   # rainbow_sheep passes
        self.assertGreater(pace.length_floor(False), 5.5)  # a 5 s single beat still blocks


if __name__ == "__main__":
    unittest.main()
