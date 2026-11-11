"""scripts/key_sounds.py: the song ducks under each key sound and the gate catches a mix where it doesn't
(owner, 2026-11-11, on guess_sound: "had super loud music"). Synthetic stems, no packages needed.

  python3 -m unittest scripts/test_key_sounds.py
"""
import pathlib
import subprocess
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import key_sounds as K  # noqa: E402
import sfx  # noqa: E402

SR = K.SR
DUR = 8.0
KEYS = [1.0, 4.0]   # two mob calls


def stems():
    t = np.arange(int(DUR * SR)) / SR
    rng = np.random.default_rng(1)
    game = np.zeros_like(t)
    for k in KEYS:   # a 0.6 s call, and a torch 1.5 s later (not part of the clip)
        m = (t >= k) & (t < k + 0.6)
        game[m] += 0.3 * np.sin(2 * np.pi * 440 * t[m]) * np.sin(np.pi * (t[m] - k) / 0.6)
        m = (t >= k + 1.5) & (t < k + 1.6)
        game[m] += 0.2 * rng.standard_normal(m.sum())
    music = 0.25 * np.sin(2 * np.pi * 110 * t) + 0.08 * rng.standard_normal(len(t))
    return game.astype(np.float32), music.astype(np.float32)


def encode(x, path):
    """Mono float -> AAC mp4 (as a package's audio): the gate must survive the codec and its delay."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-c:a", "aac", "-b:a", "192k", str(path)],
                   input=np.asarray(x, np.float32).tobytes(), check=True)


def duck(music, windows):
    g = np.ones(len(music), np.float32)
    for a, b in windows:
        g[int(a * SR):int(b * SR)] = K.DUCK
    return music * g


class KeySounds(unittest.TestCase):
    def test_windows_cover_the_call_not_the_torch(self):
        game, _ = stems()
        w = K.windows(game, KEYS)
        self.assertEqual(len(w), 2)
        for (a, b), k in zip(w, KEYS):
            self.assertAlmostEqual(a, k - K.LEAD, places=2)
            self.assertTrue(k + 0.55 <= b <= k + 0.6 + K.TAIL + K.BLOCK_S + 1e-6, (a, b))   # ends with the call, before the torch

    def test_drop_is_never_ducked(self):
        game, _ = stems()
        w = K.windows(game, KEYS, stop=4.3)
        self.assertLessEqual(w[-1][1], 4.3 + 1e-6)
        self.assertEqual(len(K.windows(game, KEYS, stop=3.0)), 1)

    def test_gate_blocks_loud_music_and_passes_the_ducked_mix(self):
        game, music = stems()
        with tempfile.TemporaryDirectory() as d:
            d = pathlib.Path(d)
            encode(game, d / "nosong.mp4")
            encode(0.7 * (game + music), d / "loud.mp4")                                  # the guess_sound fault
            encode(0.7 * (game + duck(music, K.windows(game, KEYS))), d / "ducked.mp4")  # the fix
            rows, bad = K.check(d / "loud.mp4", d / "nosong.mp4", KEYS)
            self.assertEqual(len(bad), 2, rows)
            rows, bad = K.check(d / "ducked.mp4", d / "nosong.mp4", KEYS)
            self.assertEqual(bad, [], rows)
            self.assertTrue(all(r["margin_db"] > K.KEY_MIN_DB + 3 for r in rows), rows)

    def test_duck_filter_depth(self):
        f = sfx.duck_filter([(1.0, 2.0)], K.DUCK)
        self.assertIn("1-0.940*", f)


if __name__ == "__main__":
    unittest.main()
