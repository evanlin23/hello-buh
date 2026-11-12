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

    def wav(self, d, name, x):
        w = pathlib.Path(d) / name
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", str(w)],
                       input=x.astype(np.float32).tobytes(), check=True)
        return w

    def test_silent_and_quiet_games_never_send_the_song_hot(self):
        # review of e78b8f1: a silent stem measures -70 LUFS, tame_gain read that as +57 dB and the song came in ~30 dB hot
        # review of 920679d: judged on the stem AFTER its static pre-gain (up to +30 dB) a -60 LUFS game was a -30.8 stem
        # and got +48 dB in all: the stem is built here as add_song builds it (add_song.game_first_levels)
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
        import add_song
        rng = np.random.default_rng(3)
        with tempfile.TemporaryDirectory() as d:
            for x in (np.zeros(4 * SR), tone(4.0, 300, 10 ** (-60 / 20)), (10 ** (-60 / 20)) * rng.uniform(-1, 1, 4 * SR)):   # silence, a -60 dB tone, -60 dB hiss
                w = self.wav(d, "g.wav", x)
                raw = loud.measure(w)
                _, g, song, stem, raw2 = add_song.game_first_levels(w, -16.0, -1.0, pathlib.Path(d) / "stem.wav")
                self.assertEqual(raw2, raw)
                self.assertEqual(song, -16.0)   # the plain bed
                if raw > -69:   # the pre-gain undone: the game leaves the mix as quiet as it came in
                    self.assertAlmostEqual(stem + g, raw, delta=0.2)
                else:
                    self.assertEqual(g, 0.0)
            # a normal game: the song at its offset under the game as built (bed + 15 + stem + gain)
            w = self.wav(d, "n.wav", game_track(amp=0.5))
            _, g, song, stem, raw = add_song.game_first_levels(w, -16.0, -1.0, pathlib.Path(d) / "stem.wav")
            self.assertGreater(raw, loud.SILENT_GAME)
            self.assertAlmostEqual(song, -16.0 + 15 + stem + g, places=6)
        # a normal stem: the song at its offset under the game as measured (bed + 15 + stem + gain)
        g, song = loud.stunt_levels(-20.0, -10.0, -16.0, -12.5, -1.0)
        self.assertAlmostEqual(g, 7.5)
        self.assertAlmostEqual(song, -16.0 + 15 - 20 + 7.5)
        # a quiet stem (the static -15 clamped): the song follows the game down, not the -15 it never reached
        g, song = loud.stunt_levels(-40.0, -30.0, -16.0, -12.5, -1.0)
        self.assertEqual(g, loud.GAIN_RANGE)
        self.assertAlmostEqual(song - (-40.0 + g), -16.0 + 15)


class Settle(unittest.TestCase):
    def test_lowering_is_remixed_and_remeasured(self):
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
        import add_song
        calls = []
        def remix(sdb):   # each dB off the song: +1 dB of under, but the first remix lands 1 dB short
            calls.append(sdb)
            return 0.0 + (-sdb) - (1.0 if len(calls) == 1 else 0.0)
        sdb, cuts = add_song.settle_song(0.0, 0.0, remix, want=4.0)
        self.assertEqual(len(calls), 2)   # re-measured, and lowered again
        self.assertAlmostEqual(cuts[0][0], 4.0)
        self.assertAlmostEqual(cuts[1][0], 1.0)
        self.assertAlmostEqual(sdb, -5.0)
        # nothing to do: no remix
        calls.clear()
        self.assertEqual(add_song.settle_song(-3.0, 6.0, remix, want=4.0), (-3.0, []))
        self.assertEqual(add_song.settle_song(-3.0, None, remix, want=4.0), (-3.0, []))
        self.assertEqual(calls, [])
        # capped at `most` dB in all
        sdb, cuts = add_song.settle_song(0.0, -20.0, lambda s: -20.0, want=4.0, most=12.0)
        self.assertAlmostEqual(sdb, -12.0)


class Blind(unittest.TestCase):
    def test_a_short_hard_limited_run_fails(self):
        # 20 s of steady +2 dB, one 0.6 s stretch limited 10 dB: 3% of the windows, the p5-p95 spread misses it
        pre = np.full(400, -20.0)
        fin = pre + 2.0
        fin[100:112] -= 10.0
        sp, _ = M.pump(fin, pre)
        self.assertLess(sp, M.PUMP_MAX)
        self.assertGreaterEqual(M.pump_run(fin, pre), M.RUN_S)
        fin2 = pre + 2.0
        fin2[100:104] -= 10.0   # 0.2 s: a single hit, fine
        self.assertLess(M.pump_run(fin2, pre), M.RUN_S)

    def test_room_tone_counts_as_quiet_and_songless_windows_are_left_out(self):
        game = game_track(amp=0.5) + tone(8.0, 90, 10 ** (-40 / 20))   # a constant room tone at -40 dB
        u, nb, nq = M.under(windows(game + tone(8.0, 220, 0.03)), windows(game))
        self.assertIsNotNone(u)
        self.assertGreater(nq, M.MIN_WIN)
        # a late song: no music for the first half: those quiet windows are not "music-only"
        game2 = game_track(amp=0.5)
        late = tone(8.0, 220, 0.03)
        late[:4 * SR] = 0
        _, _, nq2 = M.under(windows(game2 + late), windows(game2))
        _, _, nq_all = M.under(windows(game2 + tone(8.0, 220, 0.03)), windows(game2))
        self.assertLess(nq2, nq_all)


class Wiring(unittest.TestCase):
    def test_add_song_records_the_mix_in_metadata(self):
        """add_song.main on a scratch package (a 6 s synthetic game, a synthetic song) writes metadata.json `mix` (the
        publish gate's input, scripts/gates.py mix_gate) and short.mp4 on the game-first path."""
        import gzip
        import json
        import add_song
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
        old = add_song.VID
        with tempfile.TemporaryDirectory() as d:
            try:
                d = pathlib.Path(d)
                pk = d / "shorts" / "midas_touch"
                pk.mkdir(parents=True)
                g = game_track(6.0, amp=0.5)
                gw, sw = d / "g.wav", d / "song.wav"
                for w, x in ((gw, np.stack([g, g], 1)), (sw, np.stack([tone(20.0, 110, 0.2)] * 2, 1))):
                    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(w)],
                                   input=x.astype(np.float32).tobytes(), check=True)
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=green:s=64x64:r=10:d=6", "-i", str(gw),
                                "-c:v", "libx264", "-c:a", "aac", "-shortest", str(pk / "short_nosong.mp4")], check=True)
                (pk / "metadata.json").write_text(json.dumps({"caption": "x", "youtube": {"hashtags": []}}))
                tl = [{"t": 0, "event": "start"}, {"t": 1000, "event": "touch"}, {"t": 3000, "event": "wave"}]
                (pk / "recording.json.gz").write_bytes(gzip.compress(json.dumps({"timeline": tl, "poses": []}).encode()))
                add_song.VID = d
                add_song.main("midas_touch", str(sw))
                meta = json.loads((pk / "metadata.json").read_text())
                self.assertIn("mix", meta)
                for k in ("pump", "pump_run", "under", "ok", "summary"):
                    self.assertIn(k, meta["mix"])
                self.assertTrue((pk / "short.mp4").exists())
                self.assertLessEqual(loud.true_peak(pk / "short.mp4"), -0.9)   # the peak limiter, no makeup gain
            finally:
                add_song.VID = old


if __name__ == "__main__":
    unittest.main()
