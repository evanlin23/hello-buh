"""audio.py's per-sound gain clamp and pile-up limiter, and edit.py's cap on the edit sfx's share of the game track.

Vanilla (SoundEngine.calculateVolume) plays a sound at clamp(volume x its sounds.json volume, 0, 1): a volume over 1
only widens the hearing range. audio.py used to mix an explosion (volume 4) at 4x and then peak-normalise the whole track
to the pile-up, so chain_reaction's first 26 s sat at -56 to -68 dB under its 500 blasts. One edit 'impact' on a quiet
track set the integrated loudness every later stage measures and pushed the game ~28 dB down (mislabel_grandma).

  python3 -m unittest scripts/test_audio_gain.py
"""
import pathlib
import random
import sys
import tempfile
import unittest

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
import audio  # noqa: E402

SR = audio.SR
RNG = np.random.default_rng(3)
STEP = (RNG.standard_normal(int(0.08 * SR)) * np.exp(-np.linspace(0, 6, int(0.08 * SR)))).astype(np.float32)
STEP *= 0.9 / np.abs(STEP).max()
BLAST = (RNG.standard_normal(int(2.0 * SR)) * np.exp(-np.linspace(0, 5, int(2.0 * SR)))).astype(np.float32)
BLAST *= 0.95 / np.abs(BLAST).max()
FILES = {"step": STEP, "blast": BLAST}


def mixer(seconds, defs):
    """A Mixer over synthetic sound files (no assets, no ffmpeg)."""
    m = audio.Mixer.__new__(audio.Mixer)
    m.buf = np.zeros(int(seconds * SR) + SR, np.float32)
    m.rng = random.Random(1)
    m.defs = defs
    return m


DEFS = {"block.stone.step": {"sounds": [{"name": "step", "volume": 1.0}]},
        "entity.generic.explode": {"sounds": [{"name": "blast", "volume": 1.0}]},
        "quiet.file": {"sounds": [{"name": "blast", "volume": 0.3}]},
        "alias": {"sounds": [{"name": "quiet.file", "type": "event", "volume": 2.0}]}}


class Patched(unittest.TestCase):
    def setUp(self):
        self._asset, self._decode = audio.asset, audio.decode
        audio.asset = lambda name: name.split("/")[-1][:-4]
        audio.decode = lambda path, pitch=1.0: FILES[path]

    def tearDown(self):
        audio.asset, audio.decode = self._asset, self._decode


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(np.square(x, dtype=np.float64))) + 1e-12)


class Gain(Patched):
    def test_gain_is_clamped_like_vanilla(self):
        self.assertEqual(audio.gain(4), 1.0)
        self.assertAlmostEqual(audio.gain(0.5, 0.8), 0.4)
        self.assertAlmostEqual(audio.gain(2, 0.3), 0.6)   # over 1 before the file volume: not clamped early
        self.assertEqual(audio.gain(-1), 0.0)

    def test_explosion_at_volume_4_plays_at_full_scale_not_4x(self):
        m = mixer(3, DEFS)
        m.play("entity.generic.explode", 0.0, volume=4)
        self.assertAlmostEqual(float(np.abs(m.buf).max()), float(np.abs(BLAST).max()), places=5)

    def test_event_reference_multiplies_then_clamps(self):
        m = mixer(3, DEFS)
        m.play("alias", 0.0, volume=4)   # 4 x 2 x 0.3 = 2.4 -> 1
        self.assertAlmostEqual(float(np.abs(m.buf).max()), float(np.abs(BLAST).max()), places=5)
        m = mixer(3, DEFS)
        m.play("alias", 0.0, volume=1)   # 1 x 2 x 0.3 = 0.6
        self.assertAlmostEqual(float(np.abs(m.buf).max()), 0.6 * float(np.abs(BLAST).max()), places=5)


class ManyBlasts(Patched):
    """Steps (volume 0.15) for 20 s, then 500 TNT (volume 4) in 5 s: the steps keep their level against one blast."""

    def track(self, blasts):
        m = mixer(26, DEFS)
        for i in range(40):
            m.play("block.stone.step", 0.5 * i, volume=0.15)
        for i in range(blasts):
            m.play("entity.generic.explode", 20 + 5 * i / max(blasts, 1), volume=4)
        return audio.master(m.buf[:26 * SR])

    def test_pile_up_does_not_turn_the_steps_down(self):
        one, many = self.track(1), self.track(500)
        steps_one, steps_many = rms_db(one[:20 * SR]), rms_db(many[:20 * SR])
        self.assertLess(abs(steps_many - steps_one), 0.5, f"steps {steps_many:.1f} dB with 500 blasts vs {steps_one:.1f} with one")
        self.assertLessEqual(float(np.abs(many).max()), audio.OUT_PEAK + 1e-6)   # the pile-up is limited, not clipped over
        # the blasts still carry the payoff: well over the steps
        self.assertGreater(rms_db(many[21 * SR:25 * SR]) - steps_many, 20)
        # and the steps sit where vanilla puts them: 0.15 of a full-volume sound (~-16.5 dB), not 4 x 500 below it
        peak_step = float(np.abs(many[:20 * SR]).max())
        self.assertGreater(20 * np.log10(peak_step / audio.OUT_PEAK), -18.5)

    def test_quiet_steps_stay_audible_after_the_stem_loudness(self):
        import loud
        import sfx
        many = self.track(500)
        with tempfile.TemporaryDirectory() as d:
            p = pathlib.Path(d) / "g.wav"
            sfx.write_wav(p, np.stack([many, many], 1))
            g = -18 - loud.measure(p)          # edit.py: the game stem's static gain to -18 LUFS
        steps = 20 * np.log10(float(np.abs(many[:20 * SR]).max())) + g   # (unclamped + peak-normalised: -54 dBFS)
        self.assertGreater(steps, -36, f"steps peak at {steps:.1f} dBFS after the stem gain")

    def test_ordinary_track_is_peak_normalised_as_before(self):
        x = (np.sin(np.arange(SR) / 10) * 0.4).astype(np.float32)
        y = audio.master(x)
        self.assertTrue(np.allclose(y, x / 0.4 * audio.OUT_PEAK, atol=1e-5))

    def test_limiter_leaves_quiet_signal_alone(self):
        x = (np.sin(np.arange(SR) / 10) * 0.3).astype(np.float32)
        self.assertTrue(np.array_equal(audio.limit(x, 0.7), x))


class SfxShare(unittest.TestCase):
    """edit.py: an 'impact' on a quiet game track must not set the track's loudness (mislabel_grandma)."""

    @classmethod
    def setUpClass(cls):
        import edit
        import loud
        import sfx
        cls.edit, cls.loud, cls.sfx = edit, loud, sfx
        cls.tmp = tempfile.TemporaryDirectory()

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def measure(self, x):
        p = pathlib.Path(self.tmp.name) / "m.wav"
        self.sfx.write_wav(p, x)
        return self.loud.measure(p)

    def quiet_game(self, dur=20):
        g = np.zeros((dur * SR, 2), np.float32)
        for i in range(int(dur / 0.5) - 4):   # steps every 0.5 s, at about -20 LUFS as premix_sfx leaves the stem
            j = int(0.5 * i * SR)
            g[j:j + len(STEP)] += self.sfx.stereo(STEP * 0.6)
        return g

    def impact(self, dur, at):
        fx = np.zeros((dur * SR, 2), np.float32)
        x = self.sfx.synth_boom(1.1, 110, 40, 0.3)
        x = x if x.ndim == 2 else self.sfx.stereo(x)
        x = x * (1.4 * 0.9 / np.abs(x).max())   # ['impact', mark, {gain: 1.4}] at sfx.py's level, near full scale
        j = int(at * SR)
        fx[j:j + len(x)] += x[:len(fx) - j]
        return fx

    def steps_after_master(self, mix, upto):
        g = -18 - self.measure(mix)              # every later stage: an integrated loudness of the premix
        return rms_db(mix[:upto] * 10 ** (g / 20))

    def test_quiet_track_plus_impact_keeps_the_steps(self):
        dur = 20
        game, fx = self.quiet_game(dur), self.impact(dur, dur - 1.5)
        ref = self.steps_after_master(game, (dur - 2) * SR)
        raw = self.steps_after_master(game + fx, (dur - 2) * SR)
        with tempfile.TemporaryDirectory() as d:
            gw, fw, ow = (pathlib.Path(d) / n for n in ("g.wav", "f.wav", "o.wav"))
            self.sfx.write_wav(gw, game)
            self.sfx.write_wav(fw, fx)
            k = self.edit.cap_sfx_share(gw, fw, ow)
            capped = self.steps_after_master(self.sfx.read_audio(ow), (dur - 2) * SR)
        self.assertLess(k, 1.0)
        self.assertGreater(ref - raw, 6, "the uncapped impact should have dragged the steps down (the bug)")
        self.assertLess(abs(capped - ref), 6.0, f"steps {capped - ref:+.1f} dB with the impact")

    def test_busy_track_keeps_its_impact(self):
        dur = 20
        game = self.quiet_game(dur)
        for i in range(34):   # a blast every 0.5 s from 2 s (tnt: 76 in 10 s): the game is loud on its own
            j = int((2 + 0.5 * i) * SR)
            game[j:j + len(BLAST)] += self.sfx.stereo(BLAST)[:len(game) - j]
        game *= 10 ** ((-20 - self.measure(game)) / 20)
        self.assertEqual(self.edit.cap_share(game, self.impact(dur, 18.5), self.measure), 1.0)


if __name__ == "__main__":
    unittest.main()
