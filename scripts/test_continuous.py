"""Tests for continuous takes (story.json "voice_takes": "beat"; docs/voices.md "Continuous takes"): the take gate,
the beat take's slicing and metadata, the narration track and the captions. Synthetic audio only: no Whisper, no
API. Run: python3 -m unittest scripts/test_continuous.py (npm test runs it through lib/hb/test/continuous.test.js)."""
import json
import os
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


def aligner(min_gap=0.15):
    """Fake forced aligner (tts.align_lines' shape): each line's words [(start, end)] from the loud stretches."""
    def align(y, texts):
        ws = [w for t in texts for w in t.split()]
        return tts.lines_of(texts, words_for(y, ws, min_gap))
    return align


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
        done, meta = tts.voice_beat(beat, cs, self.d, tries=3, hear_fn=hear, align_fn=aligner())
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


def pitch(y):
    """The strongest frequency (Hz) of a steady tone."""
    s = np.abs(np.fft.rfft(y * np.hanning(len(y))))
    return float(np.fft.rfftfreq(len(y), 1 / SR)[np.argmax(s)])


class SpeedUp(unittest.TestCase):
    """The Roblox narrator's speed-up (cast `tempo` then `rate`; docs/voices.md "The Roblox narrator"): applied to the
    whole raw take, before the trim, the slices and the take gate, so pauses are judged as they are heard."""

    def test_rate_raises_pitch_and_tempo_together(self):
        x = vowel(2.0, hz=200.0)
        y = tts.speed_up(x, 1.0, 1.45)
        self.assertAlmostEqual(len(y) / len(x), 1 / 1.45, delta=0.01)
        self.assertAlmostEqual(pitch(y[1000:-1000]), 290.0, delta=4)      # 200 Hz x 1.45: played faster, no correction

    def test_tempo_keeps_pitch(self):
        x = vowel(2.0, hz=200.0)
        y = tts.speed_up(x, 0.95, 1.0)
        self.assertAlmostEqual(len(y) / len(x), 1 / 0.95, delta=0.01)
        self.assertAlmostEqual(pitch(y[1000:-1000]), 200.0, delta=4)
        z = tts.speed_up(x, 0.95, 1.45)                                      # the narrator: 1 / (0.95 x 1.45) as long
        self.assertAlmostEqual(len(z) / len(x), 1 / (0.95 * 1.45), delta=0.01)
        self.assertAlmostEqual(pitch(z[1000:-1000]), 290.0, delta=4)

    def test_no_speed_is_untouched(self):
        x = vowel(0.5)
        self.assertIs(tts.speed_up(x), x)
        self.assertEqual(tts.speed_of(["N"], {"N": {}}), (1.0, 1.0))

    def test_one_speed_per_request(self):
        cs = {"N": {"tempo": 0.95, "rate": 1.45}, "G": {}}
        self.assertEqual(tts.speed_of(["N"], cs), (0.95, 1.45))
        with self.assertRaises(SystemExit):
            tts.speed_of(["N", "G"], cs)

    def test_cast_narrator_is_pip(self):   # owner 2026-11-10: "the one used in dog on the hill v2"
        n = tts.library()["narrator"]
        self.assertEqual((n["voice"], n["model"], n.get("tempo"), n.get("rate"), n.get("semitones"), n.get("stretch")),
                         ("Leda", "gemini-3.8-flash-lite-tts", None, None, None, None))   # owner: Pip as in Dog on the Hill v2
        self.assertIn("bubbly nine-year-old kid", n["profile"])
        self.assertEqual(tts.say_for({"say": "Grandpa came HOME."}, n, tts.spoken), "Grandpa came home.")
        r = tts.library()["narrator_roblox"]
        self.assertEqual((r["voice"], r["tempo"], r["rate"]), ("Orus", 0.95, 1.45))

    def test_rubberband_stretch(self):
        x = take(vowel(0.6), quiet(0.2), vowel(0.6))
        self.assertEqual(tts.stretch_of(["N"], {"N": {"semitones": 1, "stretch": "rubberband"}}), (1.0, "rubberband"))
        self.assertEqual(tts.stretch_of(["N"], {"N": {}}), (0.0, "atempo"))
        y = tts.speed_up(x, 1.1, 1.0, 1, "rubberband")
        self.assertAlmostEqual(len(y) / len(x), 1 / 1.1, delta=0.03)

    def test_gate_judges_the_sped_up_take(self):
        # a 0.45 s pause between the lines: over the 0.35 s limit as Gemini read it, 0.33 s once played 1.45x faster
        raw = take(vowel(0.6), quiet(0.2), vowel(0.6), quiet(0.45), vowel(0.6))
        tmp = tempfile.TemporaryDirectory()
        old = tts.raw_take
        try:
            tts.raw_take = lambda scene, lines, cs, salt="", fixes=(): (raw, "m", "c.wav")
            beat = {"id": "L01", "scene": "", "room": "", "lines": [("N", "L01", "one two", ""), ("N", "L02", "three", "")]}
            hear = lambda y: words_for(y, ["one", "two", "three"], min_gap=0.15 / 1.45)
            slow = {"N": {"name": "N", "voice": "Orus", "profile": "p", "post": ""}}
            _, m0 = tts.voice_beat(beat, slow, pathlib.Path(tmp.name) / "a", tries=1, hear_fn=hear, align_fn=aligner(0.15 / 1.45))
            self.assertFalse(m0["ok"])
            self.assertNotIn("rate", m0)
            fast = {"N": dict(slow["N"], rate=1.45)}
            done, m1 = tts.voice_beat(beat, fast, pathlib.Path(tmp.name) / "b", tries=1, hear_fn=hear, align_fn=aligner(0.15 / 1.45))
            self.assertTrue(m1["ok"], m1["gate"])
            self.assertEqual(m1["rate"], 1.45)
            # the whole (sped-up) take is the beat file and its slices tile it exactly
            y = np.concatenate([done["L01"][2], done["L02"][2]])
            self.assertAlmostEqual(m1["dur"], len(y) / SR, places=2)
            self.assertLess(m1["dur"], m0["dur"] / 1.3)
        finally:
            tts.raw_take = old
            tmp.cleanup()


class BeatLimits(unittest.TestCase):
    def test_narrator_and_character_limits(self):   # owner: the kid narrator's ~0.5 s sentence breaks are "fine"
        cs = tts.resolve({"N": {"ref": "narrator", "role": "narrator"}, "M": {"ref": "mom"}})
        self.assertEqual(tts.beat_limits({}, cs, "N", "N")["rest"]["between"], 0.6)
        self.assertEqual(tts.beat_limits({}, cs, "M", "N")["rest"]["between"], 1.0)
        self.assertEqual(tts.beat_limits({"max_pause": 0.3}, cs, "M", "N")["rest"]["between"], 0.3)   # the story wins


class PauseCap(unittest.TestCase):
    def test_capped_take_passes_the_gate_and_keeps_the_words(self):
        x = take(vowel(0.6), quiet(0.7), vowel(0.6), quiet(0.5), vowel(0.6))
        self.assertTrue(any(ln > 0.35 for _, ln in G.pauses(x, SR)))
        y = tts.shorten_pauses(x, 0.12)
        self.assertTrue(all(ln <= 0.13 for _, ln in G.pauses(y, SR)))      # every silence capped (gate: 0.3/0.35)
        self.assertAlmostEqual(len(x) - len(y), int((0.7 - 0.12) * SR) + int((0.5 - 0.12) * SR), delta=0.03 * SR)
        loud = lambda z: int(np.sum(np.abs(z) > 0.05))
        self.assertAlmostEqual(loud(x), loud(y), delta=0.02 * SR)          # the words are untouched

    def test_cast_narrator_pause_caps(self):
        # the kid narrator is performed continuously and never gap-cut (owner: the capped take sounded artificial);
        # the Roblox narrator keeps its cap
        cs = tts.resolve({"N": {"ref": "narrator", "role": "narrator"}, "R": {"ref": "narrator_roblox", "role": "narrator"}})
        self.assertIsNone(cs["N"].get("pause_cap"))
        self.assertEqual(cs["R"].get("pause_cap"), 0.12)


def old_whisper_cut(x, heard, lw, fw):
    """The beat cutter's rule before 2026-11-10 (tts.bounds): the quiet point of a window that opened 0.1 s after
    the last word's heard start. Light Sleeper's L07|L08 went inside "screamed" this way."""
    t0 = min(heard[lw][2] - 0.05, heard[lw][1] + 0.1)
    t1 = min(max(heard[fw][1] + 0.3, heard[lw][2] + 0.1), max(heard[fw][2], heard[lw][2] + 0.1))
    return tts.quiet_point(x, t0, t1)


class StretchedWord(unittest.TestCase):
    """Whisper stretches a line's last word over the pause after it (Light Sleeper's "screamed": heard 12.58-13.56 s,
    said ~12.80-13.47 s). The line edge must come from the audio: the gap between the aligned words, never inside a
    word, and speaker_check must block a slice cut inside one."""

    def setUp(self):
        # line 1: "go", then "screamed" with a 60 ms stop closure inside it ("s-c-reamed"); a 0.12 s pause (the
        # narrator's pause_cap); line 2: "mom held"
        self.parts = [("go", vowel(0.3)), (None, quiet(0.05)), ("scr", vowel(0.45, 180)), (None, quiet(0.06)),
                      ("eamed", vowel(0.15, 180)), (None, quiet(0.12)), ("mom", vowel(0.2, 220)), (None, quiet(0.05)),
                      ("held", vowel(0.3, 220))]
        self.x = take(*[p for _, p in self.parts])
        t, at = 0.3, {}
        for name, p in self.parts:
            at[name] = (t, t + len(p) / SR)
            t += len(p) / SR
        self.at = at
        self.word = (at["scr"][0], at["eamed"][1])        # "screamed", as said
        self.gap = (at["eamed"][1], at["mom"][0])         # the true pause between the lines
        self.texts = ["Go screamed.", "Mom held."]
        # Whisper: "screamed" from its start to the next word's start (the pause swallowed)
        self.heard = [("Go", *at["go"]), ("screamed.", self.word[0], at["mom"][0]), ("Mom", *at["mom"]), ("held.", *at["held"])]
        # the aligner: the words as said (its word end comes a little early: a tail decays after the last letter's frame)
        self.aligned = [[at["go"], (self.word[0], self.word[1] - 0.04)], [at["mom"], at["held"]]]

    def test_old_rule_cut_inside_the_word(self):   # the bug, reproduced
        q = old_whisper_cut(self.x, self.heard, 1, 2) / SR
        self.assertTrue(self.word[0] < q < self.word[1], q)

    def test_aligned_cut_lands_in_the_pause(self):
        q = tts.bounds(self.x, self.texts, self.heard, self.aligned)[0] / SR
        self.assertTrue(self.gap[0] < q < self.gap[1], (q, self.gap))
        self.assertAlmostEqual(q, sum(self.gap) / 2, delta=0.03)   # the middle of the silence

    def test_aligner_by_default_whisper_only_as_fallback(self):
        calls = []
        q = tts.bounds(self.x, self.texts, self.heard, align_fn=lambda x, t: calls.append(1) or self.aligned)[0] / SR
        self.assertEqual(calls, [1])
        self.assertTrue(self.gap[0] < q < self.gap[1])
        # no aligner (no torch): Whisper's window no longer opens deep inside a long last word
        q = tts.bounds(self.x, self.texts, self.heard, align_fn=lambda x, t: None)[0] / SR
        self.assertTrue(self.gap[0] < q < self.gap[1], (q, self.gap))

    def test_gap_cut_never_inside_a_word(self):
        # no silence in the gap (the lines run together): the lowest-energy frame between the words, not in them
        x = take(vowel(0.4), noise(0.05, 0.02), vowel(0.4))
        a, b = 0.3 + 0.4, 0.3 + 0.45
        q = tts.gap_cut(x, a, b) / SR
        self.assertTrue(a <= q <= b, q)
        self.assertEqual(tts.gap_cut(x, a, a), int(round(a * SR)))   # spans touching: the junction

    def test_slice_faults(self):
        bad = old_whisper_cut(self.x, self.heard, 1, 2) / SR
        f = tts.slice_faults(self.x, SR, [0.0, bad], self.aligned)
        self.assertIn(0, f)
        self.assertIn("before its last word ends", f[0][0])
        self.assertIn(1, f)                                         # the next line's start: on the stray syllable
        good = tts.bounds(self.x, self.texts, self.heard, self.aligned)[0] / SR
        self.assertEqual(tts.slice_faults(self.x, SR, [0.0, good], self.aligned), {})
        # a cut in sound (mid-vowel of a word the aligner put earlier) is caught by the level alone
        mid = sum(self.at["eamed"]) / 2
        f = tts.slice_faults(self.x, SR, [0.0, mid], [[self.at["go"], (self.word[0], mid - 0.1)], [self.at["mom"], self.at["held"]]])
        self.assertTrue(any("dB from its peak" in w for w in f[0]), f)

    def test_speaker_check_blocks_the_bad_slice(self):
        import speaker_check as SC
        with tempfile.TemporaryDirectory() as tmp:
            p = pathlib.Path(tmp) / "beat_L01.wav"
            write_wav(p, self.x)
            bad = round(old_whisper_cut(self.x, self.heard, 1, 2) / SR, 3)
            beat = {"path": p, "lines": ["L01", "L02"], "offsets": [0.0, bad], "say": self.texts}
            items = [{"id": "L01", "beat": beat}, {"id": "L02", "beat": beat}]
            fake = lambda x, texts: self.aligned   # (speaker_check loads at 16 kHz; the spans are in seconds)
            out = SC.slice_check(items, align_fn=fake)
            self.assertEqual(sorted(out), ["L01", "L02"])
            beat["offsets"] = [0.0, round(tts.bounds(self.x, self.texts, self.heard, self.aligned)[0] / SR, 3)]
            self.assertEqual(SC.slice_check(items, align_fn=fake), {})
            self.assertIsNone(SC.slice_check(items, align_fn=lambda x, t: None))   # can't align: skipped, and said so

    def test_whisper_words_across_the_cut(self):
        import speaker_check as SC
        # Light Sleeper's L07|L08 at 12.785 s, as Whisper heard the two slices
        prev = {"say": "The bottom of the well just screamed.", "heard": "At the bottom of the well chest."}
        nxt = {"say": "Mom held me in the dark. She said it was a fox.", "heard": "Screamed. Mom held me in the dark. She said it was a fox."}
        self.assertIn("screamed", SC.cut_across(prev, nxt))
        self.assertEqual(set(SC.edge_words(prev["say"], prev["heard"])), {"last"})
        self.assertEqual(set(SC.edge_words(nxt["say"], nxt["heard"])), {"first"})
        # the same lines cut at 13.505 s
        ok_p = dict(prev, heard="The bottom of the well just screamed.")
        ok_n = dict(nxt, heard="Mom held me in the dark. She said it was a fox.")
        self.assertIsNone(SC.cut_across(ok_p, ok_n))
        self.assertEqual(SC.edge_words(ok_p["say"], ok_p["heard"]), {})
        # Whisper merging and splitting edge words is no cut
        self.assertEqual(SC.edge_words("Mom froze. Don't move, sweetie.", "Monfros. Don't move, sweetie."), {})
        self.assertEqual(SC.edge_words("The doghouse? Also carpet.", "The dog house also carpet."), {})
        # the next line's first word heard at the end of this slice
        self.assertIn("mom", SC.cut_across(dict(ok_p, heard="The bottom of the well just screamed. Mom"),
                                           dict(ok_n, heard="held me in the dark. She said it was a fox.")))


@unittest.skipUnless(os.environ.get("HB_BEAT_REGRESSION"), "set HB_BEAT_REGRESSION=<a copy of claude/story-light-sleeper's "
                     "stories/light_sleeper> (audio is not committed); needs the TTS venv's torch for the aligner")
class LightSleeperRegression(unittest.TestCase):
    """The real take: Light Sleeper's beat_L01.wav (Orus, 15 lines, 14 boundaries). The old cutter put L07|L08 at
    12.785 s, inside "screamed"; the shipped cut (by hand) is 13.505 s."""
    OLD = [2.235, 5.105, 7.075, 8.395, 10.665, 11.915, 12.785, 15.225, 17.705, 19.915, 22.175, 23.385, 24.725, 26.035]

    def test_boundaries(self):
        import voice
        d = pathlib.Path(os.environ["HB_BEAT_REGRESSION"])
        story = json.loads((d / "story.json").read_text())
        texts = [voice.spoken(l) for l in story["lines"]]
        with wave.open(str(d / "voice" / "beat_L01.wav")) as w:
            self.assertEqual(w.getframerate(), SR)
            x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        al = tts.align_lines(x, texts)
        self.assertIsNotNone(al, "the aligner didn't run (torch / the TTS venv)")
        qs = [q / SR for q in tts.bounds(x, texts, None, al)]
        self.assertEqual(len(qs), 14)
        self.assertTrue(13.45 < qs[6] < 13.58, qs[6])                          # before "Mom", not inside "screamed"
        for i, q in enumerate(qs):                                               # every cut between the two lines' words
            self.assertTrue(al[i][-1][1] <= q <= al[i + 1][0][0], (i, q))
        self.assertEqual(tts.slice_faults(x, SR, [0.0, *qs], al), {})
        self.assertLess(max(abs(a - b) for i, (a, b) in enumerate(zip(qs, self.OLD)) if i != 6), 0.05)   # the rest stay
        f = tts.slice_faults(x, SR, [0.0, *self.OLD], al)                        # the old cut: blocked
        self.assertEqual(sorted(f), [6, 7])                                    # L07 and L08 (it starts on "-eamed")
        self.assertIn("before its last word ends", f[6][0])


if __name__ == "__main__":
    unittest.main()
