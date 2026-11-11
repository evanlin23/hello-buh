"""Buh Stories numbers (scripts/buhstories_metrics.py): the manual-upload ledger, the Studio import into
uploads/buhstories/, the decision-rule report; and studio_import.py's HelloBuh path unchanged. No network, no secrets."""
import datetime as dt
import importlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent
FIX = REPO / "lib" / "hb" / "test" / "fixtures" / "studio_hellobuh"
sys.path.insert(0, str(HERE))
NOW = dt.datetime(2026, 11, 20, 12, 0, tzinfo=dt.timezone.utc)


def ids(n):
    return [f"VID{i:08d}" for i in range(n)]   # 11 chars


class Base(unittest.TestCase):
    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.td.name)
        for s, fam in (("alpha", "pet"), ("beta", "secret"), ("gamma", "custom"), ("delta", "secret"), ("eps", None),
                       ("zeta", "pet"), ("eta", "pet")):
            d = self.root / "stories" / s
            d.mkdir(parents=True)
            (d / "story.json").write_text(json.dumps({"premise": s, **({"family": fam} if fam else {})}))
        (self.root / "stunts").mkdir()
        (self.root / "stunts" / "story_other_name.js").write_text("module.exports = { edit: { story: 'stories/alpha' } }")
        os.environ["HB_ROOT"] = str(self.root)
        sys.modules.pop("buhstories_metrics", None)
        self.m = importlib.import_module("buhstories_metrics")

    def tearDown(self):
        os.environ.pop("HB_ROOT", None)
        sys.modules.pop("buhstories_metrics", None)
        self.td.cleanup()

    def ledger(self):
        return json.loads((self.root / "uploads" / "buhstories" / "uploads.json").read_text())

    def upload(self, story, vid, when, **kw):
        code, msg = self.m.cmd_uploaded(story, vid, when, **kw)
        self.assertEqual(code, 0, msg)
        return msg

    def studio(self, collected, videos):
        return self.m.cmd_import({"collected_at": collected, "videos": videos})


class Ledger(Base):
    def test_records_package_family_time_and_links(self):
        msg = self.upload("alpha", "https://youtube.com/shorts/ABCDEFGHIJK?feature=share", "2026-11-12 18:05")
        e = self.ledger()["story_alpha"]
        self.assertEqual(e["video_id"], "ABCDEFGHIJK")
        self.assertEqual(e["publish_at"], "2026-11-13T00:05:00Z")      # Central -> UTC
        self.assertEqual(e["uploaded"], "2026-11-12")                  # a Central date, like the uploader's record
        self.assertEqual((e["family"], e["by"], e["story"]), ("pet", "hand", "alpha"))
        self.assertIn("48 h", msg)
        self.upload("story_beta", "BBBBBBBBBBB", "2026-11-13T18:00Z")
        self.assertEqual(self.ledger()["story_beta"]["publish_at"], "2026-11-13T18:00:00Z")

    def test_stunt_edit_story_and_family_flag(self):
        self.upload("story_other_name", "CCCCCCCCCCC", None, now=NOW)
        self.assertEqual(self.ledger()["story_other_name"]["family"], "pet")   # via the stunt's edit.story
        msg = self.upload("eps", "DDDDDDDDDDD", "2026-11-14")
        self.assertIn("no premise family", msg)
        self.upload("eps", "DDDDDDDDDDD", "2026-11-14", family="weird")
        self.assertEqual(self.ledger()["story_eps"]["family"], "weird")

    def test_refuses_bad_ids_unknown_stories_and_reused_ids(self):
        self.assertEqual(self.m.cmd_uploaded("alpha", "nope", None)[0], 1)
        self.assertEqual(self.m.cmd_uploaded("no_such_story", "ABCDEFGHIJK", None)[0], 1)
        self.assertEqual(self.m.cmd_uploaded("alpha", "ABCDEFGHIJK", "yesterday")[0], 1)
        self.upload("alpha", "ABCDEFGHIJK", "2026-11-12")
        self.assertEqual(self.m.cmd_uploaded("beta", "ABCDEFGHIJK", None)[0], 1)

    def test_uploader_reads_the_same_record(self):
        # once uploads are automated, a hand upload recorded here is never picked again
        self.upload("alpha", "ABCDEFGHIJK", "2026-11-12")
        os.environ["YT_CHANNEL"] = "buhstories"
        try:
            sys.modules.pop("youtube_upload", None)
            yu = importlib.import_module("youtube_upload")
            yu.RECORD = self.root / "uploads" / "buhstories" / "uploads.json"
            self.assertIn("story_alpha", yu.record())
            self.assertEqual(yu.record()["story_alpha"]["video_id"], "ABCDEFGHIJK")
        finally:
            os.environ.pop("YT_CHANNEL", None)
            sys.modules.pop("youtube_upload", None)


class Import(Base):
    def test_joins_by_id_keeps_snapshots_and_skips_unrecorded(self):
        self.upload("alpha", "AAAAAAAAAAA", "2026-11-12T12:00Z")
        code, msg = self.studio("2026-11-14T12:00Z", [
            {"id": "AAAAAAAAAAA", "engaged_views": "1,500", "views": 2000, "viewed_pct": "71%", "avg_pct_viewed": 90,
             "subs_gained": 3, "shown_in_feed": 2500},
            {"id": "XXXXXXXXXXX", "title": "not recorded"}])
        self.assertEqual(code, 0)
        self.assertIn("NOT imported", msg)
        self.assertIn("XXXXXXXXXXX", msg)
        self.studio("2026-11-19T12:00Z", [{"id": "AAAAAAAAAAA", "engaged_views": 4000, "subs_gained": 9}])
        s = json.loads((self.root / "uploads" / "buhstories" / "studio.json").read_text())["story_alpha"]
        self.assertEqual([x["age_h"] for x in s["snapshots"]], [48.0, 168.0])
        self.assertEqual(s["snapshots"][0]["engaged_views"], 1500.0)
        self.assertEqual((s["engaged_views"], s["subs"], s["date"]), (4000.0, 9, "2026-11-19"))
        # the same import twice doesn't double the snapshot
        self.studio("2026-11-19T12:00Z", [{"id": "AAAAAAAAAAA", "engaged_views": 4000}])
        s = json.loads((self.root / "uploads" / "buhstories" / "studio.json").read_text())["story_alpha"]
        self.assertEqual(len(s["snapshots"]), 2)
        self.assertFalse((self.root / "uploads" / "studio.json").exists())   # never HelloBuh's store

    def test_studio_import_channel_flag(self):
        self.upload("alpha", "AAAAAAAAAAA", "2026-11-12T12:00Z")
        ans = self.root / "a.md"
        ans.write_text('text\n```json\n{"collected_at": "2026-11-14T06:00-06:00", "videos": [{"id": "AAAAAAAAAAA", "engaged_views": 10}]}\n```\n')
        r = subprocess.run([sys.executable, str(HERE / "studio_import.py"), "--channel", "buhstories", str(ans)],
                           env={**os.environ, "HB_ROOT": str(self.root)}, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        s = json.loads((self.root / "uploads" / "buhstories" / "studio.json").read_text())
        self.assertEqual(s["story_alpha"]["snapshots"][0]["age_h"], 48.0)


class Report(Base):
    def launch(self, rows):
        """rows: (story, engaged, stayed, apv, subs, feed); uploaded a day apart from 2026-11-12."""
        vids = ids(len(rows))
        for i, (story, *_rest) in enumerate(rows):
            self.upload(story, vids[i], f"2026-11-{12 + i}T17:00Z")
        self.studio("2026-11-19T17:00Z", [
            {k: v for k, v in zip(("id", "engaged_views", "viewed_pct", "avg_pct_viewed", "subs_gained", "shown_in_feed"),
                                  (vids[i], *r[1:])) if v is not None} for i, r in enumerate(rows)])
        return self.m.build_report(NOW)

    def rules(self, rep, name=None):
        if name is None:
            return [x["rule"] for x in rep["channel_rules"]]
        return [x["rule"] for r in rep["shorts"] if r["name"] == name for x in r["rules"]]

    def test_every_rule_cites_a_real_line(self):
        for key in self.m.ANCHORS:
            c = self.m.cite(key)
            self.assertNotIn("not found", c, key)
            doc, line = c.rsplit(":", 1)
            self.assertIn(self.m.ANCHORS[key][1], (REPO / doc).read_text().splitlines()[int(line) - 1])

    def test_empty_and_partial(self):
        out = self.m.render(self.m.build_report(NOW))
        self.assertIn("nothing recorded yet", out)
        self.upload("alpha", "AAAAAAAAAAA", "2026-11-12T17:00Z")
        self.upload("eps", "EEEEEEEEEEE", "2026-11-13T17:00Z")
        rep = self.m.build_report(NOW)
        out = self.m.render(rep)
        self.assertIn("no Studio numbers yet", out)
        self.assertIn("48 h snapshot", out)
        self.assertIn("7 d snapshot", out)
        self.assertIn("needs 3+ Shorts", out)
        self.assertIn("family unknown for story_eps", out)
        self.assertIn("RULES THAT FIRE\n- none yet", out)
        self.assertIn("studio-metrics-prompt-buhstories.md", out)

    def test_hook_sag_loop_hit_flop(self):
        rep = self.launch([
            ("alpha", 50_000, 82, 115, 150, 70_000),   # 5x hit, loop works
            ("beta", 3_000, 55, 65, 9, 5_000),         # hook problem (< 60), middle sags
            ("gamma", 2_500, 70, 85, 5, 4_000),
            ("delta", 2_000, 59.9, 80, 4, 3_000),      # hook (< 60)
            ("zeta", 400, 75, 85, 0, 800),             # flop, but too early for per-Short rules
        ])
        self.assertEqual(rep["median"]["engaged_views"], 2500)
        self.assertEqual(sorted(self.rules(rep, "story_alpha")), ["hit", "loop"])
        hit = [x for r in rep["shorts"] for x in r["rules"] if x["rule"] == "hit"][0]
        self.assertIn("'pet' family", hit["action"])
        self.assertIn("story_zeta", hit["action"])                 # already up in the same family
        self.assertIn("2026-11-27", hit["action"])                 # within 7 days
        self.assertEqual(sorted(self.rules(rep, "story_beta")), ["hook", "sag"])
        self.assertEqual(self.rules(rep, "story_gamma"), [])
        self.assertEqual(self.rules(rep, "story_delta"), ["hook"])
        self.assertEqual(self.rules(rep, "story_zeta"), ["flop"])
        self.assertIn("< 1,000", [r for r in rep["shorts"] if r["name"] == "story_zeta"][0]["too_early"])
        out = self.m.render(rep)
        self.assertIn("buhstories_growth_2026-11-11.md:", out)
        self.assertIn("hook problem", out)

    def test_ten_points_under_median_and_views_as_impressions_proxy(self):
        rep = self.launch([("alpha", 3000, 80, 90, 6, None), ("beta", 3000, 82, 90, 6, None),
                           ("gamma", 3000, 69, 90, 6, None)])
        # no "shown in feed": engaged views (>= impressions' floor) stand in for the 1,000-impression gate
        self.assertEqual(self.rules(rep, "story_gamma"), ["hook"])  # 69 is 11 pts under the median 80
        g = [r for r in rep["shorts"] if r["name"] == "story_gamma"][0]
        self.assertTrue(any("shown in feed" in m for m in g["missing"]))

    def test_subs_rule_and_explore(self):
        rep = self.launch([("alpha", 3000, 80, 90, 2, 5000), ("beta", 3000, 80, 90, 2, 5000),
                           ("delta", 3000, 80, 90, 2, 5000)])
        self.assertIn("subs", self.rules(rep))
        self.assertIn("explore", self.rules(rep))   # beta then delta: both 'secret', no hit yet

    def test_after_ten_uploads(self):
        stories = ["alpha", "beta", "gamma", "delta", "eps", "zeta", "eta"]
        for s in ("s8", "s9", "s10"):
            d = self.root / "stories" / s
            d.mkdir()
            (d / "story.json").write_text(json.dumps({"family": s}))
            stories.append(s)
        rep = self.launch([(s, 5000, 80, 90, 10, 6000) for s in stories])
        self.assertIn("ten", self.rules(rep))
        self.assertNotIn("thirty", self.rules(rep))
        self.assertTrue(any(t.startswith("thirty: 10/30") for t in rep["todo"]))

    def test_kids_and_ai_labels(self):
        self.upload("alpha", "AAAAAAAAAAA", "2026-11-12T17:00Z")
        self.studio("2026-11-14T17:00Z", [{"id": "AAAAAAAAAAA", "made_for_kids": True, "ai_label": "detected"}])
        rep = self.m.build_report(NOW)
        self.assertEqual(sorted(self.rules(rep, "story_alpha")), ["ai", "kids"])

    def test_cli_report_and_json(self):
        self.upload("alpha", "AAAAAAAAAAA", "2026-11-12T17:00Z")
        env = {**os.environ, "HB_ROOT": str(self.root)}
        r = subprocess.run([sys.executable, str(HERE / "buhstories_metrics.py"), "report", "--json", "--now", "2026-11-20T12:00Z"],
                           env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(json.loads(r.stdout)["shorts"][0]["name"], "story_alpha")


class HelloBuhUnchanged(unittest.TestCase):
    """studio_import.py without --channel does exactly what it did before Buh Stories (fixture outputs were made with
    the original script)."""

    def test_same_output_and_files(self):
        with tempfile.TemporaryDirectory() as td:
            t = pathlib.Path(td)
            (t / "scripts").mkdir()
            (t / "uploads").mkdir()
            for f in ("studio_import.py", "buhstories_metrics.py"):
                shutil.copy(HERE / f, t / "scripts" / f)
            shutil.copy(FIX / "uploads.json", t / "uploads" / "uploads.json")
            run = lambda *a: subprocess.run([sys.executable, str(t / "scripts" / "studio_import.py"), str(FIX / "answer.md"), *a],
                                            capture_output=True, text=True, env={k: v for k, v in os.environ.items() if k != "HB_ROOT"})
            r = run("--report-only")
            self.assertEqual(r.stdout, (FIX / "expected_report_only.txt").read_text())
            self.assertFalse((t / "uploads" / "studio.json").exists())
            r = run()
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(r.stdout, (FIX / "expected_stdout.txt").read_text())
            for f in ("studio.json", "studio_channel.json"):
                self.assertEqual((t / "uploads" / f).read_text(), (FIX / f"expected_{f}").read_text(), f)
            self.assertFalse((t / "uploads" / "buhstories").exists())


def load_hellobuh_uploader():
    old = dict(os.environ)
    os.environ.pop("HB_ROOT", None)
    os.environ["YT_CHANNEL"] = "hellobuh"
    try:
        sys.modules.pop("youtube_upload", None)
        _yu = importlib.import_module("youtube_upload")
        _yu.owner_ok = lambda name, meta: ""  # (the owner-OK gate is tested in scripts/test_owner_ok.py)
        return _yu
    finally:
        os.environ.clear(); os.environ.update(old)


class HelloBuhUploaderUnchanged(unittest.TestCase):
    """The HelloBuh uploader with a Buh Stories ledger and store next to it: the family_scores ranking, "# first"
    pins, the score order and gates/stale skipping are what they were (youtube_upload.py is untouched by this branch;
    these pin its behaviour so a later change to the shared code can't drift HelloBuh)."""

    def setUp(self):
        self.td = tempfile.TemporaryDirectory()
        self.t = pathlib.Path(self.td.name)
        self.yu = load_hellobuh_uploader()
        self.assertEqual(self.yu.CHANNEL, "hellobuh")
        self.assertEqual(self.yu.UP, REPO / "uploads")              # HelloBuh's records stay in uploads/
        up = self.t / "uploads"
        (up / "buhstories").mkdir(parents=True)
        self.yu.UP, self.yu.SCORES, self.yu.QUEUE = up, up / "scores.json", up / "queue.txt"
        self.yu.video_analytics = lambda ya, ids, s, e: ({}, "")    # no network: Studio numbers only

    def tearDown(self):
        sys.modules.pop("youtube_upload", None)
        self.td.cleanup()

    def test_family_scores_ranking(self):
        done = {"alpha_x": {"video_id": "AAAAAAAAAAA", "uploaded": "2026-01-01", "publish_at": "2026-01-01T12:00:00Z"},
                "beta_y": {"video_id": "BBBBBBBBBBB", "uploaded": "2026-01-02", "publish_at": "2026-01-02T12:00:00Z"}}
        (self.yu.UP / "studio.json").write_text(json.dumps({"alpha_x": {"views": 10000, "subs": 30},
                                                           "beta_y": {"views": 2000, "subs": 2}}))
        # a Buh Stories ledger and store with a huge hit must not leak into HelloBuh's scores
        (self.yu.UP / "buhstories" / "uploads.json").write_text(json.dumps({"story_z": {"video_id": "ZZZZZZZZZZZ"}}))
        (self.yu.UP / "buhstories" / "studio.json").write_text(json.dumps({"story_z": {"views": 10**7, "subs": 10**5}}))
        out = self.yu.family_scores(None, done)
        # mean rate 32/12000 = 2.667/1k, mean reach 6000; alpha: (30+8)/13000 x (10000+12000)/3; beta: (2+8)/5000 x 14000/3
        self.assertEqual(out["family"], {"alpha_x": 21.44, "beta_y": 9.33})
        self.assertEqual(out["mean"], 16.0)
        self.assertNotIn("story_z", json.dumps(out))
        self.assertEqual(json.loads(self.yu.SCORES.read_text())["family"], out["family"])

    def test_first_pins_score_order_and_gate_skips(self):
        vd = self.t / "videos"
        g = {"version": __import__("gates").current(), "pace": {"ok": True, "summary": "OK"},
             "check": {"ok": True, "label": "CHECK OK"}, "key_sounds": "n/a"}
        for name, gates_ in (("aa_one", g), ("bb_two", g), ("cc_three", g), ("dd_old", {**g, "version": g["version"] - 1}),
                             ("story_light_sleeper", None)):
            d = vd / "shorts" / name
            d.mkdir(parents=True)
            meta = {"name": name, "status": "ready", "published_at": "2026-11-01", **({"gates": gates_} if gates_ else {})}
            if name.startswith("story_"):
                meta["channel"] = "buhstories"
            (d / "metadata.json").write_text(json.dumps(meta))
        self.yu.QUEUE.write_text("dd_old # first\ncc_three\nbb_two # first\naa_one\nstory_light_sleeper\n")
        scores = {"mean": 1, "family": {"aa_one": 9, "cc_three": 5}}
        name, why = self.yu.pick(vd, {}, scores)
        self.assertEqual(name, "bb_two")                       # "# first" wins; the stale-gated pin is skipped
        self.assertIn("dd_old: gated at v", why)
        self.assertEqual(self.yu.pick(vd, {"bb_two": {"uploaded": "1"}}, scores)[0], "aa_one")   # then by score
        self.assertEqual(self.yu.pick(vd, {"bb_two": {"uploaded": "1"}, "aa_one": {"uploaded": "2"}}, scores)[0], "cc_three")
        name, why = self.yu.pick(vd, {"bb_two": {"uploaded": "1"}, "aa_one": {"uploaded": "2"}, "cc_three": {"uploaded": "3"}}, scores)
        self.assertIsNone(name)                                # a Buh Stories package never goes to HelloBuh
        self.assertIn("story_light_sleeper: belongs to the buhstories channel", why)


if __name__ == "__main__":
    unittest.main()
