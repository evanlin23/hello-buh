"""Tests for tts.py's pre-send prompt lint (docs/voices.md "Prompt lint"; 2026-11-11: four 3.8-flash-tts requests were
wasted because the model read the acting direction aloud). Calibrated on that day's prompts. Nothing is ever sent:
request() and urlopen are mocked to fail the test if called.
Run: python3 -m unittest scripts/test_tts_lint.py (npm test runs it through lib/hb/test/tts_lint.test.js)."""
import contextlib
import io
import json
import pathlib
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import tts as T  # noqa: E402

M38, M31, LITE = "gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-3.8-flash-lite-tts"
PIP = "A bubbly nine-year-old kid, fast, bright and energetic, telling a friend an amazing story; not whispery, breathy or soft"
BUH = T.library()["buh"]["profile"]


def cast(profile, role="character", **kw):
    return {"X": {"name": "X", "voice": "Achird", "profile": profile, "role": role, **kw}}


def one(text="Lock the door, kid, they're coming.", who="X"):
    return [(who, "L01", text, "")]


def verdict(scene, profile, model=M38, role="character", lines=None):
    cs, lines = cast(profile, role), lines or one()
    return T.lint(T.prompt(scene, lines, cs, model), lines, cs, model)


class Calibration(unittest.TestCase):
    """The day's evidence: the short one-clause brackets were never read aloud; the two long ones were."""

    def test_good_brackets_pass(self):
        for b in ["[A warm, gentle grandmother]", "[A friendly teenage boy, casual]", "[An old, tired man, low and slow]"]:
            self.assertEqual(verdict(b, BUH)[0], "ok", b)

    def test_library_profiles_that_passed_pass(self):   # mom and grandma: the audition's one-clause brackets
        lib = T.library()
        for k in ("mom", "grandma"):
            self.assertEqual(verdict("", lib[k]["profile"])[0], "ok", k)

    def test_buh_prose_profile_refused(self):   # Dog on the Hill's Buh on 3.8: the library profile in the bracket
        v, why = verdict("", BUH)
        self.assertEqual(v, "REFUSED")
        self.assertTrue(any("clause" in w for w in why) and any("words" in w for w in why), why)

    def test_grandpa_multi_sentence_bracket_refused(self):   # Thirty-One Raids' Grandpa on 3.8
        v, why = verdict("[Lock the door, kid. An old man in his seventies. Tired. Low and a little rough]", BUH)
        self.assertEqual(v, "REFUSED")
        self.assertTrue(any("sentences" in w for w in why), why)

    def test_word_limit(self):
        self.assertEqual(verdict("[" + " ".join(["old"] * 14) + "]", BUH)[0], "ok")
        v, why = verdict("[" + " ".join(["old"] * 15) + "]", BUH)
        self.assertEqual(v, "REFUSED")
        self.assertIn("15 words", why[0])


class Scope(unittest.TestCase):
    def test_pip_narrator_on_flash_lite_exempt(self):
        self.assertTrue(verdict("", PIP, LITE, role="narrator")[0].startswith("exempt"))

    def test_flash_lite_character_exempt(self):   # the rule covers the flash-tts models only
        self.assertTrue(verdict("", BUH, LITE)[0].startswith("exempt"))

    def test_narrator_on_38_exempt(self):   # the Roblox narrator's long recipe bracket (voices/recipes/narrator_roblox.md)
        self.assertTrue(verdict("", T.library()["narrator_roblox"]["profile"], M38, role="narrator")[0].startswith("exempt"))

    def test_narrator_by_story_id(self):
        T.NARRATOR[0] = "X"
        try:
            self.assertTrue(verdict("", BUH)[0].startswith("exempt"))
        finally:
            T.NARRATOR[0] = None

    def test_31_structured_ok_31_bracket_linted(self):
        self.assertTrue(verdict("A quiet room.", BUH, M31)[0].startswith("ok"))
        cs, lines = cast(BUH), one()
        p = f"[{BUH}]\n\n" + lines[0][2]   # a `bracket: true` cast entry on 3.1 (Gold's Grandma)
        self.assertEqual(T.lint(p, lines, cs, M31)[0], "REFUSED")

    def test_38_multi_speaker_structured_refused(self):
        cs = {**cast("[A warm, gentle grandmother]"), "Y": {"name": "Y", "voice": "Kore", "profile": "a guard", "role": "character"}}
        lines = [("X", "L01", "Hi.", ""), ("Y", "L02", "Halt.", "")]
        v, why = T.lint(T.prompt("", lines, cs, M38), lines, cs, M38)
        self.assertEqual(v, "REFUSED")
        self.assertIn("no direction block", why[0])


class Layout(unittest.TestCase):
    def test_prose_outside_bracket_refused(self):
        cs, lines = cast("x"), one()
        p = "Read this as an old man.\n[An old, tired man]\n\n" + lines[0][2]
        self.assertEqual(T.lint(p, lines, cs, M38)[0], "REFUSED")

    def test_text_after_lines_refused(self):
        cs, lines = cast("x"), one()
        p = "[An old, tired man]\n\n" + lines[0][2] + "\n\nSay it slowly."
        v, why = T.lint(p, lines, cs, M38)
        self.assertEqual(v, "REFUSED")
        self.assertIn("other than the lines", why[0])

    def test_bracket_inside_a_line_refused(self):
        v, why = verdict("[An old, tired man]", BUH, lines=one("[whispers] Lock the door."))
        self.assertEqual(v, "REFUSED")

    def test_gate_fix_breaks_a_character_bracket(self):   # why voice_beat re-takes without the fix for these
        rows = T.lint_request("[An old, tired man, low and slow]", one(), cast(BUH), [M38], ["no audible breaths"])
        self.assertEqual(rows[0][2], "REFUSED")


def no_request(*a, **k):
    raise AssertionError("a request was sent")


class NothingSent(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.p = [mock.patch.object(T, "CACHE", pathlib.Path(self.tmp.name) / "cache"),
                  mock.patch.object(T, "request", no_request),
                  mock.patch("urllib.request.urlopen", no_request)]
        for p in self.p:
            p.start()
        T.LOCK.clear()

    def tearDown(self):
        for p in self.p:
            p.stop()
        T.LOCK.clear()
        T.NARRATOR[0] = None
        self.tmp.cleanup()

    def test_raw_take_refuses_before_request(self):
        cs = cast(BUH, model=M38)
        with self.assertRaises(T.LintRefused) as e:
            T.raw_take("", one(), cs)
        self.assertEqual(e.exception.code, T.EX_LINT)
        self.assertIn("the exact prompt", e.exception.msg)
        self.assertIn("Buh, our hero", e.exception.msg)

    def story(self, grandpa_dir):
        d = pathlib.Path(self.tmp.name) / "s"
        (d / "voice").mkdir(parents=True)
        (d / "story.json").write_text(json.dumps({
            "voice_takes": "beat", "one_take": ["N"],
            "cast": {"N": {"role": "narrator", "ref": "narrator"},
                     "Grandpa": {"role": "character", "ref": "elder", "name": "Grandpa", "model": M38}},
            "requests": [{"id": "N", "speakers": ["N"]},
                         {"id": "G", "speakers": ["Grandpa"], "lines": ["L02"], "direction": grandpa_dir}],
            "lines": [{"id": "L01", "text": "Then he says:"}, {"id": "L02", "who": "Grandpa", "text": "Lock the door, kid."}]}))
        return d

    def test_dry_shows_every_request_and_verdict(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = T.run_story(self.story("An old man in his seventies. Tired. Low and a little rough."), dry=True)
        self.assertEqual(code, T.EX_LINT)
        s = out.getvalue()
        self.assertIn("L01 on gemini-3.8-flash-lite-tts", s)
        self.assertIn("L02 on gemini-3.8-flash-tts", s)
        self.assertIn("REFUSED", s)
        self.assertIn("| [the village elder", s)   # the exact prompt
        self.assertIn("none sent", s)

    def test_dry_ok_with_one_clause_bracket(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(T.run_story(self.story("[An old, tired man, low and slow]"), dry=True), 0)

    def test_run_refuses_before_the_first_request(self):
        with contextlib.redirect_stdout(io.StringIO()), self.assertRaises(T.LintRefused) as e:
            T.run_story(self.story("An old man in his seventies. Tired."))
        self.assertIn("L02", e.exception.msg)

    def test_lint_cast(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(T.lint_cast(), T.EX_LINT)
        lines = {l.split()[0]: l for l in out.getvalue().splitlines() if l and not l.startswith(" ")}
        self.assertIn(" ok", lines["mom"])
        self.assertIn("REFUSED", lines["buh"])


if __name__ == "__main__":
    unittest.main()
