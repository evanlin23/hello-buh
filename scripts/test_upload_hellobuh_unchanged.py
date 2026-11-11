"""HelloBuh's uploader behaviour, pinned with golden values, so the Buh Stories changes to youtube_upload.py
(buhstories-only branches) are shown to leave it byte-for-byte the same: the family_scores ranking, gates/stale
skipping, the "# first" queue pins, and the release-asset download (sha256-checked). No network, no secrets.
Set HB_UPLOADER=<path> to run these against another copy of youtube_upload.py (e.g. origin/main's)."""
import datetime as dt
import hashlib
import importlib.util
import json
import os
import pathlib
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
GATES = json.loads((HERE.parent / "lib" / "hb" / "gates.json").read_text())["version"]


def load():
    old = dict(os.environ)
    os.environ["YT_CHANNEL"] = "hellobuh"
    try:
        src = os.environ.get("HB_UPLOADER") or str(HERE / "youtube_upload.py")
        spec = importlib.util.spec_from_file_location("youtube_upload_hb", src)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        return m
    finally:
        os.environ.clear(); os.environ.update(old)


def package(vd, name, **meta):
    d = vd / "shorts" / name
    d.mkdir(parents=True)
    m = {"name": name, "status": "ready", "published_at": "2026-11-10", "gates": {"version": GATES}, **meta}
    (d / "metadata.json").write_text(json.dumps(m))


class HelloBuhUnchanged(unittest.TestCase):
    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        self.vd = pathlib.Path(self.td.name) / "videos"
        self.up = pathlib.Path(self.td.name) / "uploads"
        self.up.mkdir()
        self.m = load()
        self.m.UP, self.m.SCORES, self.m.QUEUE = self.up, self.up / "scores.json", self.up / "queue.txt"

    def tearDown(self):
        self.td.cleanup()

    def test_family_scores_ranking(self):
        m = self.m
        done = {"ai_a": {"video_id": "v1", "uploaded": "2026-11-01", "publish_at": "2026-11-01T15:00:00Z"},
                "ai_b": {"video_id": "v2", "uploaded": "2026-11-02", "publish_at": "2026-11-02T15:00:00Z"},
                "lapse_x": {"video_id": "v3", "uploaded": "2026-11-03", "publish_at": "2026-11-03T15:00:00Z"},
                "creeper_art": {"video_id": "v4", "uploaded": "2026-11-04", "publish_at": "2026-11-04T15:00:00Z"}}
        an = {"v1": {"views": 10000, "subscribersGained": 50}, "v2": {"views": 2000, "subscribersGained": 4},
              "v3": {"views": 30000, "subscribersGained": 30}, "v4": {"views": 500, "subscribersGained": 10}}
        m.video_analytics = lambda ya, ids, s, e: (an, "")
        out = m.family_scores(None, done)
        self.assertEqual(out["family"], {"ai": 33.6, "lapse": 18.97, "art": 34.46})
        self.assertEqual(out["mean"], 23.5)
        self.assertEqual(json.loads(m.SCORES.read_text())["family"], out["family"])
        # pick ranks by it: art (34.46) > ai (33.6) > lapse (18.97)
        for n in ("lapse_next", "ai_next", "skull_art"):
            package(self.vd, n, video={"release": {"url": "u"}})
        self.assertEqual(m.pick(self.vd, {}, out)[0], "skull_art")
        self.assertEqual(m.pick(self.vd, {"skull_art": {"uploaded": "2026-11-11"}}, out)[0], "ai_next")
        self.assertEqual(m.pick(self.vd, {"skull_art": {"uploaded": "2026-11-11"}, "ai_next": {"uploaded": "2026-11-12"}}, out)[0], "lapse_next")

    def test_gates_stale_skipping(self):
        m = self.m
        package(self.vd, "old_gates", published_at="2026-11-01", gates={"version": GATES - 1}, video={"release": {"url": "u"}})
        package(self.vd, "blocked", published_at="2026-11-02",
                gates={"version": GATES, "pace": {"ok": False, "summary": "dead spot"}}, video={"release": {"url": "u"}})
        package(self.vd, "waived", published_at="2026-11-03",
                gates={"version": GATES, "pace": {"ok": False}, "waived": "lead: ok"}, video={"release": {"url": "u"}})
        n, why = m.pick(self.vd, {})
        self.assertEqual(n, "waived")
        self.assertIn(f"old_gates: gated at v{GATES - 1}, the gates are v{GATES} now", why)
        self.assertIn("blocked: its v%d gates blocked (pace: dead spot)" % GATES, why)
        # story_* packages are gated by the story pipeline (exempt), not skipped here
        self.assertIsNone(m.gates.stale({"name": "story_x", "gates": {}}))

    def test_first_pins(self):
        m = self.m
        for n in ("ai_hot", "lapse_pinned", "spot_wrong_q"):
            package(self.vd, n, video={"release": {"url": "u"}})
        m.QUEUE.write_text("ai_hot\nspot_wrong_q\nlapse_pinned  # first\n")
        scores = {"family": {"ai": 50.0, "lapse": 1.0, "spot": 2.0}, "mean": 5.0}
        self.assertEqual(m.pick(self.vd, {}, scores)[0], "lapse_pinned")   # pinned beats a higher score
        self.assertEqual(m.pick(self.vd, {"lapse_pinned": {"uploaded": "x"}}, scores)[0], "ai_hot")

    def test_release_asset_download(self):
        m = self.m
        data = b"\x00mp4" * 1000
        sha = hashlib.sha256(data).hexdigest()
        url = "https://github.com/evanlin23/hello-buh/releases/download/pkg-a/a.short.mp4"
        got = []

        def fake(u, dest):
            got.append(u); pathlib.Path(dest).write_bytes(data)
        m.download = fake
        meta = {"video": {"release": {"url": url, "sha256": sha}}}
        f = m.fetch_short(self.vd, "a", meta)
        self.assertEqual(f, self.vd / "shorts" / "a" / "short.mp4")
        self.assertEqual(f.read_bytes(), data)
        self.assertEqual(got, [url])
        bad = {"video": {"release": {"url": url, "sha256": "0" * 64}}}
        with self.assertRaises(SystemExit) as e:
            m.fetch_short(self.vd, "b", bad)
        self.assertIn("refusing to upload it", str(e.exception))
        self.assertFalse((self.vd / "shorts" / "b" / "short.mp4").exists())   # a bad download is never left behind
        tries = []

        def flaky(u, dest):
            tries.append(u)
            if len(tries) < 3:
                raise OSError("reset")
            pathlib.Path(dest).write_bytes(data)
        m.download = flaky
        self.assertEqual(m.fetch_short(self.vd, "c", meta).read_bytes(), data)
        self.assertEqual(len(tries), 3)                                         # 3 tries, then it gives up


if __name__ == "__main__":
    unittest.main()
