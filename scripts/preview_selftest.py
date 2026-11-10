"""Self-test for scripts/preview.py's frame map (run it after changing edit.py's timing, the hook or speed spans):
  python3 scripts/preview_selftest.py <stunt> <rec.json> <game.wav>
Timing proof: frames that encode their own index as a flat colour, edited twice by the current edit.py:
dense (every frame real, like a full render) vs preview.py's sparse set (+ hardlinks); compare the preview
frames (every stride-th) with the dense edit's frames at the same output index."""
import sys, json, subprocess, os, pathlib, shutil, numpy as np
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
os.chdir(pathlib.Path(__file__).resolve().parent.parent)
import preview as p  # noqa: E402
stunt, rec_path = sys.argv[1], sys.argv[2]
W = pathlib.Path("work/preview_synth")
shutil.rmtree(W, ignore_errors=True); W.mkdir()
rec = json.load(open(rec_path))
ea = subprocess.run(["node", "scripts/edit_args.js", stunt], capture_output=True, text=True).stdout.rstrip("\n").split("\n")
edit = json.loads(subprocess.run(["node", "-e", f"console.log(JSON.stringify(require('./stunts/{stunt}').edit))"], capture_output=True, text=True).stdout)
pl = p.Plan(stunt, rec, p.edit_parse(ea), edit)
g = p.marks_for(pl); sf = {F for _, fs in g for F in fs}
need = set()
for F in range(pl.total):
    if F % 5 and F not in sf: continue
    k, K = pl.what(F)
    if k in ("hook", "body"): need.update(pl.src_of_warped(K))
col = lambda i: ((i // 256) * 16 + 8, ((i // 16) % 16) * 16 + 8, (i % 16) * 16 + 8)
dense, sparse = W / "dense", W / "sparse"; dense.mkdir(); sparse.mkdir()
for i in range(pl.n_src):
    Image.new("RGB", (360, 337), col(i)).save(dense / f"f{i:05d}.png")
for i in sorted(need): os.link(dense / f"f{i:05d}.png", sparse / f"f{i:05d}.png")
p.fill(sparse, range(pl.n_src), need)
for d in (dense, sparse):
    subprocess.run(["python3", "edit.py", "--frames", str(d / "f%05d.png"), "--fps", "60", "--out_fps", "60", "--timeline", rec_path,
                    "--audio", sys.argv[3], *ea, "--preview", "--out", str(W / f"{d.name}.mp4")], check=True, capture_output=True)
def dec(path, vf):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", vf + ",scale=36:64", "-fps_mode", "passthrough", "-pix_fmt", "rgb24", "-f", "rawvideo", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, 64, 36, 3).astype(int)
a = dec(str(W / "dense.mp4"), "null")
b = dec(str(W / "sparse.mp4"), "select='not(mod(n\\,5))',setpts=N/12/TB")
print("dense edit", len(a), "frames; sparse preview", len(b), "frames; plan", pl.total)
same, diff = 0, []
for k in range(len(b)):
    da = np.abs(a[5 * k] - b[k]).mean()
    if da < 3: same += 1
    else: diff.append((k, 5 * k, round(da, 1)))
# decoded source index in the middle of the game view (where no overlay sits most of the time)
idx = lambda px: int(px[0] // 16 * 256 + px[1] // 16 * 16 + px[2] // 16)
print('mismatch detail (F, dense src, preview src):', [(F, idx(a[F][30, 18]), idx(b[k][30, 18])) for k, F, _ in diff[:20]])
print(f"preview frames equal to the dense edit's frame 5k: {same}/{len(b)}; different: {diff[:15]}")
print("source index shown at some output frames (dense / preview):", [(5 * k, idx(a[5 * k][30, 18]), idx(b[k][30, 18])) for k in range(0, len(b), max(1, len(b) // 12))])
c = dec(str(W / "sparse.mp4"), "null")
sh = sorted(F for F in sf if F < min(len(a), len(c)))
bad = [(F, idx(a[F][30, 18]), idx(c[F][30, 18])) for F in sh if np.abs(a[F] - c[F]).mean() >= 3]
print(f"sheet frames equal to the dense edit: {len(sh) - len(bad)}/{len(sh)}; different: {bad[:10]}")
shutil.rmtree(W, ignore_errors=True)
sys.exit(1 if diff or bad else 0)
