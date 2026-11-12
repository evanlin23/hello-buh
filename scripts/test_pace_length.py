"""scripts/pace.py length floor: 25 s for a story (the narration floor); no minimum for an unnarrated stunt
(owner 2026-11-12: "no fixed minimum, just don't pad them")."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pace  # noqa: E402


class LengthFloor(unittest.TestCase):
    def test_story_keeps_the_narration_floor(self):
        self.assertEqual(pace.length_floor(True), 25.0)

    def test_stunt_has_no_minimum(self):
        self.assertEqual(pace.length_floor(False), 0.0)


if __name__ == "__main__":
    unittest.main()
