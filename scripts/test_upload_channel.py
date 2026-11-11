"""youtube_upload.py with two channels: a run for YT_CHANNEL uploads only Shorts whose metadata names that channel
(default hellobuh), reads that channel's suffixed secrets, and keeps its own records. No network, no secrets."""
import importlib
import json
import os
import pathlib
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))


def load(channel, **env):
    old = dict(os.environ)
    os.environ.update({"YT_CHANNEL": channel, **env})
    try:
        sys.modules.pop("youtube_upload", None)
        return importlib.import_module("youtube_upload")
    finally:
        os.environ.clear(); os.environ.update(old)


class TwoChannels(unittest.TestCase):
    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        vd = pathlib.Path(self.td.name)
        for name, meta in {"story_dog_hill": {"channel": "buhstories"}, "creeper_art": {}, "story_old": {"channel": "hellobuh"}}.items():
            d = vd / "shorts" / name
            d.mkdir(parents=True)
            (d / "metadata.json").write_text(json.dumps({"status": "ready", "published_at": "2026-11-10", **meta}))
        self.vd = vd

    def tearDown(self):
        self.td.cleanup()

    def test_each_run_sees_only_its_channel(self):
        hb = load("hellobuh")
        hb.QUEUE = self.vd / "none.txt"
        seen = set()
        done = {}
        for _ in range(3):
            n, _ = hb.pick(self.vd, done)
            if n:
                seen.add(n); done[n] = {"uploaded": "x"}
        self.assertEqual(seen, {"creeper_art", "story_old"})
        bs = load("buhstories")
        bs.QUEUE = self.vd / "none.txt"
        self.assertEqual(bs.pick(self.vd, {})[0], "story_dog_hill")
        self.assertTrue(str(bs.RECORD).endswith("uploads/buhstories/uploads.json"))
        self.assertTrue(str(hb.RECORD).endswith("uploads/uploads.json"))

    def test_suffixed_secrets_and_shared_client(self):
        env = {"YT_CLIENT_ID": "c", "YT_CLIENT_SECRET": "s", "YT_REFRESH_TOKEN": "hb-token", "YT_CHANNEL_ID": "UChb",
               "YT_ENABLED": "true"}
        bs = load("buhstories", **env)
        os.environ.update(env)
        try:
            ok, missing = bs.enabled()
            self.assertFalse(ok)                       # HelloBuh's token never counts for Buh Stories
            self.assertIn("YT_REFRESH_TOKEN_BUHSTORIES", missing)
            self.assertIn("YT_ENABLED_BUHSTORIES=true", missing)
            os.environ.update({"YT_REFRESH_TOKEN_BUHSTORIES": "bs", "YT_CHANNEL_ID_BUHSTORIES": "UCbs", "YT_ENABLED_BUHSTORIES": "true"})
            ok, _ = bs.enabled()
            self.assertTrue(ok)
            self.assertEqual(bs.env("YT_CLIENT_ID"), "c")   # the shared OAuth client
            self.assertEqual(bs.env("YT_CHANNEL_ID"), "UCbs")
        finally:
            for k in list(env) + ["YT_REFRESH_TOKEN_BUHSTORIES", "YT_CHANNEL_ID_BUHSTORIES", "YT_ENABLED_BUHSTORIES"]:
                os.environ.pop(k, None)

    def test_unknown_channel_refused(self):
        with self.assertRaises(SystemExit):
            load("nope")


if __name__ == "__main__":
    unittest.main()
