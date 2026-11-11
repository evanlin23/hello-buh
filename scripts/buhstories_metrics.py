#!/usr/bin/env python3
"""Buh Stories (@BuhStoriesMC) numbers: the manual-upload ledger, the Studio import and the decision-rule report.

    python3 scripts/buhstories_metrics.py uploaded <story> <video id> [time] [--family F] [--title T]
    python3 scripts/buhstories_metrics.py import <answer.json|->     # Claude in Chrome's answer
                                                                    # (docs/studio-metrics-prompt-buhstories.md)
    python3 scripts/buhstories_metrics.py report [--json] [--now ISO]

(`./hb uploaded`, `python3 scripts/studio_import.py --channel buhstories` and `./hb stories-report` call these.)

Files, all in uploads/buhstories/ (the same folder the Buh Stories uploader will use once it is switched on):
  uploads.json  {package: {video_id, uploaded, publish_at, title, by: "hand", story, family}}. The uploader reads the
                same file, so a Short recorded here is never uploaded twice once uploads are automated.
  studio.json   {package: {latest Studio numbers..., subs, views, date, snapshots: [one per import]}}
  studio_channel.json  the channel block of the latest import.

The report judges each Short on what the research doc says to judge it on (docs/research/buhstories_growth_2026-11-11.md
"Ongoing: what to measure and the decision rules"): engaged views, stayed to watch (viewed vs swiped away), average %
viewed and subscribers per 1,000 engaged views, against the channel's own median. Every rule it fires names its line
in that doc (found by text, so the line number stays right when the doc is edited). It never invents a number: what
is missing is listed, with the step that would fill it.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import statistics
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get("HB_ROOT") or REPO)          # tests point this at a scratch checkout
UP = ROOT / "uploads" / "buhstories"
LEDGER, STUDIO, CHANNEL_FILE = UP / "uploads.json", UP / "studio.json", UP / "studio_channel.json"
TZ = "America/Chicago"                                   # a time with no zone is the uploader's (Central)
RESEARCH = "docs/research/buhstories_growth_2026-11-11.md"
ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
# a YouTube link instead of a bare id is fine: youtube.com/shorts/ID, youtu.be/ID, watch?v=ID, studio .../video/ID
LINK_RE = re.compile(r"(?:shorts/|youtu\.be/|[?&]v=|/video/)([A-Za-z0-9_-]{11})")
CORE = ("engaged_views", "viewed_pct", "avg_pct_viewed", "subs_gained")   # the four numbers every rule needs
MIN_FEED = 1000            # the rules table's "after 1,000+ feed impressions"
MIN_FOR_MEDIAN = 3         # a channel median of fewer Shorts says nothing


# ---------------------------------------------------------------- small helpers
def load(p: Path) -> dict:
    return json.loads(p.read_text()) if p.exists() else {}


def save(p: Path, d: dict) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(d, indent=1, ensure_ascii=False) + "\n")


def num(x):
    """Studio's way of writing numbers -> a float ("12.5%", "1,204", "3.4K"); None when it isn't one."""
    if x is None or isinstance(x, bool):
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).replace(",", "").replace("%", "").strip()
    mult = 1
    if s[-1:].upper() == "K":
        s, mult = s[:-1], 1000
    elif s[-1:].upper() == "M":
        s, mult = s[:-1], 1_000_000
    try:
        return float(s) * mult
    except ValueError:
        return None


def parse_time(s: str | None) -> dt.datetime | None:
    """ISO-ish time -> aware UTC. No zone means Central. Accepts '2026-11-12', '2026-11-12 18:05', '...Z', '...-06:00'
    and Studio's 'YYYY-MM-DDTHH:MM local, America/Chicago' style (the zone name after the time)."""
    if not s:
        return None
    from zoneinfo import ZoneInfo
    s = str(s).strip()
    zone = None
    m = re.search(r"\b([A-Z][A-Za-z_]+/[A-Za-z_]+)\b", s)
    if m:
        try:
            zone = ZoneInfo(m.group(1))
        except Exception:
            zone = None
    m = re.match(r"(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}:\d{2}(?::\d{2})?))?\s*(Z|[+-]\d{2}:?\d{2})?", s)
    if not m:
        return None
    t = dt.datetime.fromisoformat(m.group(1) + "T" + (m.group(2) or "00:00").zfill(5))
    if m.group(3):
        off = m.group(3)
        tz = dt.timezone.utc if off == "Z" else dt.timezone(dt.timedelta(hours=int(off[:3]), minutes=int(off[-2:]) * (1 if off[0] == "+" else -1)))
        t = t.replace(tzinfo=tz)
    else:
        t = t.replace(tzinfo=zone or ZoneInfo(TZ))
    return t.astimezone(dt.timezone.utc)


def central_date(t: dt.datetime) -> str:
    from zoneinfo import ZoneInfo
    return t.astimezone(ZoneInfo(TZ)).date().isoformat()   # the uploader's `uploaded` is a Central date too


def iso(t: dt.datetime) -> str:
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def video_id(s: str) -> str | None:
    s = s.strip()
    if ID_RE.match(s):
        return s
    m = LINK_RE.search(s)
    return m.group(1) if m else None


# ---------------------------------------------------------------- the package and its story
def package_name(story: str) -> str:
    """'light_sleeper', 'story_light_sleeper' or 'stories/light_sleeper' -> the package name 'story_light_sleeper'."""
    s = story.strip().rstrip("/").split("/")[-1]
    s = s[:-3] if s.endswith(".js") else s
    return s if s.startswith("story_") else "story_" + s


def story_dir(pkg: str) -> Path | None:
    """The package's stories/<dir>: the stunt's edit.story when it names one, else stories/<name without story_>."""
    stunt = ROOT / "stunts" / f"{pkg}.js"
    if stunt.exists():
        m = re.search(r"story:\s*['\"](stories/[\w-]+)['\"]", stunt.read_text())
        if m and (ROOT / m.group(1)).is_dir():
            return ROOT / m.group(1)
    d = ROOT / "stories" / pkg[len("story_"):]
    return d if d.is_dir() else None


def story_json(pkg: str) -> dict:
    d = story_dir(pkg)
    try:
        return json.loads((d / "story.json").read_text()) if d else {}
    except (OSError, ValueError):
        return {}


# ---------------------------------------------------------------- 1. the ledger
def cmd_uploaded(story: str, vid: str, when: str | None, family: str | None = None, title: str | None = None,
                 now: dt.datetime | None = None) -> tuple[int, str]:
    pkg = package_name(story)
    v = video_id(vid)
    if not v:
        return 1, f"{vid!r} is not a YouTube video id (11 letters, digits, - or _; a youtube.com/shorts/... link works too)"
    if story_dir(pkg) is None and not (ROOT / "stunts" / f"{pkg}.js").exists():
        return 1, f"no story called {story!r}: no stunts/{pkg}.js and no stories/{pkg[6:]}/ (ls stories/)"
    t = parse_time(when) if when else (now or dt.datetime.now(dt.timezone.utc))
    if when and t is None:
        return 1, f"{when!r} is not a time (2026-11-12T18:05, Central unless it says Z or -06:00)"
    led = load(LEDGER)
    for name, e in led.items():
        if e.get("video_id") == v and name != pkg:
            return 1, f"video {v} is already recorded as {name}; fix uploads/buhstories/uploads.json by hand if that was wrong"
    sj = story_json(pkg)
    fam = family or sj.get("family")
    prev = led.get(pkg, {})
    led[pkg] = {"video_id": v, "uploaded": central_date(t), "publish_at": iso(t),
                "title": title or prev.get("title") or sj.get("title") or "", "by": "hand", "story": story_dir(pkg).name if story_dir(pkg) else None,
                "family": fam}
    save(LEDGER, led)
    msg = (f"{'updated' if prev else 'recorded'} {pkg}: {v} at {iso(t)} (family {fam or 'UNKNOWN'}) in "
           f"uploads/buhstories/uploads.json; upload #{list(led).index(pkg) + 1}")
    if not fam:
        msg += f"\nno premise family: add \"family\": \"...\" to {story_dir(pkg).relative_to(ROOT) if story_dir(pkg) else 'its story.json'}/story.json or rerun with --family F (the 5x follow-up rule needs it)"
    msg += f"\nStudio numbers due at 48 h ({iso(t + dt.timedelta(hours=48))[:16]}Z) and 7 days ({iso(t + dt.timedelta(days=7))[:10]}): docs/buhstories-metrics.md"
    return 0, msg


# ---------------------------------------------------------------- 2. the Studio import
def load_answer(path: str) -> dict:
    text = sys.stdin.read() if path == "-" else Path(path).read_text()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    return json.loads(m.group(1) if m else text)


SNAP_KEYS = ("engaged_views", "views", "shown_in_feed", "viewed_pct", "avg_pct_viewed", "avg_view_s", "subs_gained",
             "subs_lost", "likes", "comments", "shares")


def cmd_import(ans: dict, report_only: bool = False) -> tuple[int, str]:
    led = load(LEDGER)
    by_id = {e["video_id"]: k for k, e in led.items() if e.get("video_id")}
    studio = load(STUDIO)
    collected = parse_time(ans.get("collected_at"))
    date = str(ans.get("collected_at", ""))[:10]
    lines, unknown, n = [], [], 0
    for v in ans.get("videos", []):
        name = by_id.get(v.get("id"))
        if not name:
            unknown.append(f"{v.get('id')} \"{str(v.get('title', ''))[:40]}\"")
            continue
        n += 1
        entry = {k: val for k, val in v.items() if k not in ("id", "title")}
        for k in SNAP_KEYS:
            if k in entry:
                entry[k] = num(entry[k])
        views = entry.get("views") if entry.get("views") is not None else entry.get("engaged_views")
        entry.update({"subs": int(entry.get("subs_gained") or 0), "views": int(views or 0), "date": date})
        snap = {"collected_at": iso(collected) if collected else ans.get("collected_at"), "data_through": v.get("data_through")}
        up = parse_time(led[name].get("publish_at"))
        if collected and up:
            snap["age_h"] = round((collected - up).total_seconds() / 3600, 1)
        snap.update({k: entry.get(k) for k in SNAP_KEYS})
        old = studio.get(name, {}).get("snapshots", [])
        entry["snapshots"] = [s for s in old if s.get("collected_at") != snap["collected_at"]] + [snap]
        studio[name] = entry
        lines.append(f"  {name}: engaged {fmt(entry.get('engaged_views'))}, stayed {fmt(entry.get('viewed_pct'), '%')}, "
                     f"APV {fmt(entry.get('avg_pct_viewed'), '%')}, subs {fmt(entry.get('subs_gained'))}")
    out = [f"Buh Stories Studio numbers, collected {ans.get('collected_at')}: {n} Short(s)"] + lines
    if unknown:
        out.append("not in uploads/buhstories/uploads.json, so NOT imported (record each with ./hb uploaded <story> <id> "
                   "[time], then import again): " + "; ".join(unknown))
    if ans.get("couldnt_read"):
        out.append("the extension couldn't read: " + "; ".join(map(str, ans["couldnt_read"])))
    if report_only:
        return 0, "\n".join(out)
    studio["_"] = ("Per Buh Stories Short, from YouTube Studio via Claude in Chrome (docs/studio-metrics-prompt-buhstories.md, "
                   "scripts/studio_import.py --channel buhstories). Latest numbers at the top level, every import in "
                   "snapshots. ./hb stories-report reads it.")
    save(STUDIO, studio)
    if ans.get("channel"):
        save(CHANNEL_FILE, {"collected_at": ans.get("collected_at"), **ans["channel"]})
    out.append(f"wrote uploads/buhstories/studio.json" + (" + studio_channel.json" if ans.get("channel") else ""))
    out.append("NEXT: ./hb stories-report")
    return 0, "\n".join(out)


# ---------------------------------------------------------------- 3. the report
# Each rule's citation is found by text in its doc, so the line number follows edits. test_buhstories_metrics checks
# that every anchor is still there.
ANCHORS = {
    "measure": (RESEARCH, "Log every Short's numbers at 48 h and at 7 days"),
    "hook": (RESEARCH, "| stayed to watch | < 60 %"),
    "sag": (RESEARCH, "| APV | < 70 %"),
    "loop": (RESEARCH, "| APV | > 110 %"),
    "subs": (RESEARCH, "| subs per 1k engaged views | < 1.0 on 3 Shorts in a row"),
    "hit": (RESEARCH, "| one Short | > 5x channel median engaged views"),
    "ten": (RESEARCH, "| after 10 uploads | best Short < 10k engaged"),
    "thirty": (RESEARCH, "| after 30 uploads | no Short > 100k"),
    "sixty": (RESEARCH, "| after 60 uploads | median < 5k"),
    "kids": (RESEARCH, "| any Short marked Made for Kids by YouTube"),
    "ai": (RESEARCH, "| an AI label auto-applied"),
    "flop": (RESEARCH, "| a Short flops | any | **leave it up."),
    "explore": ("docs/stories.md", "Until the numbers say what works"),
    "impressions": (RESEARCH, "| signal (per Short, after 1,000+ feed impressions)"),
}


def cite(key: str) -> str:
    doc, text = ANCHORS[key]
    try:
        for i, line in enumerate((REPO / doc).read_text().splitlines(), 1):
            if text in line:
                return f"{doc}:{i}"
    except OSError:
        pass
    return f"{doc} (\"{text[:40]}\" not found)"


def fmt(x, unit="", p=0):
    return "-" if x is None else f"{x:,.{p}f}{unit}"


def median(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if len(xs) >= MIN_FOR_MEDIAN else None


def build_report(now: dt.datetime | None = None) -> dict:
    now = now or dt.datetime.now(dt.timezone.utc)
    led = {k: v for k, v in load(LEDGER).items() if not k.startswith("_")}
    studio = load(STUDIO)
    shorts = []
    for name, e in led.items():
        s = studio.get(name, {}) if isinstance(studio.get(name), dict) else {}
        up = parse_time(e.get("publish_at") or e.get("uploaded"))
        ev, sg = num(s.get("engaged_views")), num(s.get("subs_gained"))
        row = {"name": name, "video_id": e.get("video_id"), "family": e.get("family") or story_json(name).get("family"),
               "uploaded": iso(up) if up else None, "age_h": round((now - up).total_seconds() / 3600, 1) if up else None,
               "engaged_views": ev, "views": num(s.get("views")) if s else None, "shown_in_feed": num(s.get("shown_in_feed")),
               "viewed_pct": num(s.get("viewed_pct")), "avg_pct_viewed": num(s.get("avg_pct_viewed")), "subs_gained": sg,
               "subs_per_1k": round(1000 * sg / ev, 2) if ev and sg is not None else None,
               "made_for_kids": s.get("made_for_kids"), "ai_label": s.get("ai_label"),
               "data_through": s.get("data_through"), "snapshots": s.get("snapshots", []), "rules": [], "missing": []}
        shorts.append(row)
    shorts.sort(key=lambda r: r["uploaded"] or "")
    med = {k: median([r[k] for r in shorts]) for k in ("engaged_views", "viewed_pct", "avg_pct_viewed", "subs_per_1k")}
    channel_rules, todo = [], []

    def fire(target, key, text):
        target.append({"rule": key, "action": text, "cite": cite(key)})

    for r in shorts:
        if not studio.get(r["name"]):
            r["missing"].append("no Studio numbers yet")
        else:
            r["missing"] += [k for k in CORE if r[k] is None]
        # the checkpoints the doc asks for: 48 h and 7 days after upload
        ages = [s.get("age_h") for s in r["snapshots"] if s.get("age_h") is not None]
        if r["age_h"] is not None:
            for h, label in ((48, "48 h"), (168, "7 d")):
                if r["age_h"] >= h and not any(a >= h - 6 for a in ages):
                    r["missing"].append(f"{label} snapshot (due {iso(parse_time(r['uploaded']) + dt.timedelta(hours=h))[:16]}Z)")
        if r["made_for_kids"]:
            fire(r["rules"], "kids", "YouTube marked it Made for Kids: appeal it; review copy, tone and thumbnail")
        if r["ai_label"] and str(r["ai_label"]).lower() not in ("none", "no", "false"):
            fire(r["rules"], "ai", f"AI label ({r['ai_label']}): if it's a detection label (not C2PA or manual) answer "
                                   "\"No\" in the disclosure survey; otherwise leave it, it doesn't affect reach")
        # per-Short signals only count after 1,000+ feed impressions
        feed = r["shown_in_feed"]
        basis = feed if feed is not None else max([x for x in (r["views"], r["engaged_views"]) if x is not None], default=None)
        if basis is None or basis < MIN_FEED:
            r["too_early"] = (f"{fmt(basis)} {'shown in feed' if feed is not None else 'views (shown in feed not read)'}"
                              f" < {MIN_FEED:,}: per-Short rules wait")
        else:
            if feed is None:
                r["missing"].append("shown in feed (used views as the 1,000-impression proxy)")
            vp = r["viewed_pct"]
            if vp is not None and (vp < 60 or (med["viewed_pct"] is not None and vp <= med["viewed_pct"] - 10)):
                why = f"stayed {vp:.0f}% < 60%" if vp < 60 else f"stayed {vp:.0f}% is 10+ pts under the median {med['viewed_pct']:.0f}%"
                fire(r["rules"], "hook", f"hook problem ({why}): the next 3 stories change line 1 / frame 1 style "
                                         "(number + rule, paradox, sinister fact)")
            apv = r["avg_pct_viewed"]
            if apv is not None and apv < 70:
                fire(r["rules"], "sag", f"middle sags (APV {apv:.0f}% < 70%): cut 15% of the words, move the turn earlier (55-80%)")
            if apv is not None and apv > 110:
                fire(r["rules"], "loop", f"loop works (APV {apv:.0f}% > 110%): keep that ending form")
        ev = r["engaged_views"]
        if ev is not None and med["engaged_views"] and ev > 5 * med["engaged_views"]:
            fam = r["family"]
            same = [x["name"] for x in shorts if x is not r and fam and x["family"] == fam]
            fire(r["rules"], "hit", f"5x hit ({fmt(ev)} engaged vs median {fmt(med['engaged_views'])}): within 7 days "
                                    f"(by {(now + dt.timedelta(days=7)).date()}) ship 2-3 more STANDALONE stories in the "
                                    f"'{fam or 'UNKNOWN: set its family'}' family, each with a different outcome"
                                    + (f" (already up in it: {', '.join(same)})" if same else ""))
        elif ev is not None and med["engaged_views"] and ev < med["engaged_views"] / 5:
            fire(r["rules"], "flop", "well under the median: leave it up; never delete and re-upload (a new cut needs a new title and real changes)")

    # channel-level rules
    with_sub = [r for r in shorts if r["subs_per_1k"] is not None]
    if len(with_sub) >= 3 and all(r["subs_per_1k"] < 1.0 for r in with_sub[-3:]):
        fire(channel_rules, "subs", "subs per 1k engaged < 1.0 on the last 3 Shorts: the channel isn't promising \"more "
                                    "of this\"; check the channel page, voice and look consistency, and that the pinned question is live")
    n = len(shorts)
    evs = [r["engaged_views"] for r in shorts if r["engaged_views"] is not None]
    best = max(evs) if evs else None
    for key, at, test, text in (
            ("ten", 10, lambda: best is not None and best < 10_000, "best Short under 10k engaged after 10 uploads: change topic family and hook form, not the pipeline"),
            ("thirty", 30, lambda: best is not None and best <= 100_000, "no Short over 100k after 30 uploads: FORMAT REVIEW (\"In this town\" rule titles, the A+ voice, 20-25 s cuts, or a fixed recurring character)"),
            ("sixty", 60, lambda: evs and statistics.median(evs) < 5_000, "median under 5k after 60 uploads: stop and rethink the channel premise")):
        if n >= at and test():
            fire(channel_rules, key, text)
        elif n < at:
            todo.append(f"{key}: {n}/{at} uploads before the after-{at} check ({cite(key)})")
        if n >= at and len(evs) < n:
            todo.append(f"{key}: {n - len(evs)} Short(s) without engaged views; the after-{at} check counts only the {len(evs)} with numbers")
    # the owner's 2026-11-11 note: explore until a Short clearly beats the median (no two in a row in the same family)
    if not any(x["rule"] == "hit" for r in shorts for x in r["rules"]):
        fams = [r["family"] for r in shorts]
        if len(fams) >= 2 and fams[-1] and fams[-1] == fams[-2]:
            fire(channel_rules, "explore", f"no 5x hit yet, so keep exploring: the last two uploads are both '{fams[-1]}'; "
                                           "make the next one a different premise family, arc and outcome")
        else:
            todo.append(f"explore: no 5x hit yet, so the next story should differ in family, arc and outcome from the last ({fams[-1] if fams else '-'}) ({cite('explore')})")
    if sum(1 for r in shorts if r["engaged_views"] is not None) < MIN_FOR_MEDIAN:
        todo.append(f"channel median: needs engaged views on {MIN_FOR_MEDIAN}+ Shorts (have "
                    f"{sum(1 for r in shorts if r['engaged_views'] is not None)}); the 5x and 10-pts-under-median rules wait")
    if any(not r["family"] for r in shorts):
        todo.append("family unknown for " + ", ".join(r["name"] for r in shorts if not r["family"]) +
                    ": add \"family\" to its story.json (or ./hb uploaded <story> <id> --family F)")
    return {"now": iso(now), "uploads": n, "median": med, "shorts": shorts, "channel_rules": channel_rules, "todo": todo,
            "channel": load(CHANNEL_FILE) or None}


def render(rep: dict) -> str:
    out = [f"Buh Stories (@BuhStoriesMC): {rep['uploads']} upload(s) recorded, as of {rep['now'][:16]}Z "
           f"(numbers per {cite('measure')})"]
    if not rep["shorts"]:
        out.append("nothing recorded yet: after each manual upload run ./hb uploaded <story> <video id> [time]")
        return "\n".join(out)
    hdr = f"{'short':28} {'family':14} {'age':>6} {'feed':>7} {'engaged':>8} {'stayed%':>7} {'APV%':>5} {'subs':>5} {'subs/1k':>7}"
    out += ["", hdr]
    for r in rep["shorts"]:
        age = "-" if r["age_h"] is None else (f"{r['age_h']:.0f}h" if r["age_h"] < 72 else f"{r['age_h'] / 24:.1f}d")
        out.append(f"{r['name'][:28]:28} {str(r['family'] or '?')[:14]:14} {age:>6} {fmt(r['shown_in_feed']):>7} "
                   f"{fmt(r['engaged_views']):>8} {fmt(r['viewed_pct']):>7} {fmt(r['avg_pct_viewed']):>5} "
                   f"{fmt(r['subs_gained']):>5} {fmt(r['subs_per_1k'], p=2):>7}")
    m = rep["median"]
    out.append(f"{'channel median':28} {'':14} {'':>6} {'':>7} {fmt(m['engaged_views']):>8} {fmt(m['viewed_pct']):>7} "
               f"{fmt(m['avg_pct_viewed']):>5} {'':>5} {fmt(m['subs_per_1k'], p=2):>7}"
               + ("" if m["engaged_views"] is not None else f"   (needs {MIN_FOR_MEDIAN}+ Shorts with numbers)"))
    out.append("")
    out.append("RULES THAT FIRE")
    fired = False
    for r in rep["shorts"]:
        for x in r["rules"]:
            fired = True
            out.append(f"- {r['name']}: {x['action']} [{x['cite']}]")
    for x in rep["channel_rules"]:
        fired = True
        out.append(f"- channel: {x['action']} [{x['cite']}]")
    if not fired:
        out.append("- none yet")
    waits = [(r["name"], r["too_early"]) for r in rep["shorts"] if r.get("too_early")]
    miss = [(r["name"], r["missing"]) for r in rep["shorts"] if r["missing"]]
    if waits or miss or rep["todo"]:
        out += ["", "MISSING / WAITING"]
        out += [f"- {n}: {w} ({cite('impressions')})" for n, w in waits]
        out += [f"- {n}: missing {', '.join(ms)}" for n, ms in miss]
        out += [f"- {t}" for t in rep["todo"]]
    if any("no Studio numbers" in " ".join(r["missing"]) or "snapshot" in " ".join(r["missing"]) for r in rep["shorts"]):
        out.append("NEXT: run docs/studio-metrics-prompt-buhstories.md in Claude in Chrome, then "
                   "python3 scripts/studio_import.py --channel buhstories <answer file>")
    return "\n".join(out)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    u = sub.add_parser("uploaded")
    u.add_argument("story"); u.add_argument("video_id"); u.add_argument("time", nargs="?")
    u.add_argument("--family"); u.add_argument("--title")
    i = sub.add_parser("import")
    i.add_argument("answer"); i.add_argument("--report-only", action="store_true")
    r = sub.add_parser("report")
    r.add_argument("--json", action="store_true"); r.add_argument("--now")
    a = ap.parse_args(argv)
    if a.cmd == "uploaded":
        code, msg = cmd_uploaded(a.story, a.video_id, a.time, a.family, a.title)
        print(msg, file=sys.stderr if code else sys.stdout)
        return code
    if a.cmd == "import":
        code, msg = cmd_import(load_answer(a.answer), a.report_only)
        print(msg)
        return code
    rep = build_report(parse_time(a.now) if a.now else None)
    print(json.dumps(rep, indent=1, ensure_ascii=False) if a.json else render(rep))
    return 0


if __name__ == "__main__":
    sys.exit(main())
