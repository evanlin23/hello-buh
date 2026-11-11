#!/usr/bin/env python3
# python3 scripts/voice_bridge_31.py stories/<name>   (thirty_one_raids run 1; see stories/thirty_one_raids/NEXT.md)
# Voice a story with tts.py (cast refs, structured prompt), one model for everyone (no fallback: the drift rule), and
# keep each raw take in voice_cast.py's layout (voices.json + voice/<req>_take.f32) so `voice_check.py --resplit`
# can cut it at the quietest points.
import json, pathlib, sys
import numpy as np
sys.path.insert(0, '/home/user/hello-buh/scripts')
import tts
tts.MODELS = ['gemini-3.1-flash-tts-preview']
sd = pathlib.Path(sys.argv[1]); story = json.loads((sd / 'story.json').read_text())
first = {r['lines'][0]: r for r in story['requests']}
cs = tts.resolve(story.get('cast'))
reqs, orig_cut = [], tts.cut
def cut(x, texts):
    return orig_cut(x, texts)
orig_take = tts.take
def take(scene, lines, cs_):
    r = first[lines[0][1]]
    raw = {}
    def grab(x, texts): raw['x'] = x; return orig_cut(x, texts)
    tts.cut = grab
    # one model per character (owner: voice drift): the narrator on 2.5-flash, Grandpa on 3.1 (his cached take)
    tts.MODELS = ['gemini-3.1-flash-tts-preview']   # one model for every character (owner: voice drift)
    try: out = orig_take(scene, lines, cs_)
    finally: tts.cut = orig_cut
    raw['x'].astype(np.float32).tofile(sd / 'voice' / f"{r['id']}_take.f32")
    reqs.append({"id": r['id'], "direction": scene, "speakers": {w: cs[w]['voice'] for w in r['speakers']}, "lines": [[w, lid, t] for w, lid, t, _ in lines]})
    return out
tts.take = take
tts.run_story(sd)
reqs.sort(key=lambda q: [r['id'] for r in story['requests']].index(q['id']))
(sd / 'voices.json').write_text(json.dumps(reqs, indent=1))
print(tts.STATS, [q['id'] for q in reqs])
