"""Finished mp4s as GitHub Release assets (r:rc5eaf0), no network, no secrets:
- youtube_upload.fetch_short downloads video.release, checks its sha256, refuses a mismatch, and falls back to the
  branch's short.mp4 for an older package without video.release;
- release_assets.commit commits ONLY the named package through a private index (another session's staged file stays
  staged and out of the commit: the "Package tnt" bug) and never commits an mp4."""
import hashlib
import importlib
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))


def uploader():
    os.environ.setdefault("YT_CHANNEL", "hellobuh")
    sys.modules.pop("youtube_upload", None)
    return importlib.import_module("youtube_upload")


def git(cwd, *a):
    return subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", *a], cwd=cwd, check=True, capture_output=True, text=True).stdout


class ReleaseDownload(unittest.TestCase):
    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        self.t = pathlib.Path(self.td.name)
        self.asset = self.t / "story_test.short.0123.mp4"
        self.asset.write_bytes(os.urandom(2_000_000))
        self.sha = hashlib.sha256(self.asset.read_bytes()).hexdigest()
        self.vd = self.t / "videos"
        (self.vd / "shorts" / "story_test").mkdir(parents=True)
        self.yu = uploader()

    def tearDown(self):
        self.td.cleanup()

    def meta(self, sha):
        return {"status": "held", "channel": "buhstories",
                "video": {"file": "short.mp4", "release": {"tag": "pkg-story_test", "asset": self.asset.name, "url": self.asset.as_uri(), "sha256": sha}}}

    def test_release_url_downloaded_and_verified(self):
        f = self.yu.fetch_short(self.vd, "story_test", self.meta(self.sha))
        self.assertEqual(f.read_bytes(), self.asset.read_bytes())

    def test_sha_mismatch_refused(self):
        with self.assertRaises(SystemExit) as c:
            self.yu.fetch_short(self.vd, "story_test", self.meta("0" * 64))
        self.assertIn("sha256", str(c.exception))
        self.assertFalse((self.vd / "shorts" / "story_test" / "short.mp4").exists())

    def test_old_package_falls_back_to_the_branch(self):
        calls = []
        real = self.yu.subprocess.run
        self.yu.subprocess.run = lambda a, **k: calls.append(a)
        try:
            (self.vd / "shorts" / "story_test" / "short.mp4").write_bytes(self.asset.read_bytes())
            f = self.yu.fetch_short(self.vd, "story_test", {"video": {"file": "short.mp4"}})
        finally:
            self.yu.subprocess.run = real
        self.assertTrue(any("sparse-checkout" in a for a in calls))
        self.assertEqual(f.name, "short.mp4")


class CommitOnlyThePackage(unittest.TestCase):
    def test_private_index(self):
        import release_assets as ra
        with tempfile.TemporaryDirectory() as td:
            vd = pathlib.Path(td)
            git(vd, "init", "-q", "-b", "videos")
            for n in ("mine", "theirs"):
                (vd / "shorts" / n).mkdir(parents=True)
                (vd / "shorts" / n / "metadata.json").write_text("{}\n")
                (vd / "shorts" / n / "short.mp4").write_bytes(b"old")
            (vd / "README.md").write_text("x\n")
            git(vd, "add", "-A"); git(vd, "commit", "-q", "-m", "start")
            # another session staged its package
            (vd / "shorts" / "theirs" / "metadata.json").write_text('{"status": "ready"}\n')
            git(vd, "add", "shorts/theirs/metadata.json")
            # this publish: new mp4 (released), new metadata
            (vd / "shorts" / "mine" / "short.mp4").write_bytes(b"new")
            (vd / "shorts" / "mine" / "metadata.json").write_text(json.dumps({"video": {"release": {"url": "u", "sha256": "s"}}}) + "\n")
            (vd / ".gitignore").write_text(ra.IGNORE)
            git(vd, "rm", "-q", "--cached", "shorts/mine/short.mp4")
            env = dict(os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t", GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@t")
            old = dict(os.environ); os.environ.update(env)
            try:
                self.assertTrue(ra.commit(vd, ["mine"], "Package mine", push=False))
            finally:
                os.environ.clear(); os.environ.update(old)
            changed = git(vd, "show", "--name-status", "--format=", "HEAD").split("\n")
            self.assertIn("D\tshorts/mine/short.mp4", changed)
            self.assertIn("M\tshorts/mine/metadata.json", changed)
            self.assertFalse(any("theirs" in l for l in changed))            # not swept in
            self.assertIn("shorts/theirs/metadata.json", git(vd, "diff", "--cached", "--name-only"))   # still staged
            self.assertNotIn("shorts/mine", git(vd, "status", "--porcelain"))   # index matches the commit
            # a package with an mp4 but no release is refused
            (vd / "shorts" / "theirs" / "short.mp4").write_bytes(b"x")
            with self.assertRaises(SystemExit):
                ra.commit(vd, ["theirs"], "x", push=False)


if __name__ == "__main__":
    unittest.main()
