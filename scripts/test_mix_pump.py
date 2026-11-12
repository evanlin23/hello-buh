"""scripts/mix_pump.py and the stunt mix's game-first master (scripts/loud.py tame_gain / limit_peaks), on synthetic
mixes: a pumped bed fails, a steady one passes; music on top of the game fails, music under it passes.
    python3 -m unittest scripts/test_mix_pump.py"""
import pathlib
import subprocess
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import loud  # noqa: E402
import mix_pump as M  # noqa: E402

SR = 48000


def tone(sec, f, amp, seed=0):
    t = np.arange(int(sec * SR)) / SR
    return (amp * np.sin(2 * np.pi * f * t)).astype(np.float32)


def game_track(sec=8.0, amp=0.5, click=0.15):
    """block sounds: a noisy click (`click` s) every 1 s, silence between"""
    g = np.zeros(int(sec * SR), np.float32)
    rng = np.random.default_rng(1)
    for k in range(int(sec)):
        a = int((k + 0.5) * SR)
        g[a:a + int(click * SR)] = amp * rng.uniform(-1, 1, int(click * SR))
    return g


def db(x):
    return 20 * np.log10(np.sqrt(np.mean(x.astype(np.float64) ** 2)) + 1e-12)


def windows(x):
    h = int(SR * M.WIN)
    n = len(x) // h
    return 20 * np.log10(np.sqrt((x[:n * h].reshape(n, h).astype(np.float64) ** 2).mean(axis=1)) + 1e-9)


class Pump(unittest.TestCase):
    def test_pumped_bed_fails_steady_passes(self):
        game, music = game_track(), tone(8.0, 220, 0.05)
        pre = game + music
        busy = np.abs(game) > 0
        # a pumped master: +12 dB everywhere but ~0 dB where a block sound plays (a limiter taking the makeup back)
        gain = np.where(busy, 1.0, 10 ** (12 / 20)).astype(np.float32)
        sp, _ = M.pump(windows(pre * gain), windows(pre))
        self.assertGreater(sp, M.PUMP_MAX)
        # a steady master: +2 dB everywhere
        sp, med = M.pump(windows(pre * 10 ** (2 / 20)), windows(pre))
        self.assertLess(sp, 0.5)
        self.assertAlmostEqual(med, 2.0, places=1)

    def test_music_under_the_game(self):
        game = game_track(amp=0.5)
        u, nb, nq = M.under(windows(game + tone(8.0, 220, 0.03)), windows(game))
        self.assertGreater(u, M.UNDER_MIN)
        self.assertGreater(nb, M.MIN_WIN)
        self.assertGreater(nq, M.MIN_WIN)
        u, _, _ = M.under(windows(game + tone(8.0, 220, 0.5)), windows(game))
        self.assertLess(u, M.UNDER_MIN)


class GameFirst(unittest.TestCase):
    def test_tame_gain_caps_the_limiting(self):
        # a sparse, peaky game stem: reaching -12.5 LUFS would need far more than 3 dB of limiting on its peaks
        with tempfile.TemporaryDirectory() as d:
            w = pathlib.Path(d) / "g.wav"
            x = game_track(amp=0.3, click=0.01)   # ~-28 LUFS with -6 dBTP peaks
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(w)],
                           input=x.tobytes(), check=True)
            g = loud.tame_gain(w, -12.5, -1.0)
            want = -12.5 - loud.measure(w)
            self.assertLess(g, want)   # capped below the loudness target's gain
            self.assertAlmostEqual(loud.true_peak(w) + g, -1.0 + loud.MAX_REDUCTION, delta=0.3)
            # a dense stem that reaches the target with room to spare: the full gain
            w2 = pathlib.Path(d) / "d.wav"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(w2)],
                           input=tone(4.0, 300, 0.02).tobytes(), check=True)
            self.assertAlmostEqual(loud.tame_gain(w2, -12.5, -1.0), -12.5 - loud.measure(w2), delta=0.01)


if __name__ == "__main__":
    unittest.main()
