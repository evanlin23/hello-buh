"""youtube_upload.py for Buh Stories: the upload text rebuilt from story.json (lib/buhstories_upload.js), a BLOCKed
package skipped, its CC BY score accepted, tags / made-for-kids / altered content in the body, the playlist and the
pinned question. HelloBuh's upload body and picking are unchanged. No network, no secrets (fake YouTube client)."""
import datetime as dt
import importlib
import json
import os
import pathlib
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
FIX = HERE.parent / "lib" / "hb" / "test" / "fixtures"
GATES = json.loads((HERE.parent / "lib" / "hb" / "gates.json").read_text())["version"]


def load(channel):
    old = dict(os.environ)
    os.environ["YT_CHANNEL"] = channel
    try:
        sys.modules.pop("youtube_upload", None)
        _yu = importlib.import_module("youtube_upload")
        _yu.owner_ok = lambda name, meta: ""  # (the owner-OK gate is tested in scripts/test_owner_ok.py)
        return _yu
    finally:
        os.environ.clear(); os.environ.update(old)


class Req:
    def __init__(self, result, log=None, err=None):
        self.result, self.log, self.err = result, log, err

    def execute(self, num_retries=0):
        if self.err:
            raise self.err
        return self.result


class FakeYT:
    def __init__(self, playlists=(), comment_err=None):
        self.calls, self.pl, self.comment_err = [], list(playlists), comment_err

    def playlists(self):
        yt = self

        class P:
            def list(self, **k):
                return Req({"items": [{"id": i, "snippet": {"title": t}} for i, t in yt.pl]})

            def list_next(self, req, resp):
                return None

            def insert(self, part, body):
                yt.calls.append(("playlists.insert", body)); yt.pl.append(("PLnew", body["snippet"]["title"]))
                return Req({"id": "PLnew"})
        return P()

    def playlistItems(self):
        yt = self

        class I:
            def insert(self, part, body):
                yt.calls.append(("playlistItems.insert", body)); return Req({"id": "x"})
        return I()

    def commentThreads(self):
        yt = self

        class C:
            def insert(self, part, body):
                yt.calls.append(("commentThreads.insert", body))
                return Req({"id": "Ug1"}, err=yt.comment_err)
        return C()


class BuhStoriesUpload(unittest.TestCase):
    def test_hellobuh_body_is_unchanged(self):
        hb = load("hellobuh")
        ym = json.loads((FIX / "hellobuh_anvil_rain_metadata.json").read_text())["youtube"]
        self.assertEqual(hb.upload_body(ym, "T", "D", "2026-11-12T15:00:00Z"), {
            "snippet": {"title": "T", "description": "D", "categoryId": "20", "tags": ["minecraft", "shorts", "minecraftmemes", "funny"]},
            "status": {"privacyStatus": "private", "publishAt": "2026-11-12T15:00:00Z", "selfDeclaredMadeForKids": False,
                       "containsSyntheticMedia": False}})
        # and HelloBuh still refuses a song that isn't NCS/original (the CC BY exception is Buh Stories' only)
        with tempfile.TemporaryDirectory() as td:
            vd = pathlib.Path(td)
            d = vd / "shorts" / "cc_stunt"; d.mkdir(parents=True)
            (d / "metadata.json").write_text(json.dumps({"name": "cc_stunt", "status": "ready", "gates": {"version": GATES},
                                                         "song": {"licence": "CC BY 4.0"}, "video": {"release": {"url": "u"}}}))
            hb.QUEUE = vd / "none.txt"
            n, why = hb.pick(vd, {})
            self.assertIsNone(n); self.assertIn("isn't cleared", why)

    def test_story_youtube_rebuilds_from_story_json(self):
        bs = load("buhstories")
        meta = json.loads((FIX / "buhstories_gold_metadata.json").read_text())
        self.assertIn("#funny", meta["youtube"]["description"])
        y, blocks = bs.story_youtube(meta)
        self.assertEqual(blocks, [])
        self.assertEqual(y["title"], "my grandma has thrown 9,000 gold into a portal 🪙 #minecraft #shorts")
        self.assertTrue(y["description"].endswith("#minecraft #shorts #minecraftstory #buhstories"))
        self.assertIn('"Darkest Child" Kevin MacLeod', y["description"])
        body = bs.upload_body(y, y["title"], y["description"], "2026-11-12T15:00:00Z")
        self.assertIn("minecraft story", body["snippet"]["tags"])
        self.assertNotIn("minecraft warden", body["snippet"]["tags"])
        self.assertIn("minecraft nether portal", body["snippet"]["tags"])
        self.assertIs(body["status"]["selfDeclaredMadeForKids"], False)
        self.assertIs(body["status"]["containsSyntheticMedia"], False)   # altered content: No

    def test_pick_skips_blocked_and_takes_cc_by_story(self):
        bs = load("buhstories")
        gold = json.loads((FIX / "buhstories_gold_metadata.json").read_text())
        with tempfile.TemporaryDirectory() as td:
            vd = pathlib.Path(td)
            for name, extra, at in [("story_nope", {}, "2026-11-01"), ("story_gold_for_the_portal", {}, "2026-11-02")]:
                d = vd / "shorts" / name; d.mkdir(parents=True)
                m = {**gold, "name": name, "status": "ready", "published_at": at, "gates": {"version": GATES}, **extra}
                if name == "story_nope":
                    m["edit"] = {}
                (d / "metadata.json").write_text(json.dumps(m))
            bs.QUEUE = vd / "none.txt"
            n, why = bs.pick(vd, {})
            self.assertEqual(n, "story_gold_for_the_portal")   # its CC BY score is cleared by the credit
            self.assertIn("story_nope: upload text BLOCKED", why)

    def test_playlist_found_or_created(self):
        bs = load("buhstories")
        yt, e = FakeYT(playlists=[("PL1", "All Buh Stories")]), {}
        bs.add_to_playlist(yt, "vid1", {"playlist": "All Buh Stories"}, e)
        self.assertEqual(yt.calls, [("playlistItems.insert", {"snippet": {"playlistId": "PL1", "resourceId": {"kind": "youtube#video", "videoId": "vid1"}}})])
        self.assertEqual(e["playlist"], "All Buh Stories")
        yt2 = FakeYT()
        bs.add_to_playlist(yt2, "vid2", {"playlist": "All Buh Stories"}, {})
        self.assertEqual([c[0] for c in yt2.calls], ["playlists.insert", "playlistItems.insert"])

    def test_pinned_question_posted_once_public(self):
        bs = load("buhstories")
        now = dt.datetime(2026, 11, 12, 20, tzinfo=dt.timezone.utc)
        done = {"a": {"video_id": "v1", "publish_at": "2026-11-12T15:00:00Z", "pinned_comment": "Q? 👇"},
                "b": {"video_id": "v2", "publish_at": "2026-11-13T15:00:00Z", "pinned_comment": "Later? 👇"},
                "c": {"video_id": "v3", "publish_at": "2026-11-10T15:00:00Z", "pinned_comment": "Q", "comment_id": "old"},
                "hb": {"video_id": "v4", "publish_at": "2026-11-10T15:00:00Z"}}
        yt = FakeYT()
        self.assertEqual(bs.post_pinned_comments(yt, done, now), (["a"], []))
        self.assertEqual(yt.calls, [("commentThreads.insert", {"snippet": {"videoId": "v1", "topLevelComment": {"snippet": {"textOriginal": "Q? 👇"}}}})])
        self.assertEqual(done["a"]["comment_id"], "Ug1")
        self.assertNotIn("comment_id", done["b"])
        self.assertEqual(bs.post_pinned_comments(FakeYT(), done, now), ([], []))   # posted once, never twice
        bad = {"a": {"video_id": "v1", "publish_at": "2026-11-12T15:00:00Z", "pinned_comment": "Q? 👇"}}
        self.assertEqual(bs.post_pinned_comments(FakeYT(comment_err=RuntimeError("insufficientPermissions")), bad, now), ([], ["a"]))
        self.assertIn("insufficientPermissions", bad["a"]["comment_error"])


if __name__ == "__main__":
    unittest.main()
