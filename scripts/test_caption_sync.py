"""Tests for the caption timing (docs/voices.md "Caption timing"): words spelled for matching, caption words mapped onto timed words by
their text (not by index), the CTC Viterbi, the hiss refinement, and the caption frame rounding. Synthetic data only:
no model, no API. Run: python3 -m unittest scripts/test_caption_sync.py (npm test runs it through
lib/hb/test/captions.test.js)."""
import json
import pathlib
import sys
import tempfile
import unittest

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import ctc_align as A  # noqa: E402
import caption_av_check as C  # noqa: E402


class Spelling(unittest.TestCase):
    def test_spoken_words(self):
        self.assertEqual(A.spoken_words("31"), ["thirty", "one"])
        self.assertEqual(A.spoken_words("9,000"), ["nine", "thousand"])
        self.assertEqual(A.spoken_words("THIRTY-SEVEN."), ["thirty", "seven"])
        self.assertEqual(A.spoken_words("DON'T,"), ["don't"])
        self.assertEqual(A.spoken_words("50%"), ["fifty", "percent"])
        self.assertEqual(A.spoken_words("1998"), ["nineteen", "ninety", "eight"])
        self.assertEqual(A.spoken_words("—"), [])
        self.assertEqual(A.letters("SIXTY-FOUR."), "sixtyfour")


class MatchByText(unittest.TestCase):
    def test_whisper_split_number_does_not_shift_later_words(self):
        # gold_for_the_portal L01: Whisper heard "9" ",000" and "inks"; by index, "gold" got ",000"'s time
        toks = "My grandma has thrown NINE THOUSAND gold ingots".split()
        heard = [["My", 0.32, 0.54], ["grandma", 0.54, 0.76], ["has", 0.76, 1.2], ["thrown", 1.2, 1.48], ["9", 1.48, 2.26],
                 [",000", 2.26, 2.88], ["gold", 2.88, 3.16], ["inks", 3.16, 3.48]]
        m = A.match_words(toks, heard)
        self.assertAlmostEqual(m[4][0], 1.48)               # NINE
        self.assertTrue(1.48 < m[5][0] < 2.88)              # THOUSAND inside the merged "9,000"
        self.assertAlmostEqual(m[6][0], 2.88)               # gold on "gold", not on ",000"
        self.assertAlmostEqual(m[7][0], 3.16)               # ingots on "inks" (letters in common)

    def test_merged_and_split_words(self):
        m = A.match_words(["pork", "chops", "now"], [["porkchops", 1.0, 1.9], ["now", 2.0, 2.2]])
        self.assertAlmostEqual(m[0][0], 1.0)
        self.assertAlmostEqual(m[1][0], 1.4)                # 4 of porkchops' 9 letters in
        self.assertAlmostEqual(m[2][0], 2.0)
        m = A.match_words(["THIRTY-SEVEN", "times"], [["37", 2.0, 2.5], ["times", 2.5, 2.9]])
        self.assertAlmostEqual(m[0][0], 2.0)
        self.assertAlmostEqual(m[1][0], 2.5)
        m = A.match_words(["pork", "chops"], [["pork", 1.0, 1.3], ["chop", 1.3, 1.6], ["s", 1.6, 1.7]])
        self.assertEqual([round(x[0], 2) for x in m], [1.0, 1.3])

    def test_aligned_words_map_one_to_one(self):
        toks = ["Buh", "ran", "31", "laps."]
        heard = [["Buh", 0.1, 0.3], ["ran", 0.35, 0.5], ["31", 0.6, 1.1], ["laps.", 1.2, 1.5]]
        self.assertEqual([x[0] for x in A.match_words(toks, heard)], [0.1, 0.35, 0.6, 1.2])

    def test_unmatched_word_is_none(self):
        m = A.match_words(["hello", "zzz", "world"], [["hello", 0.0, 0.3], ["world", 0.5, 0.9]])
        self.assertIsNone(m[1])
        self.assertAlmostEqual(m[2][0], 0.5)


class Captions(unittest.TestCase):
    """story_track's one-word captions take each word's time from words.json by text."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = self.d = pathlib.Path(self.tmp.name)
        (d / "voice").mkdir()
        text = "My grandma / NINE THOUSAND / gold ingots."
        (d / "story.json").write_text(json.dumps({"captions": "word", "lines": [{"id": "L01", "who": "N", "text": text}]}))
        caps = ["My grandma", "NINE THOUSAND", "gold ingots."]
        (d / "voice" / "voice.json").write_text(json.dumps({"lines": {"L01": {
            "who": "N", "text": "My grandma nine thousand gold ingots.", "dur": 4.0, "onset": 0.3, "end": 3.5,
            "chunks": [[0.3, 1.0], [1.5, 2.9], [2.9, 3.5]], "captions": caps}}}))
        self.words = [["My", 0.3, 0.5], ["grandma", 0.62, 1.0],   # (0.32 s for "My": over story_track.MIN_SHOW)
                      ["9", 1.5, 2.2], [",000", 2.2, 2.85], ["gold", 2.9, 3.1], ["ingots.", 3.22, 3.5]]
        (d / "voice" / "words.json").write_text(json.dumps({"L01": self.words}))
        import story_track
        self.st = story_track
        story_track.POSES = None

    def tearDown(self):
        self.tmp.cleanup()

    def test_one_word_by_text(self):
        tl = [{"t": 1000, "event": "line", "id": "L01"}]
        ev = self.st.caption_events(self.d, tl, 0.0, 6.0)
        got = {w: round(t0 - 1.0 - self.st.CAPTION_LEAD * 0, 3) for t0, _, w in ev}
        lead = self.st.CAPTION_LEAD
        self.assertAlmostEqual(got["grandma"], 0.62 - lead, places=3)
        self.assertAlmostEqual(got["NINE"], 1.5 - lead, places=3)
        self.assertTrue(1.5 < got["THOUSAND"] + lead < 2.85)
        self.assertAlmostEqual(got["gold"], 2.9 - lead, places=3)     # by index it took ",000"'s 2.2
        self.assertAlmostEqual(got["ingots."], 3.22 - lead, places=3)

    def test_frame_of_floors(self):
        self.assertEqual(self.st.frame_of(1.0), 60)
        self.assertEqual(self.st.frame_of(1.0166), 60)    # the frame the word starts in, never the next one
        self.assertEqual(self.st.frame_of(1.0167), 61)
        self.assertEqual(self.st.frame_of(59 / 60), 59)   # (float noise doesn't drop a frame)


class Viterbi(unittest.TestCase):
    def test_spans_follow_the_spikes(self):
        # vocab: 0 blank, 1 "|", 2 A, 3 B. "AB B" over 30 frames: A at 5-6, B at 10, sep at 14, B at 20-21
        T, V = 30, 4
        lp = np.full((T, V), -8.0)
        lp[:, 0] = -0.01
        for t, c in ((5, 2), (6, 2), (10, 3), (14, 1), (20, 3), (21, 3)):
            lp[t] = -8.0
            lp[t, c] = -0.01
        spans, score = A.viterbi(lp, [[2, 3], [3]], 0, 1)
        self.assertEqual(spans, [(5, 11), (20, 22)])
        self.assertGreater(score, -1)
        spans, _ = A.viterbi(lp, [[2, 3], [3]], 0, None)   # without a separator token too
        self.assertEqual(spans[1], (20, 22))

    def test_repeated_letters_need_a_blank(self):
        T = 12
        lp = np.full((T, 3), -8.0)
        lp[:, 0] = -0.01
        for t in (3, 7):   # "LL": two separate spikes of L (id 2)
            lp[t] = -8.0
            lp[t, 2] = -0.01
        spans, _ = A.viterbi(lp, [[2, 2]], 0, None)
        self.assertEqual(spans, [(3, 8)])


class ShortLines(unittest.TestCase):
    """A 2-word lead-in ("Mom says:") whose mean letter score falls under MIN_SCORE because of one soft vowel is still
    aligned when the model's own greedy reading spells the script; a take saying other words is still refused."""
    VOCAB = {"<pad>": 0, "|": 1, "M": 2, "O": 3, "S": 4, "A": 5, "Y": 6, "X": 7}

    def take(self, letters_at, weak=()):
        lp = np.full((40, len(self.VOCAB)), -9.0)
        lp[:, 0] = -0.05
        for t, ch in letters_at:
            lp[t] = -9.0
            lp[t, self.VOCAB[ch]] = -7.0 if t in weak else -0.05   # a weak frame: still the best, but improbable
            if t in weak:
                lp[t, 0] = -7.5
        return lp

    def test_weak_vowel_short_line_is_rescued(self):
        V = self.VOCAB
        groups = [[V["M"], V["O"], V["M"]], [V["S"], V["A"], V["Y"], V["S"]]]
        lp = self.take([(5, "M"), (8, "O"), (11, "M"), (14, "|"), (17, "S"), (21, "A"), (22, "Y"), (25, "S")], weak=(8, 21, 25))
        spans, score = A.viterbi(lp, groups, 0, 1)
        self.assertLess(score, A.MIN_SCORE)                       # the mean alone would refuse it
        self.assertEqual(A.greedy_letters(lp, V, 0), "momsays")
        self.assertTrue(A.fits(score, lp, groups, V, 0))

    def test_wrong_words_are_still_refused(self):
        V = self.VOCAB
        groups = [[V["M"], V["O"], V["M"]], [V["S"], V["A"], V["Y"], V["S"]]]
        lp = self.take([(5, "X"), (8, "Y"), (11, "X"), (14, "|"), (17, "X"), (21, "O"), (22, "X")], weak=(8, 21))
        spans, score = A.viterbi(lp, groups, 0, 1)
        self.assertLess(score, A.MIN_SCORE)
        self.assertFalse(A.fits(score, lp, groups, V, 0))

    def test_an_accent_still_fits(self):
        V = dict(self.VOCAB)   # the kid's "Mom" heard as "maam": close enough to the script
        groups = [[V["M"], V["O"], V["M"]], [V["S"], V["A"], V["Y"], V["S"]]]
        lp = self.take([(5, "M"), (8, "A"), (9, "A"), (11, "M"), (14, "|"), (17, "S"), (21, "A"), (22, "Y"), (25, "S")], weak=(8, 9, 21, 25))
        spans, score = A.viterbi(lp, groups, 0, 1)
        self.assertLess(score, A.MIN_SCORE)
        self.assertTrue(A.fits(score, lp, groups, V, 0))


class Hiss(unittest.TestCase):
    def test_fricative_onset_moves_back_to_the_hiss(self):
        sr, rng = A.SR, np.random.default_rng(3)
        quiet = rng.standard_normal(int(0.3 * sr)) * 1e-4
        hiss = np.diff(rng.standard_normal(int(0.12 * sr) + 1)) * 0.05     # an "s": high-passed noise
        t = np.arange(int(0.3 * sr)) / sr
        vowel = 0.4 * np.sin(2 * np.pi * 180 * t) + 0.2 * np.sin(2 * np.pi * 360 * t)
        x = np.concatenate([quiet, hiss, vowel]).astype(np.float32)
        fr = A._fricative_frames(x)
        # the CTC start 80 ms into the hiss moves back to the hiss's start (0.30 s)
        self.assertAlmostEqual(A._fricative_onset(fr, 0.38, 0.0), 0.29, delta=0.011)   # (a 20 ms window: it starts a little before)
        self.assertAlmostEqual(A._fricative_onset(fr, 0.38, 0.35), 0.35)   # never before the floor
        self.assertEqual(A._fricative_onset(fr, 0.55, 0.0), 0.55)        # no hiss at the start: unchanged


if __name__ == "__main__":
    unittest.main()


class Coverage(unittest.TestCase):
    """caption_av_check's coverage BLOCK (owner 2026-11-11: captions on all of the words): every spoken word has its
    line's caption on screen, every caption word is shown, and the take says the caption text."""

    def setUp(self):
        import caption_av_check as C
        self.C = C

    def test_every_spoken_word_has_a_caption_on_screen(self):
        ev = [(1.00, 1.60, "The DOG", "L01"), (1.60, 2.40, "on the HILL", "L01"), (3.00, 3.50, "Walk SOFT", "L02")]
        spoken = [("L01", "The", 1.02, 1.20), ("L01", "dog", 1.25, 1.55), ("L01", "hill", 2.10, 2.35),
                  ("L01", "today", 2.50, 2.80),                 # said after the line's last caption went off
                  ("L02", "Walk", 3.02, 3.20), ("L02", "soft", 3.30, 3.48),
                  ("L03", "Sweetie", 4.0, 4.4)]                  # a line with no captions at all
        miss = [(lid, w) for lid, w, _, _ in self.C.uncaptioned(spoken, ev)]
        self.assertEqual(miss, [("L01", "today"), ("L03", "Sweetie")])
        # another line's caption on screen doesn't count: the word must be under its own line's caption
        self.assertEqual(len(self.C.uncaptioned([("L02", "Walk", 1.1, 1.3)], ev)), 1)

    def test_every_caption_word_is_shown(self):
        caps = {"L01": ["The DOG", "on the HILL", "hasn't MOVED"], "L02": ["Walk SOFT"]}
        ev = [(1.0, 1.6, "The DOG", "L01"), (1.6, 2.4, "on the HILL", "L01"), (3.0, 3.5, "Walk SOFT", "L02")]
        self.assertEqual(self.C.missing_caption_words(caps, ev), {"L01": ["hasn't", "MOVED"]})
        self.assertEqual(self.C.missing_caption_words({"L02": ["Walk SOFT"]}, ev), {})

    def test_the_take_must_say_its_captions(self):
        caps = {"L01": ["The DOG", "on the HILL", "hasn't MOVED", "in 900 DAYS."]}
        good = {"L01": [(w, 0, 0) for w in "The dog on the hill hasn't moved in nine hundred days".split()]}
        bad = {"L01": [(w, 0, 0) for w in "My village is covered in nine thousand carpets".split()]}
        self.assertEqual(self.C.take_word_fails(caps, good), {})
        self.assertIn("L01", self.C.take_word_fails(caps, bad))


class MinShow(unittest.TestCase):
    """story_track.min_show: no caption under 0.30 s (a merge within its line when it fits, else time borrowed from the
    next caption, never an earlier start); caption_av_check.flashes BLOCKs anything under 0.25 s."""

    def setUp(self):
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
        import story_track as T
        import caption_av_check as C
        self.T, self.C = T, C

    def test_a_flash_merges_with_its_neighbour_when_it_fits(self):
        ev = [(5.0, 5.1, "Kids THROW", "L03"), (5.1, 5.7, "STICKS for him.", "L03"), (5.7, 6.5, "He doesn't BLINK.", "L03")]
        out = self.T.min_show(ev, fits=lambda t: True)
        self.assertEqual(out[0], (5.0, 5.7, "Kids THROW STICKS for him.", "L03"))
        self.assertEqual(len(out), 2)
        self.assertTrue(all(e[1] - e[0] >= 0.30 for e in out))

    def test_too_wide_to_merge_borrows_from_the_next_and_never_starts_early(self):
        ev = [(5.0, 5.1, "Kids THROW", "L03"), (5.1, 5.9, "STICKS for him.", "L03")]
        out = self.T.min_show(ev, fits=lambda t: False)
        self.assertAlmostEqual(out[0][0], 5.0)          # its own start, never before its word
        self.assertAlmostEqual(out[0][1], 5.3)
        self.assertAlmostEqual(out[1][0], 5.3)
        self.assertGreaterEqual(out[1][1] - out[1][0], 0.30)

    def test_never_merges_across_lines(self):
        ev = [(5.0, 5.1, "And then", "L12"), (5.1, 6.0, "Sit, BOY.", "L13")]
        self.assertEqual(self.T.min_show(ev, fits=lambda t: True), ev)   # left for the check

    def test_the_check_blocks_a_caption_under_quarter_second(self):
        ev = [(1.0, 1.2, "too FAST", "L01"), (1.2, 2.0, "fine HERE", "L01")]
        self.assertEqual([e[2] for e in self.C.flashes(ev)], ["too FAST"])
        self.assertEqual(self.C.flashes([(1.0, 1.25, "just OK", "L01")]), [])


class TooWide(unittest.TestCase):
    """caption_sync.too_wide: a chunk that runs off the frame is a BLOCK (light_sleeper L16, 2026-11-11)"""
    def test_fits_and_overflow(self):
        import caption_sync
        self.assertIsNone(caption_sync.too_wide("So I STEPPED"))
        self.assertIsNotNone(caption_sync.too_wide("But I'd never DANCED before. So I stepped off the carpet onto the STONE."))


class VideoHolds(unittest.TestCase):
    """caption_av_check.video_holds: the video-side short-caption WARN (Buh Stories lead 2026-11-11), from frames:
    a caption under 0.25 s is seen; a cut or a GUI under a steady caption is not a caption change (Gold 24.02)."""

    H, W = 120, 450

    def bg(self, n, level=110, seed=0):
        r = np.random.default_rng(seed)
        return (r.integers(-20, 20, (n, self.H, self.W)) + level).clip(0, 200).astype(np.uint8)

    def caption(self, fr, x0, words):
        """white blocks with a dark outline, like story_track's captions (one block per 'letter')"""
        for i in range(words):
            x = x0 + i * 26
            fr[:, 40:80, x - 3:x + 21] = 20
            fr[:, 43:77, x:x + 18] = 255

    def test_a_flash_is_seen(self):
        v = self.bg(90)
        self.caption(v[0:30], 40, 8)
        self.caption(v[30:38], 200, 6)            # 8 frames: 0.13 s
        self.caption(v[38:90], 20, 12)
        self.assertEqual(C.video_holds(v), [(0.5, 0.13)])

    def test_a_background_cut_under_a_steady_caption_is_not_a_change(self):
        v = self.bg(90)
        v[38:] = self.bg(52, level=150, seed=1)     # a cut 8 frames after the caption came, to a shot with snow
        v[38:, :, 370:] = 250
        v[46:, 85:120, :] = 245                     # then a GUI's white under the caption, no outline of its own
        self.caption(v[0:30], 40, 8)
        self.caption(v[30:90], 200, 6)
        self.assertEqual(C.video_holds(v), [])

    def test_a_blank_gap_is_not_a_caption(self):
        v = self.bg(90)
        self.caption(v[0:30], 40, 8)                # then 8 frames with no caption
        self.caption(v[38:90], 20, 12)
        self.assertEqual(C.video_holds(v), [])

    def test_the_pop_is_one_change(self):
        v = self.bg(90)
        self.caption(v[0:30], 40, 8)
        self.caption(v[30:33], 60, 5)               # the pop-in: the same caption at 0.84 scale, then full size
        self.caption(v[33:90], 50, 6)
        self.assertEqual(C.video_holds(v), [])
