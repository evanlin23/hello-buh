"""The owner-OK gate (owner 2026-11-11: "dont let anything go to youtube anymore without an OK from me"): a Short
uploads only with a line in uploads/owner_ok.txt naming the sha256 prefix of the exact cut the owner watched."""
import importlib
import json
import os
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))


def load():
    os.environ["YT_CHANNEL"] = "hellobuh"
    sys.modules.pop("youtube_upload", None)
    return importlib.import_module("youtube_upload")


class OwnerOk(unittest.TestCase):
    def setUp(self):
        self.yu = load()
        self.tmp = tempfile.TemporaryDirectory()
        self.yu.OWNER_OK = pathlib.Path(self.tmp.name) / "owner_ok.txt"
        self.meta = {"status": "ready", "video": {"release": {"sha256": "abcdef0123456789" + "0" * 48}}}

    def tearDown(self):
        self.tmp.cleanup()

    def test_no_file_blocks(self):
        self.assertIn("no owner OK", self.yu.owner_ok("desire_town", self.meta))

    def test_unlisted_blocks(self):
        self.yu.OWNER_OK.write_text("other  abcdef0123456789  # ok\n")
        self.assertIn("no owner OK yet", self.yu.owner_ok("desire_town", self.meta))

    def test_ok_for_this_cut_passes(self):
        self.yu.OWNER_OK.write_text("desire_town  abcdef0123456789  # 2026-11-11: owner OK\n")
        self.assertEqual(self.yu.owner_ok("desire_town", self.meta), "")

    def test_ok_for_an_older_cut_blocks(self):
        self.yu.OWNER_OK.write_text("desire_town  1111111111111111  # older cut\n")
        self.assertIn("another cut", self.yu.owner_ok("desire_town", self.meta))

    def test_second_ok_line_for_a_remix_passes(self):
        # owner 2026-11-12 "re mix only the sound, keep existing OKs" (r:r6ae905): the re-mixed cut gets a second line
        self.yu.OWNER_OK.write_text("desire_town  1111111111111111  # old cut\n"
                                    "desire_town  abcdef0123456789  # sound-only re-mix of OK'd cut 1111111111111111\n")
        self.assertEqual(self.yu.owner_ok("desire_town", self.meta), "")

    def test_short_prefix_or_no_release_blocks(self):
        self.yu.OWNER_OK.write_text("desire_town  abc  # too short\n")
        self.assertNotEqual(self.yu.owner_ok("desire_town", self.meta), "")
        self.yu.OWNER_OK.write_text("desire_town  abcdef0123456789\n")
        self.assertNotEqual(self.yu.owner_ok("desire_town", {"status": "ready"}), "")

    def test_pick_skips_without_ok(self):
        vd = pathlib.Path(self.tmp.name) / "vd"
        (vd / "shorts" / "desire_town").mkdir(parents=True)
        (vd / "shorts" / "desire_town" / "metadata.json").write_text(json.dumps(self.meta))
        self.yu.QUEUE = vd / "queue.txt"
        self.yu.QUEUE.write_text("desire_town\n")
        name, why = self.yu.pick(vd, {})
        self.assertIsNone(name)
        self.assertIn("no owner OK", why)


if __name__ == "__main__":
    unittest.main()
