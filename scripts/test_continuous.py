"""Tests for continuous takes (story.json "voice_takes": "beat"; docs/voices.md "Continuous takes"): the take gate,
the beat take's slicing and metadata, the narration track and the captions. Synthetic audio only: no Whisper, no
API. Run: python3 -m unittest scripts/test_continuous.py (npm test runs it through lib/hb/test/continuous.test.js)."""
import json
import pathlib
import sys
import tempfile
import unittest
import wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import take_gate as G  # noqa: E402
import tts  # noqa: E402

SR = tts.SR
RNG = np.random.default_rng(7)


def vowel(sec, hz=200.0, amp=0.5):
    """A voiced 'word': a harmonic tone with a soft envelope."""
    t = np.arange(int(sec * SR)) / SR
    x = sum(np.sin(2 * np.pi * hz * k * t) / k for k in (1, 2, 3))
    env = np.minimum(1, np.minimum(t, t[::-1]) / 0.02)
    return (amp * x / 1.8 * env).astype(np.float32)


def quiet(sec, amp=1e-4):
    return (RNG.standard_normal(int(sec * SR)) * amp).astype(np.float32)


def noise(sec, amp, high=False):
    """Breath-like (low-passed) or hiss-like (high-passed) noise."""
    n = RNG.standard_normal(int(sec * SR) + 64)
    k = np.ones(16) / 16
    lo = np.convolve(n, k, "same")
    x = (n - lo) if high else lo
    x = x[:int(sec * SR)]
    return (amp * x / (np.abs(x).max() + 1e-9)).astype(np.float32)


def take(*parts):
    return np.concatenate([quiet(0.3), *parts, quiet(0.4)])


def words_for(x, names, min_gap=0.15):
    """Fake Whisper: one (word, start, end) per loud stretch, named in order."""
    db = G.frame_db(x, SR)
    loud = db > db.max() - 30
    rs = G.runs(loud)
    merged = []
    for a, b in rs:
        if merged and (a - merged[-1][1]) * G.FR < min_gap:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    return [(w, a * G.FR, b * G.FR) for w, (a, b) in zip(names, merged)]


class Gate(unittest.TestCase):
    def test_pauses_inside_and_between(self):
        y = take(vowel(0.5), quiet(0.3), vowel(0.5), quiet(0.9), vowel(0.6))
        ps = G.pauses(y, SR)
        self.assertEqual(len(ps), 2)
        self.assertAlmostEqual(ps[1][1], 0.9, delta=0.06)
        heard = words_for(y, ["one", "two", "three"])
        # the 0.9 s pause holds the boundary between two lines: over the 0.8 s limit -> rejected
        b = [heard[2][1] - 0.2]
        r = G.gate(y, SR, ["one two", "three"], heard, b)
        self.assertFalse(r["ok"])
        self.assertEqual([f["kind"] for f in r["fails"]], ["pause"])
        self.assertIn("between lines", r["fails"][0]["why"])
        self.assertEqual(r["fix"], ["pause"])
        # the same take with max_pause 1.0 passes
        self.assertTrue(G.gate(y, SR, ["one two", "three"], heard, b, G.limits_for(1.0))["ok"])

    def test_opening_is_strict(self):
        y = take(vowel(0.5), quiet(0.3), vowel(0.5))
        heard = words_for(y, ["one", "two"])
        self.assertTrue(G.gate(y, SR, ["one two"], heard, [])["ok"])
        r = G.gate(y, SR, ["one two"], heard, [], opening=True)   # a 0.3 s pause inside line 1 of the story: > 0.2
        self.assertEqual([f["kind"] for f in r["fails"]], ["pause"])

    def test_breath_but_not_a_hiss(self):
        base = [vowel(0.5), quiet(0.25), None, quiet(0.1), vowel(0.5)]
        br = take(*[p if p is not None else noise(0.3, 0.05) for p in base])
        hs = take(*[p if p is not None else noise(0.3, 0.05, high=True) for p in base])
        self.assertEqual(len(G.breaths(br, SR)), 1)
        self.assertEqual(G.breaths(hs, SR), [])
        soft = take(*[p if p is not None else noise(0.3, 0.004) for p in base])   # under the silence line: part of the pause
        self.assertEqual(G.breaths(soft, SR), [])

    def test_whisper(self):
        y = take(vowel(0.5), quiet(0.2), vowel(0.5), quiet(0.2), noise(0.4, 0.08), quiet(0.05), noise(0.4, 0.08))
        heard = words_for(y, ["a", "b", "c", "d"], min_gap=0.02)
        ws = G.whispers(y, SR, heard)
        self.assertEqual(len(ws), 1)
        self.assertGreaterEqual(ws[0][1], 0.5)
        clean = take(vowel(0.5), quiet(0.2), vowel(0.5), quiet(0.2), vowel(0.5))
        self.assertEqual(G.whispers(clean, SR, words_for(clean, ["a", "b", "c"])), [])

    def test_words(self):
        h = lambda ws: [(w, i * 0.3, i * 0.3 + 0.25) for i, w in enumerate(ws)]
        texts = ["Grandpa saved thirty-one villages.", "He came home."]
        self.assertEqual(G.words_check(texts, h("grandpa saved 31 villages he came home".split())), [])
        f = G.words_check(texts, h("grandpa saved 31 villages".split()))   # line 2 dropped
        self.assertTrue(any("line 2 not heard" in x["why"] for x in f))
        f = G.words_check(texts, h("grandpa saved 31 villages read this as a kid he came home".split()))
        self.assertTrue(any("extra words" in x["why"] for x in f))

    def test_clipped_raw(self):
        y = take(vowel(0.5))
        raw = vowel(0.5)   # starts and ends on the sound: Gemini cut it
        r = G.gate(y, SR, ["one"], words_for(y, ["one"]), [], raw=raw)
        self.assertEqual({f["kind"] for f in r["fails"]}, {"clipped"})
        self.assertTrue(G.gate(y, SR, ["one"], words_for(y, ["one"]), [], raw=y)["ok"])

    def test_unplaced_lines_fail_on_words(self):
        y = take(vowel(0.5))
        r = G.gate(y, SR, ["one", "two"], words_for(y, ["one"]), None)
        self.assertIn("words", r["fix"])


class Prompt(unittest.TestCase):
    cs = {"N": {"name": "Pip", "profile": "a bubbly kid", "voice": "Leda"}}
    lines = [("N", "L01", "Hi there.", ""), ("N", "L02", "Bye now.", "")]

    def test_no_fixes_is_the_old_prompt(self):   # the prompt is the cache key: existing takes must still hit
        self.assertEqual(tts.prompt("[A kid. Sad.]", self.lines, self.cs, "gemini-3.8-flash-lite-tts"), "[A kid. Sad.]\n\nHi there.\n\nBye now.")

    def test_fixes_tighten_the_direction(self):
        p = tts.prompt("[A kid. Sad.]", self.lines, self.cs, "gemini-3.8-flash-lite-tts", [G.FIX["pause"]])
        self.assertTrue(p.startswith("[A kid. Sad.; one continuous take, no pauses between sentences]"))
        p = tts.prompt("A room.", self.lines, self.cs, "gemini-3.1-flash-tts-preview", [G.FIX["whisper"]])
        self.assertIn("ONE continuous take: full voice throughout, never whispering.", p)
        self.assertLess(p.index("ONE continuous"), p.index("#### TRANSCRIPT"))


class BeatTake(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = pathlib.Path(self.tmp.name)
        self._raw = tts.raw_take

    def tearDown(self):
        tts.raw_take = self._raw
        self.tmp.cleanup()

    def test_reject_then_retake_then_slice(self):
        bad = take(vowel(0.6), quiet(1.4), vowel(0.6), quiet(0.45), vowel(0.6))   # a 1.4 s pause inside line 1
        good = take(vowel(0.6), quiet(0.2), vowel(0.6), quiet(0.25), vowel(0.6))   # gaps under the 0.3/0.35 s limits
        calls = []

        def fake_raw(scene, lines, cs, salt="", fixes=()):
            calls.append(list(fixes))
            return (bad if not fixes else good), "gemini-test", f"cache/{len(calls)}.wav"
        tts.raw_take = fake_raw
        cs = {"N": {"name": "N", "voice": "Leda", "profile": "p", "post": ""}}
        beat = {"id": "L01", "scene": "[A kid]", "room": "", "lines": [("N", "L01", "one two", ""), ("N", "L02", "three", "")]}
        hear = lambda y: words_for(y, ["one", "two", "three"])
        done, meta = tts.voice_beat(beat, cs, self.d, tries=3, hear_fn=hear)
        self.assertEqual(calls, [[], [G.FIX["pause"]]])   # the second request carries the fix
        self.assertTrue(meta["ok"])
        self.assertEqual((meta["try"], meta["tries"]), (2, 2))
        self.assertEqual(meta["rejected"][0]["try"], 1)
        y = np.concatenate([done["L01"][2], done["L02"][2]])
        self.assertAlmostEqual(meta["dur"], len(y) / SR, places=2)          # the slices tile the take exactly
        self.assertEqual(meta["offsets"][0], 0.0)
        self.assertAlmostEqual(meta["offsets"][1], len(done["L01"][2]) / SR, places=3)
        # the boundary sits in the 0.25 s pause between the lines (the take's own gap, untouched)
        self.assertGreater(meta["offsets"][1], 0.3 + 1.4 - 0.1)
        self.assertLess(meta["offsets"][1], 0.3 + 1.4 + 0.25 + 0.1)
        self.assertTrue((self.d / "L02.wav").exists() and (self.d / "beat_L01.wav").exists())

    def test_every_try_fails_keeps_the_least_bad(self):
        worse = take(vowel(0.6), quiet(2.0), vowel(0.6))
        bad = take(vowel(0.6), quiet(1.0), vowel(0.6))
        seq = iter([worse, bad, worse])
        salts = []

        def fake_raw(scene, lines, cs, salt="", fixes=()):
            salts.append(salt)
            return next(seq), "m", "c.wav"
        tts.raw_take = fake_raw
        cs = {"N": {"name": "N", "voice": "Leda", "profile": "p", "post": ""}}
        beat = {"id": "L05", "scene": "", "room": "", "lines": [("N", "L05", "one two", "")]}
        _, meta = tts.voice_beat(beat, cs, self.d, tries=3, hear_fn=lambda y: words_for(y, ["one", "two"]))
        self.assertFalse(meta["ok"])
        self.assertEqual(meta["try"], 2)            # the 1.0 s pause beats the 2.0 s one
        self.assertEqual(salts, ["", "", "try2"])   # same faults again: same direction, a fresh request
        self.assertEqual(len(meta["rejected"]), 3)


def write_wav(p, x, sr=SR):
    with wave.open(str(p), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


class Track(unittest.TestCase):
    """The narration lays a beat take whole at its first mark; the captions follow the take's offsets."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.d = pathlib.Path(self.tmp.name)
        (self.d / "voice").mkdir()
        self.beat = take(vowel(0.6, 220), quiet(0.4), vowel(0.6, 330))
        off = 0.3 + 0.6 + 0.2   # the line boundary, in the middle of the 0.4 s pause
        k = int(off * SR)
        write_wav(self.d / "voice" / "beat_L01.wav", self.beat)
        write_wav(self.d / "voice" / "L01.wav", self.beat[:k])
        write_wav(self.d / "voice" / "L02.wav", self.beat[k:])
        self.solo = take(vowel(0.5, 150))
        write_wav(self.d / "voice" / "L03.wav", self.solo)
        story = {"gap": 0.25, "captions": "chunk", "lines": [{"id": i, "text": t} for i, t in (("L01", "Hello"), ("L02", "There"), ("L03", "Bye"))]}
        (self.d / "story.json").write_text(json.dumps(story))
        dur = len(self.beat) / SR
        self.v = {"gap": 0.25, "voice_takes": "beat",
                  "beats": {"L01": {"lines": ["L01", "L02"], "file": "beat_L01.wav", "offsets": [0.0, round(off, 3)], "dur": dur}},
                  "lines": {"L01": {"dur": round(off, 3), "onset": 0.3, "end": 0.9, "chunks": [[0.3, 0.9]], "captions": ["Hello"], "beat": "L01", "offset": 0.0, "gap": 0},
                            "L02": {"dur": round(dur - off, 3), "onset": 0.2, "end": 0.8, "chunks": [[0.2, 0.8]], "captions": ["There"], "beat": "L01", "offset": round(off, 3)},
                            "L03": {"dur": len(self.solo) / SR, "onset": 0.3, "end": 0.8, "chunks": [[0.3, 0.8]], "captions": ["Bye"]}}}
        (self.d / "voice" / "voice.json").write_text(json.dumps(self.v))
        self.off = off
        import story_track
        self.st = story_track
        story_track.POSES = None

    def tearDown(self):
        self.tmp.cleanup()

    def tl(self, l2_late=0.0):
        """Marks as K.line makes them: L02 at the take's offset (to the tick), L03 after the take + gap."""
        t1 = 1.0
        t2 = t1 + round(self.off * 20) / 20 + l2_late
        t3 = t1 + round((len(self.beat) / SR + 0.25) * 20) / 20
        return [{"t": int(t * 1000), "event": "line", "id": i} for t, i in ((t1, "L01"), (t2, "L02"), (t3, "L03"))], t3

    def test_narration_plays_the_take_whole(self):
        tl, t3 = self.tl(l2_late=0.3)   # even with L02's mark late (a preroll), the take is not moved or cut
        out = self.d / "n.wav"
        self.st.narration_wav(self.d, tl, 0.0, 6.0, out)
        with wave.open(str(out)) as w:
            y = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        sr = 48000
        seg = y[int(1.0 * sr):int(1.0 * sr) + int(len(self.beat) * sr / SR)]
        ref = np.interp(np.arange(len(seg)) * SR / sr, np.arange(len(self.beat)), self.beat)
        self.assertLess(np.abs(seg - ref).max(), 2e-3)   # the beat take, sample for sample (no second copy of L02 on top)

    def test_voice_starts_and_captions(self):
        tl, t3 = self.tl(l2_late=0.05)
        marks = self.st._marks(tl, 0.0, {"L01", "L02", "L03"})
        vs, lay = self.st.voice_starts(self.v, marks)
        self.assertAlmostEqual(vs["L02"], 1.0 + self.off, places=6)   # the take's offset, not the (late) mark
        self.assertEqual([w for _, w, _ in lay], ["beat_L01.wav", "L03.wav"])
        ev = self.st.caption_events(self.d, tl, 0.0, 6.0, who=True)
        by = {e[3]: e for e in ev}
        lead = self.st.CAPTION_LEAD
        self.assertAlmostEqual(by["L01"][0], 1.0 + 0.3 - lead, places=3)
        # L02's word lands on the take's own time; it may not show before L02's own (late) cut
        self.assertAlmostEqual(by["L02"][0], max(tl[1]["t"] / 1000, 1.0 + self.off + 0.2 - lead), places=3)
        self.assertAlmostEqual(by["L03"][0], t3 + 0.3 - lead, places=3)


class Meta(unittest.TestCase):
    def test_write_meta_beats(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = pathlib.Path(tmp)
            (d / "voice").mkdir()
            sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
            import voice
            story = {"gap": 0.2, "max_pause": 0.1, "lines": [{"id": "L01", "text": "One two."}, {"id": "L02", "text": "Three."}]}
            y1, y2 = take(vowel(0.4), quiet(0.5), vowel(0.4)), take(vowel(0.4))   # max_pause must NOT trim y1
            done = {"L01": ("N", "One two.", y1), "L02": ("N", "Three.", y2)}
            beats = {"L01": {"lines": ["L01", "L02"], "offsets": [0.0, round(len(y1) / SR, 3)], "file": "beat_L01.wav", "ok": True}}
            tts._write_meta(d, story, voice, {"lines": {}}, None, done, {}, {k: [("N",)] for k in done}, beats)
            v = json.loads((d / "voice" / "voice.json").read_text())
            self.assertEqual(v["voice_takes"], "beat")
            self.assertEqual(v["lines"]["L01"]["gap"], 0)
            self.assertNotIn("gap", v["lines"]["L02"])
            self.assertEqual(v["lines"]["L02"]["offset"], beats["L01"]["offsets"][1])
            self.assertEqual(v["lines"]["L01"]["dur"], round(len(y1) / SR, 3))   # untrimmed
            self.assertAlmostEqual(v["total"], round(len(y1) / SR + len(y2) / SR + 0.2, 2), places=2)

    def test_beat_groups(self):
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
        import voice
        cs = {"N": {"name": "N"}, "G": {"name": "G"}}
        story = {"requests": [{"id": "r1", "speakers": ["N"], "lines": ["L01", "L02"], "direction": "[happy]"},
                              {"id": "r2", "speakers": ["N"], "lines": ["L03", "L04"], "direction": "[sad]"},
                              {"id": "r3", "speakers": ["G"], "direction": "[old]"}],
                 "lines": [{"id": "L01", "text": "a"}, {"id": "L02", "text": "b"}, {"id": "L03", "text": "c"},
                           {"id": "L04", "text": "d"}, {"id": "L05", "text": "e", "who": "G"},
                           {"id": "L06", "text": "f", "beat": "x"}, {"id": "L07", "text": "g", "beat": "x"}, {"id": "L08", "text": "h"}]}
        bs = tts.beat_groups(story, cs, "N", voice.spoken)
        self.assertEqual([[l for _, l, _, _ in b["lines"]] for b in bs], [["L01", "L02"], ["L03", "L04"], ["L05"], ["L06", "L07"], ["L08"]])
        self.assertEqual([b["scene"] for b in bs[:3]], ["[happy]", "[sad]", "[old]"])


if __name__ == "__main__":
    unittest.main()
