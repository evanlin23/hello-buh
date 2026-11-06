"""Rebuild the stunt's game audio from a bot recording and the game's own sound files.

The server doesn't send a player the sounds that player causes (the vanilla client plays those
itself), so we play them the way the client would: from the recorded events and the per-tick
pose. Vanilla volumes and pitches come from sounds.json; the files from Mojang's asset CDN
(sha1-checked, cached in work/sounds). Loudness is normalized later in edit.py (-18 LUFS).

  python3 audio.py work/x.rec.json work/x.wav
"""
import hashlib
import json
import pathlib
import random
import subprocess
import sys
import urllib.request

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent
WORK = ROOT / "work"
SR = 48000
TICK = 0.05


def asset(name):
    """Bytes of an asset (e.g. 'minecraft/sounds.json'), cached and sha1-checked."""
    idx = json.loads((WORK / "client" / "assets.json").read_text())["objects"]
    h = idx[name]["hash"]
    path = WORK / "sounds" / h
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        data = urllib.request.urlopen(f"https://resources.download.minecraft.net/{h[:2]}/{h}", timeout=60).read()
        assert hashlib.sha1(data).hexdigest() == h
        path.write_bytes(data)
    return path


def decode(path, pitch=1.0):
    """Mono float32 at SR; Minecraft pitch = playback-rate change (pitch and speed together)."""
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(int(SR / pitch)),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, dtype=np.float32)


class Mixer:
    def __init__(self, seconds, seed):
        self.buf = np.zeros(int(seconds * SR) + SR, dtype=np.float32)
        self.rng = random.Random(seed)
        self.defs = json.loads(asset("minecraft/sounds.json").read_text())

    def play(self, event, t, volume=1.0, pitch=1.0):
        """Play a sound event at time t (s) the way the client does: pick a variant, apply its
        volume/pitch on top of the event's. Our own sounds are not distance-attenuated."""
        variants = self.defs[event]["sounds"]
        v = self.rng.choice(variants)
        v = {"name": v} if isinstance(v, str) else v
        f = asset(f"minecraft/sounds/{v['name']}.ogg")
        x = decode(f, pitch * v.get("pitch", 1.0)) * volume * v.get("volume", 1.0)
        i = int(t * SR)
        n = min(len(x), len(self.buf) - i)
        if n > 0:
            self.buf[i:i + n] += x[:n]


def main(rec_path, out_path):
    rec = json.loads(pathlib.Path(rec_path).read_text())
    poses, tl = rec["poses"], rec["timeline"]
    seconds = len(poses) * TICK
    m = Mixer(seconds, seed=len(poses))
    ev = {e["event"]: e for e in tl if e["event"] not in ("health",)}
    sound_events = [e for e in tl if e["event"] == "sound"]
    if sound_events:   # current recordings: the harness logs every sound with its tick
        for e in sound_events:
            m.play(e["sound"], e["t"] / 1000, volume=e.get("volume", 1.0), pitch=e.get("pitch", 1.0))
        return finish(m, seconds, out_path)
    # (older recordings: rebuild the clutch sounds from the poses and events below)

    # Footsteps: vanilla plays a step every ~1.67 blocks walked on the ground (distance * 0.6 > 1).
    # On the pillar top the block underfoot is the snow cap; on the floor it's grass.
    walked, floor_y = 0.0, min(p[2] for p in poses)
    for a, b in zip(poses, poses[1:]):
        on_ground = abs(b[2] - a[2]) < 1e-4
        if not on_ground:
            continue
        walked += 0.6 * ((b[1] - a[1]) ** 2 + (b[3] - a[3]) ** 2) ** 0.5
        if walked > 1.0:
            walked = 0.0
            m.play("block.snow.step" if b[2] > floor_y + 2 else "block.grass.step", b[0] * TICK, volume=0.15)
    # Jump off the pillar: the client plays the step sound of the block you jump from.
    for a, b in zip(poses, poses[1:]):
        if b[2] - a[2] > 0.3:
            m.play("block.snow.step", a[0] * TICK, volume=0.15)
            break

    if "placed" in ev:
        m.play("item.bucket.empty", ev["placed"]["t"] / 1000)
    # Entering the water at speed: vanilla's high-speed splash (player.splash.high_speed).
    if "placed" in ev:
        t_place = ev["placed"]["t"] / 1000
        for a, b in zip(poses, poses[1:]):
            if b[0] * TICK > t_place and b[2] < floor_y + 1.0:
                m.play("entity.player.splash.high_speed", b[0] * TICK, volume=1.0, pitch=1.0)
                break
    if "scooped" in ev and ev["scooped"].get("ok"):
        m.play("item.bucket.fill", ev["scooped"]["t"] / 1000)

    return finish(m, seconds, out_path)


def finish(m, seconds, out_path):
    x = m.buf[: int(seconds * SR)]
    peak = float(np.max(np.abs(x))) or 1.0
    x = (x / peak * 0.7).astype(np.float32)          # leave the real level-setting to edit.py
    stereo = np.repeat(x[:, None], 2, axis=1)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", out_path],
                   input=stereo.tobytes(), check=True)
    print("wrote", out_path, f"{seconds:.2f}s")


if __name__ == "__main__":
    main(*sys.argv[1:3])
