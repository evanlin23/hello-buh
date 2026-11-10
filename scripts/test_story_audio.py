"""Tests for the story mix (scripts/story_audio.py, docs/audio.md) and the on-screen sound check (scripts/onscreen_sfx.py).
Synthetic audio and a fake story only: no music download, no Mojang assets, no Gemini.
Run: python3 -m unittest scripts/test_story_audio.py (npm test runs it through lib/hb/test/story_audio.test.js)."""
import json
import pathlib
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import onscreen_sfx as O  # noqa: E402
import story_audio as A  # noqa: E402

SR = A.SR


def story(td, payoff="boom", audio=None, mood=None):
    """A two-line story whose lines are spoken 1.0-3.0 s and 4.0-6.0 s of the Short; the payoff mark at 8.0 s."""
    d = pathlib.Path(td) / "s"
    (d / "voice").mkdir(parents=True)
    st = {"lines": [{"id": "L01", "text": "One"}, {"id": "L02", "text": "Two"}], "payoff": payoff}
    if audio is not None:
        st["audio"] = audio
    if mood is not None:
        st["mood"] = mood
    (d / "story.json").write_text(json.dumps(st))
    (d / "voice" / "voice.json").write_text(json.dumps({"lines": {"L01": {"onset": 0.0, "end": 2.0, "dur": 2.0},
                                                                  "L02": {"onset": 0.0, "end": 2.0, "dur": 2.0}}}))
    tl = [{"t": 1000, "event": "line", "id": "L01"}, {"t": 4000, "event": "line", "id": "L02"}, {"t": 8000, "event": "boom"},
          {"t": 9000, "event": "story_end"}]
    return str(d), tl


def tone(sec, hz, amp):
    t = np.arange(int(sec * SR)) / SR
    x = (amp * np.sin(2 * np.pi * hz * t)).astype(np.float32)
    return np.stack([x, x], 1)


class Score(unittest.TestCase):
    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        self.track = pathlib.Path(self.td.name) / "bed.wav"
        A.write(self.track, tone(20, 220, 0.3) + tone(20, 1500, 0.1))
        self._pick, self._lead = A.pick, A.lead_in
        A.pick = lambda mood, name, role="bed", used=None, avoid=(), pin=None: (
            {"id": "t", "title": "T", "artist": "K", "licence": "CC BY", "credit": "T by K"}, self.track)
        A.lead_in = lambda p: 0.0

    def tearDown(self):
        A.pick, A.lead_in = self._pick, self._lead
        self.td.cleanup()

    def test_bed_stops_before_the_payoff_and_never_comes_back(self):
        sd, tl = story(self.td.name, mood=["tense", "sad"])
        dur = 9.0
        P = A.payoff_time(sd, tl, 0.0, dur)
        self.assertAlmostEqual(P, 8.0, places=2)
        bed, meta = A.score_bed(sd, "story_x", dur, A.speech_spans(sd, tl, 0.0), P)
        cut = int((P - A.SILENCE_BEFORE_HIT) * SR)
        self.assertGreater(np.abs(bed[cut - SR:cut - int(0.2 * SR)]).max(), 0.01)   # music right up to the drop-out
        self.assertEqual(np.abs(bed[cut:]).max(), 0.0)                              # silence before the hit, no sting after
        self.assertEqual(meta["tracks"], ["t"])
        self.assertEqual(meta["credit"], "T by K")

    def test_bed_sits_about_13_db_under_the_voice_while_speaking(self):
        sd, tl = story(self.td.name, payoff=None)
        dur = 7.0
        spans = A.speech_spans(sd, tl, 0.0)
        bed, _ = A.score_bed(sd, "story_x", dur, spans, None)
        a, b = int(1.5 * SR), int(2.8 * SR)
        under = A.lufs(bed[a:b])
        self.assertAlmostEqual(A.VOICE_LUFS - under, A.VOICE_LUFS - A.BED_LUFS + A.BED_DUCK_DB, delta=2.0)
        self.assertLess(A.BED_DUCK_DB, 4.0)   # the reference doesn't audibly duck: no pumping

    def test_mix_story_carries_the_score_and_its_credit(self):
        sd, tl = story(self.td.name)
        nar = pathlib.Path(self.td.name) / "nar.wav"
        v = np.zeros((9 * SR, 2), np.float32)
        v[SR:3 * SR] = tone(2, 180, 0.3)
        v[4 * SR:6 * SR] = tone(2, 180, 0.3)
        A.write(nar, v)
        out = pathlib.Path(self.td.name) / "mix.wav"
        A.mix_story(nar, None, 0.0, sd, tl, 0.0, 9.0, out, name="story_x")
        meta = json.loads(pathlib.Path(str(out) + ".json").read_text())
        self.assertEqual(meta["score"]["tracks"], ["t"])
        self.assertIn("bed", meta["levels_lufs_premaster"])


class Design(unittest.TestCase):
    def test_no_whoosh_by_default_and_a_soft_riser(self):
        with tempfile.TemporaryDirectory() as td:
            sd, tl = story(td, mood="tense")
            tl = tl + [{"t": 3000, "event": "cut", "scene": True}, {"t": 5000, "event": "time", "time": 18000}]
            self.assertFalse(A.audio_opts(sd)["whoosh"])
            x, notes = A.design_track(sd, tl, 0.0, 9.0)
            self.assertFalse(any(n.startswith("whoosh") for n in notes))
            riser = x[: int((8.0 - A.SILENCE_BEFORE_HIT) * SR)]
            self.assertLessEqual(20 * np.log10(np.abs(riser).max() + 1e-9), A.RISER_PEAK + 0.5)

    def test_no_riser_without_a_hit(self):
        with tempfile.TemporaryDirectory() as td:
            sd, tl = story(td, audio={"hit": False}, mood=["funny", "sad"])
            _, notes = A.design_track(sd, tl, 0.0, 9.0)
            self.assertEqual(notes, [])


class Clarity(unittest.TestCase):
    def test_sfx_held_under_the_voice_only_while_speaking(self):
        n = 6 * SR
        voice = np.zeros((n, 2), np.float32)
        voice[SR:3 * SR] = tone(2, 1000, 0.1)
        sfx = tone(6, 1200, 0.2)   # louder than the voice in the speech band
        g, deepest = A.clarity_gain(voice, sfx, [(1.0, 3.0)])
        self.assertLess(g[2 * SR, 0], 10 ** (-5 / 20))                 # cut under the line
        self.assertAlmostEqual(float(g[5 * SR, 0]), 1.0, places=3)      # untouched after it
        self.assertGreaterEqual(deepest, -A.GUARD_MAX_DB - 0.01)

    def test_no_voice_no_guard(self):
        n = 3 * SR
        g, d = A.clarity_gain(np.zeros((n, 2), np.float32), tone(3, 1000, 0.2), [(0.5, 2.0)])
        self.assertEqual(float(g.min()), 1.0)


class OnScreen(unittest.TestCase):
    def test_key_words_drop_idle_voices_but_keep_actions_quieter(self):
        rec = {"timeline": []}
        evs = [{"t": 1.0, "kind": "voice", "sound": "entity.villager.ambient", "volume": 1.0, "pitch": 1.0, "what": "v", "has": False},
               {"t": 1.1, "kind": "place", "sound": "block.stone.place", "volume": 1.0, "pitch": 1.0, "what": "p", "has": False},
               {"t": 1.2, "kind": "door", "sound": "block.wooden_door.open", "volume": 1.0, "pitch": 1.0, "what": "d", "has": False}]
        orig = O.key_windows
        O.key_windows = lambda rec, sd: [(0.5, 2.0)]
        try:
            f = O.fills(rec, None, evs=evs)
        finally:
            O.key_windows = orig
        self.assertEqual([x[1] for x in f], ["block.stone.place", "block.wooden_door.open"])
        self.assertAlmostEqual(f[0][2], 0.35)
        self.assertAlmostEqual(f[1][2], 0.5)

    def test_a_container_opened_with_no_sound_is_flagged(self):
        tl = [{"t": 1000, "event": "line", "id": "L01"}, {"t": 2000, "event": "container", "title": "container.chest"},
              {"t": 5000, "event": "container", "title": "container.chest"}, {"t": 5100, "event": "sound", "sound": "block.chest.open"},
              {"t": 9000, "event": "story_end"}]
        silent = O.silent_actions({"timeline": tl}, evs=[])
        self.assertEqual([round(t, 1) for t, _ in silent], [2.0])

    def test_vanilla_idle_timer_rate(self):
        # one villager next to the camera for 60 s: vanilla's timer gives a sound every ~6 s on average
        poses = [[k, 0.0, 64.0, 0.0, 0.0, 0.0] for k in range(1200)]
        ents = {7: [[k, 7, "villager", 2.0, 64.0, 0.0] for k in range(1200)]}
        known = {"entity.villager.ambient": {}, "entity.villager.hurt": {}}
        v = O._voices({}, poses, ents, 0, 1199, known)
        self.assertTrue(5 <= len(v) <= 16, len(v))
        self.assertTrue(all(s == "entity.villager.ambient" for *_, s in v))

    def test_steps_follow_the_distance_walked(self):
        poses = [[k, 0.0, 64.0, 0.0, 0.0, 0.0] for k in range(100)]
        ents = {3: [[k, 3, "zombie", k * 0.2, 64.0, 0.0] for k in range(100)]}   # 4 blocks/s for 5 s: 20 blocks
        known = {"entity.zombie.hurt": {}}
        steps, _ = O._movers({}, poses, ents, 0, 99, known)
        near = [s for s in steps if s["x"] <= O.HEAR]
        self.assertTrue(6 <= len(near) <= 12, len(near))   # one per 1/0.6 blocks within hearing


if __name__ == "__main__":
    unittest.main()
