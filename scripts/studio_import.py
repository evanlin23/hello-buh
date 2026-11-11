#!/usr/bin/env python3
"""Import the Studio metrics JSON that Claude in Chrome collects (docs/studio-metrics-prompt.md) into uploads/.

  python3 scripts/studio_import.py answer.json      # or a file holding the whole answer text with the ```json block
  python3 scripts/studio_import.py answer.json --report-only
  python3 scripts/studio_import.py --channel buhstories answer.json   # Buh Stories (docs/studio-metrics-prompt-buhstories.md):
                        # matched through uploads/buhstories/uploads.json (./hb uploaded), into uploads/buhstories/studio.json,
                        # one snapshot per import; scripts/buhstories_metrics.py, ./hb stories-report

Writes, per uploaded Short (matched by video id through uploads/uploads.json):
  uploads/studio.json   {name: {subs, views, date, ...the rest of Studio's numbers}} -- youtube_upload.family_scores
                        reads subs/views from here (Studio's count beats the lagging API)
  uploads/studio_channel.json   the channel-level block, as collected
and prints a table sorted by publish time: views, viewed-vs-swiped %, avg % viewed, 3 s retention, subs per 1k views.
"""
import argparse
import json
import re
import sys
from pathlib import Path

UP = Path(__file__).resolve().parent.parent / "uploads"


def load_answer(path: str) -> dict:
    text = sys.stdin.read() if path == "-" else Path(path).read_text()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    return json.loads(m.group(1) if m else text)


def num(x):
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return x
    s = str(x).replace(",", "").replace("%", "").strip()
    mult = 1
    if s[-1:].upper() == "K":
        s, mult = s[:-1], 1000
    try:
        return float(s) * mult
    except ValueError:
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("answer")
    ap.add_argument("--report-only", action="store_true")
    ap.add_argument("--channel", default="hellobuh", choices=("hellobuh", "buhstories"),
                    help="hellobuh (default: unchanged) or buhstories (its own store, scripts/buhstories_metrics.py)")
    a = ap.parse_args()
    if a.channel == "buhstories":
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import buhstories_metrics
        code, msg = buhstories_metrics.cmd_import(load_answer(a.answer), a.report_only)
        print(msg)
        return code
    ans = load_answer(a.answer)
    done = json.loads((UP / "uploads.json").read_text())
    by_id = {v["video_id"]: k for k, v in done.items() if v.get("video_id")}
    studio_path = UP / "studio.json"
    studio = json.loads(studio_path.read_text()) if studio_path.exists() else {}
    date = str(ans.get("collected_at", ""))[:10]
    rows, unknown = [], []
    for v in ans.get("videos", []):
        name = by_id.get(v.get("id"))
        if not name:
            unknown.append(f"{v.get('id')} {v.get('title', '')[:40]}")
            continue
        views, subs = num(v.get("views")) or 0, num(v.get("subs_gained")) or 0
        entry = {k: val for k, val in v.items() if k not in ("id", "title")}
        entry.update({"subs": int(subs), "views": int(views), "date": date})
        studio[name] = entry
        r3 = (v.get("retention_pct") or {}).get("3s")
        rows.append((v.get("published", ""), name, int(views), num(v.get("viewed_pct")), num(v.get("avg_pct_viewed")),
                     num(r3), 1000 * subs / views if views else 0, num((v.get("traffic_pct") or {}).get("shorts_feed"))))
    f = lambda x, w, p=0: ("-" if x is None else f"{x:.{p}f}").rjust(w)
    print(f"{'short':20} {'published':16} {'views':>7} {'viewed%':>7} {'avg%':>5} {'ret3s':>5} {'subs/1k':>7} {'feed%':>5}")
    for pub, name, views, vp, ap_, r3, spk, feed in sorted(rows):
        print(f"{name:20} {str(pub)[:16]:16} {views:>7} {f(vp, 7)} {f(ap_, 5)} {f(r3, 5)} {f(spk, 7, 2)} {f(feed, 5)}")
    if unknown:
        print("not in uploads.json (uploaded by hand?):", "; ".join(unknown))
    if ans.get("couldnt_read"):
        print("the extension couldn't read:", "; ".join(map(str, ans["couldnt_read"])))
    if a.report_only:
        return 0
    studio["_"] = ("Per Short, from YouTube Studio via Claude in Chrome (docs/studio-metrics-prompt.md, "
                   "scripts/studio_import.py) or by hand. subs/views feed family_scores (Studio's count beats the "
                   "lagging API); the rest is for the numbers check.")
    studio_path.write_text(json.dumps(studio, indent=1, ensure_ascii=False) + "\n")
    if ans.get("channel"):
        (UP / "studio_channel.json").write_text(json.dumps({"collected_at": ans.get("collected_at"), **ans["channel"]},
                                                           indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {studio_path.relative_to(UP.parent)} ({len(rows)} Shorts)" + (" + uploads/studio_channel.json" if ans.get("channel") else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
