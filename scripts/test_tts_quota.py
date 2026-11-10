"""Tests for tts.py's 429 handling, pacing, the quota log and request models (2026-11-10: three sessions at once took
per-MINUTE 429s and one read them as the daily quota). urlopen and time are mocked: no Gemini request is ever made.
Run: python3 -m unittest scripts/test_tts_quota.py (npm test runs it through lib/hb/test/tts_quota.test.js)."""
import base64
import io
import json
import pathlib
import sys
import tempfile
import unittest
import urllib.error
from unittest import mock

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import tts as T  # noqa: E402


def err429(scope="minute", retry="35s", limit="10", details=True):
    q = {"minute": "GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
         "day": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}[scope]
    m = "generativelanguage.googleapis.com/generate_content_free_tier_requests"
    d = [{"@type": "type.googleapis.com/google.rpc.QuotaFailure",
          "violations": [{"quotaMetric": m, "quotaId": q, "quotaDimensions": {"model": "x"}, "quotaValue": limit}]}]
    if retry:
        d.append({"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": retry})
    body = {"error": {"code": 429, "message": "You exceeded your current quota", "status": "RESOURCE_EXHAUSTED",
                      **({"details": d} if details else {})}}
    return urllib.error.HTTPError("u", 429, "Too Many Requests", {}, io.BytesIO(json.dumps(body).encode()))


def ok():
    pcm = (np.zeros(240, "<i2")).tobytes()
    body = {"candidates": [{"content": {"parts": [{"inlineData": {"mimeType": "audio/L16;rate=24000",
                                                                  "data": base64.b64encode(pcm).decode()}}]}}]}
    r = mock.Mock()
    r.read.return_value = json.dumps(body).encode()
    return r


class Clock:
    """time.monotonic / time.sleep that advance a fake clock."""
    def __init__(self):
        self.t, self.sleeps = 1000.0, []

    def monotonic(self):
        return self.t

    def sleep(self, s):
        self.sleeps.append(s)
        self.t += s


class QuotaTest(unittest.TestCase):
    def setUp(self):
        T._LAST[0] = None
        self.clock = Clock()
        td = tempfile.TemporaryDirectory()
        self.addCleanup(td.cleanup)
        self.log = pathlib.Path(td.name) / "quota.json"
        patches = [mock.patch.object(T.time, "monotonic", self.clock.monotonic),
                   mock.patch.object(T.time, "sleep", self.clock.sleep),
                   mock.patch.object(T.random, "uniform", lambda a, b: 2.0),
                   mock.patch.object(T, "QUOTA_LOG", self.log),
                   mock.patch.dict(T.os.environ, {"TTS_MIN_GAP": "", "TTS_429_RETRIES": "", "TTS_429_WAIT": ""})]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        self.urls = []

    def run_with(self, responses, models=("m1", "m2")):
        seq = list(responses)

        def urlopen(req, timeout=None):
            self.urls.append(req.full_url)
            r = seq.pop(0)
            if isinstance(r, Exception):
                raise r
            return r
        with mock.patch.object(T.urllib.request, "urlopen", urlopen), mock.patch("builtins.print") as pr:
            try:
                return T.request("hi", {"A": "Kore"}, list(models)), pr
            except SystemExit as e:
                return e, pr

    def test_parse_minute(self):
        q = T.quota_info(err429("minute", "35s").read().decode())
        self.assertEqual((q["scope"], q["retry"], q["limit"]), ("minute", 35.0, "10"))
        self.assertIn("GenerateRequestsPerMinutePerProjectPerModel-FreeTier", q["ids"])

    def test_parse_day_and_garbage(self):
        self.assertEqual(T.quota_info(err429("day").read().decode())["scope"], "day")
        self.assertEqual(T.quota_info("not json")["scope"], "unknown")

    def test_real_day_message(self):
        # the per-day text a session fetched on 2026-11-10 (no details block)
        msg = ("Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 10, "
               "model: gemini-3.8-flash-tts, description: Generate content requests per day limit exceeded on Free Tier. "
               "Please retry in 9h4m38s.")
        q = T.quota_info(json.dumps({"error": {"code": 429, "message": msg}}))
        self.assertEqual((q["scope"], q["limit"], q["retry"]), ("day", "10", 9 * 3600 + 4 * 60 + 38))
        self.assertEqual(T.duration_s("32693s"), 32693)
        self.assertEqual(T.duration_s("1m5.5s"), 65.5)

    def test_per_minute_retries_same_model(self):
        res, pr = self.run_with([err429("minute", "30s"), err429("minute", None), ok()])
        self.assertEqual(res[1], "m1")
        self.assertTrue(all("/m1:" in u for u in self.urls))
        self.assertIn(32.0, self.clock.sleeps)      # retryDelay + jitter
        self.assertIn(67.0, self.clock.sleeps)      # TTS_429_WAIT's 65 s + jitter when no retryDelay
        text = " ".join(str(c) for c in pr.call_args_list)
        self.assertIn("PerMinute", text)
        self.assertIn("limit 10", text)

    def test_per_minute_gives_up_after_four(self):
        res, _ = self.run_with([err429("minute") for _ in range(5)] + [ok()])
        self.assertEqual(res[1], "m2")
        self.assertEqual(sum("/m1:" in u for u in self.urls), 5)   # the first try + 4 retries

    def test_minute_give_up_exits_75(self):
        with mock.patch.dict(T.os.environ, {"TTS_429_RETRIES": "1"}):
            res, _ = self.run_with([err429("minute") for _ in range(4)])
        self.assertIsInstance(res, T.QuotaLater)
        self.assertEqual(res.code, 75)
        self.assertIn("per-minute limit on m1, m2", res.next)

    def test_per_day_moves_on_and_logs(self):
        res, pr = self.run_with([err429("day"), ok()])
        self.assertEqual(res[1], "m2")
        text = " ".join(str(c) for c in pr.call_args_list)
        self.assertIn("DAILY", text)
        self.assertIn("UTC", text)
        log = json.loads(self.log.read_text())
        self.assertEqual(log["last_429"]["m1"]["scope"], "day")
        self.assertEqual(sum(v["requests"] for d in log["days"].values() for v in d.values()), 2)

    def test_every_model_daily_exits_75_with_next(self):
        res, _ = self.run_with([err429("day", retry="32678s"), err429("day", retry=None)])
        self.assertIsInstance(res, T.QuotaLater)
        self.assertEqual(res.code, 75)
        self.assertRegex(res.next, r"^daily limit for m1 \(10/day\), m2 \(10/day\) reached; retry after .*\d\d:\d\d UTC: ")
        self.assertIn("takes so far are cached", res.next)

    def test_locked_model_daily_raises_quotaout(self):
        res, _ = self.run_with([err429("day")], models=("m1",))
        self.assertIsInstance(res, T.QuotaOut)
        self.assertEqual(res.code, 75)
        self.assertIn("NEXT: daily limit for m1", str(res))

    def test_request_model_locks_speaker(self):
        story = {"lines": [{"id": "L01"}, {"id": "L02", "who": "Dad"}], "voice_takes": "beat",
                 "requests": [{"id": "r1", "speakers": ["N", "Dad"], "model": "gemini-3.8-flash-lite-tts"}]}
        with mock.patch.dict(T.LOCK, {}, clear=True):
            cs = {"N": {"role": "narrator"}, "Dad": {}}
            T.request_models(story, cs, "N")
            self.assertEqual(T.allowed(["N"], cs), ["gemini-3.8-flash-lite-tts"])
            self.assertEqual(T.allowed(["Dad"], cs), ["gemini-3.8-flash-lite-tts"])
            cs2 = {"N": {"role": "narrator", "model": "gemini-3.1-flash-tts-preview"}, "Dad": {}}
            with self.assertRaises(SystemExit) as e:
                T.request_models(story, cs2, "N")
            self.assertIn('NEXT: put "model"', str(e.exception.code))

    def test_pacing(self):
        with mock.patch.dict(T.os.environ, {"TTS_MIN_GAP": "20"}):
            self.run_with([ok()])
            self.clock.t += 5
            self.run_with([ok()])
        self.assertIn(15.0, self.clock.sleeps)


if __name__ == "__main__":
    unittest.main()
