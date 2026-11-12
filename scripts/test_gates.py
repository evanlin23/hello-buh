"""scripts/gates.py: the gates version on each package, the uploader skipping a package gated before the current gates
(with its reason), story_* exempt, waivers; and the stale-checkout guard (HEAD must contain origin/main). No network."""
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
import gates  # noqa: E402

CUR = gates.current()


def ok_gates(v=CUR, **kw):
    return {"version": v, "pace": {"ok": True, "summary": "OK"}, "check": {"ok": True, "label": "CHECK OK"}, "key_sounds": "n/a", **kw}


class Stale(unittest.TestCase):
    def test_version_is_one_place(self):
        spec = json.loads((HERE.parent / "lib" / "hb" / "gates.json").read_text())
        self.assertEqual(CUR, spec["version"])
        self.assertEqual(max(h["version"] for h in spec["history"]), CUR)   # every bump has its history row

    def test_ungated_and_old_are_stale(self):
        self.assertIn("gated at vnone", gates.stale({"name": "hide_seek"}))
        why = gates.stale({"name": "hide_seek", "gates": ok_gates(CUR - 1)})
        self.assertIn(f"gates are v{CUR} now", why)
        self.assertIn("gates.py stamp hide_seek", why)

    def test_current_passes(self):
        self.assertIsNone(gates.stale({"name": "hide_seek", "gates": ok_gates()}))

    def test_blocked_needs_a_waiver(self):
        g = ok_gates(pace={"ok": False, "summary": "length: 16.2 s (under 25)"})
        self.assertIn("length", gates.stale({"name": "villager_crowd", "gates": g}))
        self.assertIsNone(gates.stale({"name": "villager_crowd", "gates": {**g, "waived": "lead: short cut"}}))
        g = ok_gates(check={"ok": False, "label": "CHECK FAILED: 2 blockers"})
        self.assertIn("CHECK FAILED", gates.stale({"name": "x", "gates": g}))

    def test_package_must_be_the_reviewed_cut(self):
        g = ok_gates(package={"ok": False, "summary": "short.mp4 15.40 s vs the reviewed render 5.27 s"})
        self.assertIn("15.40 s vs the reviewed render", gates.stale({"name": "tnt", "gates": g}))
        with tempfile.TemporaryDirectory() as td:   # the measurement itself, on a 2 s clip
            v = pathlib.Path(td) / "short.mp4"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=black:s=64x64:d=2", str(v)], check=True)
            self.assertTrue(gates.package_match({"video": {"duration_s": 2.0}}, v)["ok"])
            self.assertFalse(gates.package_match({"video": {"duration_s": 5.27}}, v)["ok"])

    def test_stories_are_gated_by_the_story_pipeline(self):
        self.assertIsNone(gates.stale({"name": "story_nitwit"}))
        self.assertIsNone(gates.stale({"name": "story_dog_hill", "gates": ok_gates(0)}))


def load_uploader():
    old = dict(os.environ)
    os.environ["YT_CHANNEL"] = "hellobuh"
    try:
        sys.modules.pop("youtube_upload", None)
        _yu = importlib.import_module("youtube_upload")
        _yu.owner_ok = lambda name, meta: ""  # (the owner-OK gate is tested in scripts/test_owner_ok.py)
        return _yu
    finally:
        os.environ.clear(); os.environ.update(old)


class UploaderSkips(unittest.TestCase):
    def test_pick_skips_old_gates_with_the_reason(self):
        with tempfile.TemporaryDirectory() as td:
            vd = pathlib.Path(td)
            for name, extra, at in (("hide_seek", {}, "2026-11-07"), ("tnt_1000", {"gates": ok_gates(CUR - 1)}, "2026-11-08"),
                                    ("fortune", {"gates": ok_gates()}, "2026-11-09"), ("story_nitwit", {"channel": "hellobuh"}, "2026-11-10")):
                d = vd / "shorts" / name
                d.mkdir(parents=True)
                (d / "metadata.json").write_text(json.dumps({"name": name, "status": "ready", "published_at": at, **extra}))
            yu = load_uploader()
            yu.QUEUE = vd / "queue.txt"
            yu.QUEUE.write_text("hide_seek\ntnt_1000\nfortune\nstory_nitwit\n")
            name, why = yu.pick(vd, {})
            self.assertEqual(name, "fortune")
            self.assertIn("hide_seek: gated at vnone", why)
            self.assertIn("tnt_1000: gated at v", why)
            name, _ = yu.pick(vd, {"fortune": {"uploaded": "x"}})
            self.assertEqual(name, "story_nitwit")   # stories: the story pipeline's gates


def git(*a, cwd):
    return subprocess.run(["git", *a], cwd=cwd, capture_output=True, text=True, check=True).stdout.strip()


class Fresh(unittest.TestCase):
    def test_head_must_contain_origin_main(self):
        with tempfile.TemporaryDirectory() as td:
            t = pathlib.Path(td)
            env = {**os.environ, "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t", "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t"}
            subprocess.run(["git", "init", "-q", "--bare", "-b", "main", str(t / "origin.git")], check=True)
            for c in ("a", "b"):
                subprocess.run(["git", "clone", "-q", str(t / "origin.git"), str(t / c)], check=True, capture_output=True)
            a, b = t / "a", t / "b"
            (a / "f").write_text("1")
            subprocess.run(["git", "add", "f"], cwd=a, check=True)
            subprocess.run(["git", "commit", "-qm", "1"], cwd=a, check=True, env=env)
            subprocess.run(["git", "push", "-q", "origin", "HEAD:main"], cwd=a, check=True)
            subprocess.run(["git", "pull", "-q", "origin", "main"], cwd=b, check=True, env=env)
            self.assertIsNone(gates.fresh(b))
            # someone merges to main; b's checkout is now stale
            (a / "f").write_text("2")
            subprocess.run(["git", "commit", "-qam", "2"], cwd=a, check=True, env=env)
            subprocess.run(["git", "push", "-q", "origin", "HEAD:main"], cwd=a, check=True)
            why = gates.fresh(b)
            self.assertIn("rebase on origin/main", why.lower())
            # a branch on top of the new main is fine
            subprocess.run(["git", "checkout", "-qb", "work", "origin/main"], cwd=b, check=True)
            subprocess.run(["git", "commit", "-q", "--allow-empty", "-m", "mine"], cwd=b, check=True, env=env)
            self.assertIsNone(gates.fresh(b))


class MixGate(unittest.TestCase):
    """The bed pumping / music over the game gate (scripts/mix_pump.py via add_song's metadata.json `mix`, owner
    2026-11-12 on desire_town: "the music jumps too much")."""
    SONG = {"song": {"file": "x2.mp3"}}

    def write(self, d, name, x):
        import numpy as np
        w = pathlib.Path(d) / name
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", "48000", "-ac", "1", "-i", "-", "-c:a", "aac", str(w)],
                       input=np.asarray(x, np.float32).tobytes(), check=True)
        return w

    def test_pumped_fails_steady_passes(self):
        with tempfile.TemporaryDirectory() as d:
            v = pathlib.Path(d) / "short.mp4"   # (no short_nosong.mp4 beside it: the recorded numbers)
            bad = gates.mix_gate("desire_town", {**self.SONG, "mix": {"pump": 13.0, "pump_run": 1.2, "under": -2.0}}, v)
            self.assertFalse(bad["ok"])
            self.assertIn("BLOCK pump+under", bad["summary"])
            good = gates.mix_gate("desire_town", {**self.SONG, "mix": {"pump": 2.3, "pump_run": 0.0, "under": 5.8}}, v)
            self.assertTrue(good["ok"])
            # the uploader skips a package whose mix gate blocked (unless waived)
            why = gates.stale({"name": "desire_town", "gates": ok_gates(mix=bad)})
            self.assertIn("mix:", why)
            self.assertIsNone(gates.stale({"name": "desire_town", "gates": ok_gates(mix=good)}))
            self.assertIsNone(gates.stale({"name": "desire_town", "gates": ok_gates(mix=bad, waived="lead: ok")}))

    def test_under_measured_on_the_package(self):
        import numpy as np
        sr = 48000
        game = np.zeros(8 * sr, np.float32)
        rng = np.random.default_rng(1)
        for k in range(8):
            game[int((k + .5) * sr):int((k + .65) * sr)] = 0.5 * rng.uniform(-1, 1, int(0.15 * sr))
        music = 0.5 * np.sin(2 * np.pi * 220 * np.arange(8 * sr) / sr)
        with tempfile.TemporaryDirectory() as d:
            self.write(d, "short_nosong.mp4", game)
            v = self.write(d, "short.mp4", game + music)   # music on top of the game
            g = gates.mix_gate("x", {**self.SONG, "mix": {"pump": 1.0, "pump_run": 0.0, "under": 9.0}}, v)
            self.assertFalse(g["ok"])   # the package's own short.mp4 decides, not the recorded 9.0
            self.assertIn("on short.mp4", g["summary"])

    def test_skipped_for_stories_no_song_and_old_packages(self):
        v = pathlib.Path("/nonexistent/short.mp4")
        self.assertIsNone(gates.mix_gate("story_torch", {**self.SONG, "mix": {"pump": 13.0}}, v))
        self.assertIsNone(gates.mix_gate("tnt", {"mix": {"pump": 13.0}}, v))   # no song
        self.assertIsNone(gates.mix_gate("tnt", {**self.SONG, "edit": {"ownScore": True}, "mix": {"pump": 13.0}}, v))
        self.assertIsNone(gates.mix_gate("tnt", dict(self.SONG), v))   # mixed before add_song recorded `mix`


if __name__ == "__main__":
    unittest.main()
