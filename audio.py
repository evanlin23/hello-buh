"""Rebuild the stunt's game audio from a bot recording and the game's own sound files.

The server doesn't send a player the sounds that player causes (the vanilla client plays those
itself), so we play them the way the client would: from the recorded events and the per-tick
pose. Vanilla volumes and pitches come from sounds.json; the files from Mojang's asset CDN
(sha1-checked, cached in work/sounds). Loudness is normalized later in edit.py (-18 LUFS).

  python3 audio.py work/x.rec.json work/x.wav [stories/<name>]
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
        if v.get("type") == "event":   # points at another sound event (parrot imitations), not a file
            return self.play(v["name"], t, volume * v.get("volume", 1.0), pitch * v.get("pitch", 1.0))
        f = asset(f"minecraft/sounds/{v['name']}.ogg")
        x = decode(f, pitch * v.get("pitch", 1.0)) * volume * v.get("volume", 1.0)
        i = int(t * SR)
        n = min(len(x), len(self.buf) - i)
        if n > 0:
            self.buf[i:i + n] += x[:n]


def main(rec_path, out_path, story_dir=None):
    rec = json.loads(pathlib.Path(rec_path).read_text())
    poses, tl = rec["poses"], rec["timeline"]
    seconds = len(poses) * TICK
    m = Mixer(seconds, seed=len(poses))
    ev = {e["event"]: e for e in tl if e["event"] not in ("health",)}
    sound_events = [e for e in tl if e["event"] == "sound"]
    if sound_events or any(e["event"] == "hurt" for e in tl):   # current recordings: the harness logs every sound with its tick
        auto = any(e["event"] == "hurt" for e in tl)
        if auto:   # real damage events: play hurt/death sounds from them, not hand-placed ones
            sound_events = [e for e in sound_events if not e["sound"].startswith(("entity.player.hurt", "entity.player.death"))]
            player_damage_sounds(m, tl)
        for e in sound_events:
            m.play(e["sound"], e["t"] / 1000, volume=e.get("volume", 1.0), pitch=e.get("pitch", 1.0))
        if any(e["event"] == "line" for e in tl):   # a story: every visible event gets its vanilla sound (scripts/onscreen_sfx.py)
            sys.path.insert(0, str(ROOT / "scripts"))
            import onscreen_sfx
            rec["_path"] = str(rec_path)
            for t, snd, vol, pitch, what in onscreen_sfx.fills(rec, story_dir or onscreen_sfx.story_dir_of(rec), m.defs):
                m.play(snd, t, volume=vol, pitch=pitch)
                print(f"on-screen sound {t:6.2f}s {snd} ({what})")
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


EFFECT_SOUND = {"hurt": "entity.player.hurt", "burning": "entity.player.hurt_on_fire", "drowning": "entity.player.hurt_drown",
                "freezing": "entity.player.hurt_freeze", "poking": "entity.player.hurt_sweet_berry_bush", "thorns": "enchant.thorns.hit"}


def player_damage_sounds(m, tl):
    """Vanilla LivingEntity.hurt: a hit plays the damage type's effect sound (DamageEffects), or the
    death sound instead on the killing hit; fall damage also plays small_fall/big_fall (> 4 dmg).
    Voice pitch is (r - r) * 0.2 + 1."""
    import zipfile
    jar = zipfile.ZipFile(next((WORK / "client").glob("1.21.11.jar")))
    effects = {}
    hp, deaths = 20.0, [e["t"] for e in tl if e["event"] == "death"]
    for e in tl:
        if e["event"] == "hurt":
            typ = e.get("type", "generic")
            if typ not in effects:
                try:
                    effects[typ] = json.loads(jar.read(f"data/minecraft/damage_type/{typ}.json")).get("effects", "hurt")
                except KeyError:
                    effects[typ] = "hurt"
            t = e["t"] / 1000
            pitch = (m.rng.random() - m.rng.random()) * 0.2 + 1.0
            if any(abs(d - e["t"]) <= 50 for d in deaths):
                m.play("entity.player.death", t, pitch=pitch)
            else:
                m.play(EFFECT_SOUND.get(effects[typ], "entity.player.hurt"), t, pitch=pitch)
            if typ == "fall":
                after = next((x["health"] for x in tl if x["event"] == "health" and x["t"] >= e["t"]), hp)
                m.play("entity.player.big_fall" if hp - after > 4 else "entity.player.small_fall", t)
        if e["event"] == "health" and e.get("health", 0) > 0:
            hp = e["health"]
    # a death with no damage packet (old recordings): still play the death sound
    for d in deaths:
        if not any(x["event"] == "hurt" and abs(x["t"] - d) <= 50 for x in tl):
            m.play("entity.player.death", d / 1000)


def finish(m, seconds, out_path):
    x = m.buf[: int(seconds * SR)]
    peak = float(np.max(np.abs(x))) or 1.0
    x = (x / peak * 0.7).astype(np.float32)          # leave the real level-setting to edit.py
    stereo = np.repeat(x[:, None], 2, axis=1)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", out_path],
                   input=stereo.tobytes(), check=True)
    print("wrote", out_path, f"{seconds:.2f}s")


if __name__ == "__main__":
    main(*sys.argv[1:4])   # [story dir]: the story the key words come from (default: the stunt's edit.story)
