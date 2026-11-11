"""Rebuild the stunt's game audio from a bot recording and the game's own sound files.

The server doesn't send a player the sounds that player causes (the vanilla client plays those
itself), so we play them the way the client would: from the recorded events and the per-tick
pose. Vanilla volumes and pitches come from sounds.json; the files from Mojang's asset CDN
(sha1-checked, cached in work/sounds). Loudness is normalized later in edit.py (-18 LUFS).

  python3 audio.py work/x.rec.json work/x.wav [stories/<name>]
"""
import hashlib
import json
import math
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


def gain(volume, file_volume=1.0):
    """A sound's playback gain, as vanilla's SoundEngine.calculateVolume: clamp(volume x file volume, 0, 1)."""
    return min(max(float(volume) * float(file_volume), 0.0), 1.0)


# finish(): a track whose peak is at most one full-scale sound is peak-normalised as before; louder pile-ups (500 TNT
# going off together) are scaled as if their peak were LIMIT_FROM and the excess is limited, like the OpenAL Soft
# output limiter the game's sound runs through, instead of turning the whole track down to fit the pile-up
LIMIT_FROM = 1.0
OUT_PEAK = 0.7


def limit(x, ceiling, attack=0.005, release=0.12):
    """A look-ahead peak limiter (numpy): the gain dips to keep |x| <= ceiling, reaching its floor `attack` s ahead of
    the peak and recovering over `release` s. Signals that never pass the ceiling come back unchanged."""
    a = np.abs(x)
    if not len(x) or float(a.max()) <= ceiling:
        return x
    blk = max(1, int(attack * SR))
    nb = -(-len(x) // blk)
    pad = np.zeros(nb * blk, np.float32)
    pad[:len(x)] = a
    need = np.minimum(1.0, ceiling / np.maximum(pad.reshape(nb, blk).max(1), 1e-12))
    need = np.minimum(need, np.concatenate([need[1:], [1.0]]))        # look ahead one block
    need = np.minimum(need, np.concatenate([[1.0], need[:-1]]))       # and hold one behind
    g, k = np.empty(nb), math.exp(-blk / (release * SR))
    cur = 1.0
    for i, n in enumerate(need):                                       # instant down, smooth recovery
        cur = n if n < cur else n + (cur - n) * k
        g[i] = cur
    gs = np.interp(np.arange(len(x)), np.arange(nb) * blk + blk / 2, g).astype(np.float32)
    gs = np.minimum(gs, np.repeat(need, blk)[:len(x)].astype(np.float32))   # never over the block's own need
    return np.clip(x * gs, -ceiling, ceiling)


class Mixer:
    def __init__(self, seconds, seed):
        self.buf = np.zeros(int(seconds * SR) + SR, dtype=np.float32)
        self.rng = random.Random(seed)
        self.defs = json.loads(asset("minecraft/sounds.json").read_text())

    def play(self, event, t, volume=1.0, pitch=1.0):
        """Play a sound event at time t (s) the way the client does: pick a variant, apply its
        volume/pitch on top of the event's. Our own sounds are not distance-attenuated (lib/chain.js
        attenuates the relayed server sounds itself).

        The gain is min(volume x the file's sounds.json volume, 1): vanilla's SoundEngine.calculateVolume clamps it
        to [0, 1]; a volume over 1 only widens the hearing range (16 x volume blocks). Unclamped, an explosion (volume
        4) mixed 12 dB over every other sound and finish() then pushed the rest of the track down to match
        (chain_reaction: its game audio sat at -56 to -68 dB under 500 blasts)."""
        variants = self.defs[event]["sounds"]
        if not variants:   # an event with no files (entity.snow_golem.ambient): vanilla plays nothing
            return
        v = self.rng.choice(variants)
        v = {"name": v} if isinstance(v, str) else v
        if v.get("type") == "event":   # points at another sound event (parrot imitations), not a file
            return self.play(v["name"], t, volume * v.get("volume", 1.0), pitch * v.get("pitch", 1.0))
        f = asset(f"minecraft/sounds/{v['name']}.ogg")
        x = decode(f, pitch * v.get("pitch", 1.0)) * gain(volume, v.get("volume", 1.0))
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
    for t, snd, vol in legacy_sounds(rec):
        m.play(snd, t, volume=vol)
    return finish(m, seconds, out_path)


def legacy_sounds(rec):
    """An old recording with no logged sounds: the water-bucket clutch's sounds rebuilt from the poses and events ->
    [(t, sound, volume)]. A boat clutch (`mounted` marks: the player got into a boat) gets no bucket or splash: the bucket's
    pour on the boat placement, slowed by the slow-mo, was the owner's "sounds like a fart" at the end of boat_clutch
    (r:r4df33c; lib/hb/banned_sfx.json)."""
    poses, tl = rec["poses"], rec["timeline"]
    ev = {e["event"]: e for e in tl if e["event"] not in ("health",)}
    out = []
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
            out.append((b[0] * TICK, "block.snow.step" if b[2] > floor_y + 2 else "block.grass.step", 0.15))
    # Jump off the pillar: the client plays the step sound of the block you jump from.
    for a, b in zip(poses, poses[1:]):
        if b[2] - a[2] > 0.3:
            out.append((a[0] * TICK, "block.snow.step", 0.15))
            break
    water = "placed" in ev and "mounted" not in ev
    if water:
        out.append((ev["placed"]["t"] / 1000, "item.bucket.empty", 1.0))
        # Entering the water at speed: vanilla's high-speed splash (player.splash.high_speed).
        t_place = ev["placed"]["t"] / 1000
        for a, b in zip(poses, poses[1:]):
            if b[0] * TICK > t_place and b[2] < floor_y + 1.0:
                out.append((b[0] * TICK, "entity.player.splash.high_speed", 1.0))
                break
    if "scooped" in ev and ev["scooped"].get("ok"):
        out.append((ev["scooped"]["t"] / 1000, "item.bucket.fill", 1.0))
    return out


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


def master(x):
    """The mixed track at a fixed headroom: peak-normalised to OUT_PEAK when its peak is at most LIMIT_FROM (one
    full-scale sound), else scaled as if it were LIMIT_FROM with the pile-up's excess limited (see LIMIT_FROM)."""
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    peak = peak or 1.0
    return limit((x * (OUT_PEAK / min(peak, LIMIT_FROM))).astype(np.float32), OUT_PEAK).astype(np.float32)


def finish(m, seconds, out_path):
    x = master(m.buf[: int(seconds * SR)])           # leave the real level-setting to edit.py
    stereo = np.repeat(x[:, None], 2, axis=1)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", out_path],
                   input=stereo.tobytes(), check=True)
    print("wrote", out_path, f"{seconds:.2f}s")


if __name__ == "__main__":
    main(*sys.argv[1:4])   # [story dir]: the story the key words come from (default: the stunt's edit.story)
