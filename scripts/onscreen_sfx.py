"""On-screen sounds: every visible event that makes a sound in vanilla gets that sound, on its frame.

Owner, 2026-11-10: "on screen sfx as well, if needed/maybe". The harness logs the sounds the client plays
itself (steps, rain, the stunt's ctx.sound calls) but not the ones a real client would add for what the bot
does: a block broken (story_torch: 15 digs, 14 pickups, no break or pickup sound), a block placed, a door
opened, a mob hit, an item picked up, a bell rung, food eaten, TNT lit, thunder. This reads the recording's
marks and block changes, finds each such event within hearing (16 blocks, vanilla's attenuation distance) of
the camera, and checks for a `sound` mark of the right kind near it.

  python3 scripts/onscreen_sfx.py work/<stunt>.rec.json [--story stories/<name>]   # the check: events with no sound
  python3 scripts/onscreen_sfx.py <stunt>                                          # (the package's recording on hb-videos)
  python3 scripts/onscreen_sfx.py <rec> --strict     # exit 1 if a visible action would stay silent after the fills

audio.py calls fills() for story recordings (a `line` mark), so a story's game track gets the missing sounds.
Not under the narrator's key words (the caption chunks with a capitalised key word): there a minor sound
(pickup, place, dig ticks, steps, a mob's idle voice) is dropped and a causal one (a break, a door, a hit, a
death, a fuse) goes in 6 dB down. Non-story Shorts are untouched.

Owner, 2026-11-10: "The sound effects need work as well". Also detected since (the audit of thirty_one_raids,
good_boy and gold_for_the_portal: the cast is summoned Silent, so no mob made a sound on its own):
- a mob's idle voice (villager hmm, wolf bark/pant/growl, zombie groan, pillager, ravager, piglin, warden, ...):
  vanilla's Mob.baseTick timer (a 1/1000 chance per tick rising after an 80-tick reset), per mob within hearing,
  at most one every MOB_VOICE_GAP s across the mix, volume falling off with distance like vanilla
- steps of every walking mob or actor (not the camera: the harness logs those): one per 1/0.6 blocks walked
  on the ground, the mob's own step sound or the block underfoot's
- splashes and swimming: an entity (or the camera) entering water, then a swim stroke per 1/0.6 blocks in it
- barrels: open/close (they were given the wooden door's sound)
- an item picked up by anyone in hearing, not only the camera
- the scene's ambience (scenes()): night / day / indoors / cave / rain / nether / underwater, per cut, mixed by
  scripts/story_audio.py
The hotbar switch makes no sound in vanilla Java (only equipping armour does), so none is added.
"""
import gzip
import json
import math
import pathlib
import random
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
HEAR = 16.0          # blocks: vanilla sounds fade to nothing at 16 blocks (volume 1.0)
NEAR_MS = 150        # an existing sound mark within this of the event counts as its sound
FOOD = re.compile(r"apple|bread|beef|pork|chicken|mutton|rabbit|cod|salmon|cookie|melon_slice|carrot|potato|beetroot|stew|soup|pie|berries|kelp|honey_bottle|chorus_fruit|rotten_flesh|spider_eye")
DRINK = re.compile(r"potion|milk_bucket|honey_bottle")

# vanilla SoundType by block name (the common ones; anything else falls back to stone)
GROUPS = [
    (r"^(grass_block|dirt|coarse_dirt|podzol|mycelium|farmland|dirt_path|clay|short_grass|tall_grass|fern|large_fern|.*_leaves|.*_sapling|hay_block|sugar_cane|dead_bush|.*_flower|dandelion|poppy|.*tulip|allium|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony)$", "grass"),
    (r"^(wheat|carrots|potatoes|beetroots|melon_stem|pumpkin_stem)$", "crop"),
    (r"gravel", "gravel"),
    (r"sand$|^sandstone|sand_", "sand"),
    (r"snow", "snow"),
    (r"wool|carpet", "wool"),
    (r"^(bamboo_.*)$", "bamboo_wood"),
    (r"^cherry_", "cherry_wood"),
    (r"^(crimson|warped)_(planks|stem|hyphae|door|trapdoor|fence|fence_gate|slab|stairs|sign|button|pressure_plate)", "nether_wood"),
    (r"planks|_log$|_wood$|fence|_door$|trapdoor|chest|barrel|crafting_table|bookshelf|_stairs$|_slab$|sign|lectern|composter|note_block|jukebox|loom|cartography|fletching|smithing|beehive|bee_nest", "wood"),
    (r"glass|ice$|sea_lantern|beacon", "glass"),
    (r"^(iron_block|gold_block|diamond_block|emerald_block|iron_bars|iron_door|iron_trapdoor|cauldron|hopper|anvil|chipped_anvil|damaged_anvil|bell|blast_furnace|smoker|lightning_rod)$", "metal"),
    (r"copper", "copper"),
    (r"^deepslate|cobbled_deepslate|polished_deepslate", "deepslate"),
    (r"netherrack", "netherrack"),
    (r"nether_brick", "nether_bricks"),
    (r"ladder", "ladder"),
    (r"lantern", "lantern"),
    (r"moss", "moss"),
    (r"mud", "mud"),
    (r"slime", "slime_block"),
    (r"honey_block", "honey_block"),
    (r"scaffolding", "scaffolding"),
    (r"^tuff", "tuff"),
    (r"amethyst", "amethyst_block"),
    (r"sculk", "sculk"),
]
FLUIDS = {"water", "lava", "bubble_column"}
AIRS = {"air", "cave_air", "void_air", "unknown"}
# a sound mark of this kind near the event means it already has its sound
HAS = {"break": r"\.break$|explode", "place": r"\.place$", "door": r"door|gate", "pickup": r"pickup", "hurt": r"\.hurt|attack",
       "death": r"\.death", "bell": r"bell", "chest": r"chest|barrel", "eat": r"eat|drink|burp", "primed": r"primed|fuse", "thunder": r"thunder",
       "hit": r"\.hit$", "step": r"\.step$", "voice": r"\.ambient$|growl|pant|whine|celebrate|roar|\.horn", "splash": r"splash", "swim": r"swim|splash"}
MINOR = {"pickup", "place", "hit", "step", "voice", "swim"}
MOB_VOICE_GAP = 1.2   # s: at most one idle mob voice this often in the whole mix (ten villagers in hearing are a choir)
STEP_EVERY = 1.0      # vanilla Entity.move: moveDist += horizontal * 0.6; a step each time it passes the next whole number
NOT_LIVING = re.compile(r"item|frame|minecart|armor_stand|marker|display|interaction|painting|arrow|orb|falling_block|^tnt$|firework|"
                        r"lightning|cloud|bobber|eye_of_ender|snowball|egg$|pearl|potion|trident|boat|raft|leash|wind_charge|fireball|skull")
WATER = {"water", "bubble_column", "kelp", "kelp_plant", "seagrass", "tall_seagrass"}
NO_COVER = re.compile(r"leaves|glass|pane|fence|wall_torch|^torch|lantern|chain|bars|vine|flower|sapling|grass$|fern|rail|carpet|button|sign|banner|cobweb|scaffolding|candle")


def defs():
    sys.path.insert(0, str(ROOT))
    import audio
    return json.loads(audio.asset("minecraft/sounds.json").read_text())


def group(name):
    for rx, g in GROUPS:
        if re.search(rx, name):
            return g
    return "stone"


def block_sound(name, act, known):
    for ev in (f"block.{name}.{act}", f"block.{group(name)}.{act}"):
        if ev in known:
            return ev
    return f"block.stone.{act}"


def door_sound(name, opening, known):
    kind = "trapdoor" if "trapdoor" in name else "fence_gate" if "fence_gate" in name else "door"
    mat = "iron" if name.startswith("iron_") else "copper" if "copper" in name else {"bamboo_wood": "bamboo_wood", "cherry_wood": "cherry_wood", "nether_wood": "nether_wood"}.get(group(name), "wooden")
    act = "open" if opening else "close"
    for ev in (f"block.{mat}_{kind}.{act}", f"block.wooden_{kind}.{act}", f"block.{kind}.{act}", f"block.fence_gate.{act}"):
        if ev in known:
            return ev
    return f"block.wooden_door.{act}"


def load_rec(path):
    p = pathlib.Path(path)
    if not p.exists():   # a stunt name: the package on the videos branch
        p = ROOT.parent / "hb-videos" / "shorts" / str(path) / "recording.json.gz"
    raw = p.read_bytes()
    return json.loads(gzip.decompress(raw) if p.suffix == ".gz" else raw), p


def _pose_at(poses, tick):
    if not poses:
        return None
    i = min(max(0, tick - poses[0][0]), len(poses) - 1)
    return poses[i]


def _dist(p, x, y, z):
    return ((p[1] - x) ** 2 + (p[2] + 1.62 - y) ** 2 + (p[3] - z) ** 2) ** 0.5


def _ent_at(ents, eid, tick):
    best = None
    for r in ents.get(eid, ()):
        if r[0] <= tick or best is None:
            best = r
        if r[0] > tick:
            break
    return best


def key_windows(rec, story_dir):
    """[(t0, t1)] seconds (recording time) of every caption chunk that holds a key word (CAPITALISED or a number)."""
    if not story_dir or not (pathlib.Path(story_dir) / "voice" / "voice.json").exists():
        return []
    voice = json.loads((pathlib.Path(story_dir) / "voice" / "voice.json").read_text())["lines"]
    out = []
    for e in rec["timeline"]:
        if e["event"] != "line" or e.get("id") not in voice:
            continue
        v, t = voice[e["id"]], e["t"] / 1000
        for cap, (a, b) in zip(v.get("captions", []), v.get("chunks", [])):
            if any((len(c) > 1 and c.isupper()) or c.isdigit() for c in ("".join(ch for ch in w if ch.isalnum()) for w in cap.split())):
                out.append((t + a - 0.05, t + b + 0.05))
    return out


def story_dir_of(rec):
    """stories/<name> for a story stunt (edit.story in the stunt module), or None."""
    st = rec.get("stunt") or ""
    js = ROOT / "stunts" / f"{st}.js"
    if js.exists():
        m = re.search(r"story:\s*'([^']+)'", js.read_text())
        if m and (ROOT / m.group(1)).exists():
            return str(ROOT / m.group(1))
    cand = ROOT / "stories" / st.replace("story_", "", 1)
    return str(cand) if cand.exists() else None


def in_view(p, x, y, z, cone=50):
    """Is (x, y, z) inside the camera's view (a cone around its look direction; pose = [tick, x, y, z, yaw, pitch])?"""
    dx, dy, dz = x - p[1], y - (p[2] + 1.62), z - p[3]
    d = math.sqrt(dx * dx + dy * dy + dz * dz)
    if d < 1.5:
        return True
    v = (-math.sin(p[4]) * math.cos(p[5]), math.sin(p[5]), -math.cos(p[4]) * math.cos(p[5]))
    return (dx * v[0] + dy * v[1] + dz * v[2]) / d >= math.cos(math.radians(cone))


def blocks(rec, at):
    """scripts/rec_blocks.js: {changes, at: [block name at [tick, x, y, z]]} for the recording."""
    return json.loads(subprocess.run(["node", str(ROOT / "scripts" / "rec_blocks.js")], input=json.dumps({"rec": rec["_path"], "at": at}),
                                     capture_output=True, text=True, check=True, cwd=ROOT).stdout)


def living(typ, known):
    return typ == "player" or (not NOT_LIVING.search(typ) and f"entity.{typ}.hurt" in known)


def _movers(rec, poses, ents, k0, k1, known):
    """Step candidates of every walking entity within hearing ([{tick, id, type, x, y, z}]) and water samples of every
    moving entity and the camera ([{tick, id, type, x, y, z, moved}]), between ticks k0 and k1."""
    steps, wet = [], []
    for eid, rows in ents.items():
        typ = rows[0][2]
        if not living(typ, known):
            continue
        walk, nxt, prev = 0.0, STEP_EVERY, None
        for r in rows:
            if not (k0 <= r[0] <= k1):
                prev = r
                continue
            p = _pose_at(poses, r[0])
            near = p is not None and _dist(p, r[3], r[4] + 1, r[5]) <= HEAR
            if prev is not None and r[0] == prev[0] + 1:
                h = math.hypot(r[3] - prev[3], r[5] - prev[5])
                moved = math.sqrt(h * h + (r[4] - prev[4]) ** 2)
                if h > 2.5:   # a teleport (a cut): no steps across it
                    walk, nxt = 0.0, STEP_EVERY
                elif abs(r[4] - prev[4]) < 0.6 and h > 0.005:   # walking (on a slope too; a jump or fall rises or drops faster)
                    walk += 0.6 * h
                    if walk > nxt:
                        nxt = int(walk) + STEP_EVERY
                        if near:
                            steps.append({"tick": r[0], "id": eid, "type": typ, "x": r[3], "y": r[4], "z": r[5]})
                if near and moved > 0.02 and r[0] % 2 == 0:
                    wet.append({"tick": r[0], "id": eid, "type": typ, "x": r[3], "y": r[4], "z": r[5], "moved": moved * 2})
            prev = r
    cam = "self"
    for a, b in zip(poses, poses[1:]):   # the camera itself (a dog swimming to the island): splashes and strokes only
        if k0 <= b[0] <= k1 and b[0] % 2 == 0:
            m = math.dist(a[1:4], b[1:4])
            if 0.02 < m < 2.5:
                wet.append({"tick": b[0], "id": cam, "type": cam, "x": b[1], "y": b[2], "z": b[3], "moved": m * 2})
    return steps, wet


def _wolf_voice(row, rng):
    meta = row[9] if len(row) > 9 and isinstance(row[9], dict) else {}
    if meta.get("angry"):
        return "entity.wolf.growl"
    return ("entity.wolf.pant" if rng.random() < 0.5 else "entity.wolf.ambient") if rng.randrange(3) == 0 else "entity.wolf.ambient"


def _voices(rec, poses, ents, k0, k1, known):
    """[(t ms, type, xyz, sound)]: vanilla Mob.baseTick's idle-sound timer (a random.nextInt(1000) < ambientSoundTime++
    roll each tick, reset to -80 after a sound) for every mob within hearing of the camera."""
    out = []
    for eid, rows in ents.items():
        typ = rows[0][2]
        if typ == "player" or not living(typ, known):
            continue
        snd = f"entity.{typ}.ambient"
        if typ != "wolf" and snd not in known:
            continue
        rng = random.Random(f"{eid}:{len(poses)}")
        ast = -rng.randrange(80)
        for r in rows:
            if not (k0 <= r[0] <= k1):
                continue
            p = _pose_at(poses, r[0])
            if p is None or _dist(p, r[3], r[4] + 1, r[5]) > HEAR:
                continue
            if rng.randrange(1000) < ast:
                ast = -80
                out.append((r[0] * 50, typ, (r[3], r[4] + 1, r[5]), _wolf_voice(r, rng) if typ == "wolf" else snd))
            else:
                ast += 1
    return sorted(out)


def scenes(rec, timeline=None):
    """The ambience of each shot: [(t0, t1, kind)] in recording seconds, one per stretch between `cut` / `time` marks.
    kind: nether | end | underwater | rain | rain_indoor | cave | indoor_night | indoor_day | night | dusk | day,
    from the camera's dimension, the clock (13000-23000 night, 12000-13000 dusk), the weather, the block at the eye
    and the 24 blocks above it (covered by anything solid: indoors; under 8+ solid blocks: a cave)."""
    tl = timeline or rec["timeline"]
    poses = rec.get("poses") or []
    if not poses:
        return []
    lines = [e["t"] for e in tl if e["event"] in ("line", "start")]
    t0 = (min(lines) - 1000) if lines else 0
    t1 = max([e["t"] for e in tl if e["event"] in ("end", "story_end")] or [len(poses) * 50])
    marks = sorted({e["t"] for e in tl if e["event"] in ("cut", "time") and t0 < e["t"] < t1} | {t0, t1})
    segs = [(a, b) for a, b in zip(marks, marks[1:]) if b - a >= 100]
    clock = [(-1e12, rec.get("time", 6000))] + [(e["t"], e["time"]) for e in tl if e["event"] == "time" and "time" in e]
    weather = [(-1e12, rec.get("weather", "clear"))] + [(e["t"], e.get("weather") or e.get("value")) for e in tl if e["event"] == "weather"]
    dim = str(rec.get("dimension", "overworld"))
    q, probe = [], []
    for a, b in segs:
        p = _pose_at(poses, ((a + b) // 2) // 50)
        x, y, z = math.floor(p[1]), math.floor(p[2] + 1.62), math.floor(p[3])
        probe.append(len(q))
        q += [[p[0], x, y, z]] + [[p[0], x, y + k, z] for k in range(1, 25)]
    at = blocks(rec, q)["at"] if q else []
    out = []
    for (a, b), i in zip(segs, probe):
        if out and b - a < 800 and out[-1][1] == a / 1000:   # a flash of a shot keeps the scene around it
            out[-1] = (out[-1][0], b / 1000, out[-1][2])
            continue
        eye, above = at[i], at[i + 1:i + 25]
        solid = [n for n in above if n not in AIRS and n not in FLUIDS and not NO_COVER.search(n)]
        tod = next(v for t, v in reversed(clock) if t <= a) % 24000
        rain = next(v for t, v in reversed(weather) if t <= a) in ("rain", "thunder")
        if "nether" in dim:
            kind = "nether"
        elif "end" in dim:
            kind = "end"
        elif eye in WATER:
            kind = "underwater"
        elif rain:
            kind = "rain_indoor" if solid else "rain"
        elif len(solid) >= 8:
            kind = "cave"
        elif solid:
            kind = "indoor_night" if 12500 <= tod < 23200 else "indoor_day"
        else:
            kind = "night" if 13000 <= tod < 23000 else "dusk" if 12000 <= tod < 13000 else "day"
        out.append((a / 1000, b / 1000, kind))
    return out


def events(rec, known=None):
    """Every visible event that makes a sound in vanilla: dicts {t (s), kind, sound, volume, pitch, what, dist, has}."""
    known = known or defs()
    tl, poses = rec["timeline"], rec.get("poses") or []
    rng = random.Random(len(poses))
    sounds = [(e["t"], e.get("sound", "")) for e in tl if e["event"] == "sound"]
    lines = [e["t"] for e in tl if e["event"] in ("line", "start")]
    t_from = (min(lines) - 1000) if lines else 0
    t_to = max([e["t"] for e in tl if e["event"] in ("end", "story_end")] or [len(poses) * 50])
    ents = {}
    for r in rec.get("entities") or []:
        ents.setdefault(r[1], []).append(r)
    digs = [e for e in tl if e["event"] == "dig"]
    acts = [e for e in tl if e["event"] == "block_action"]
    q = [[e["t"] // 50, e["x"], e["y"], e["z"]] for e in digs] + [[e["t"] // 50, e["x"], e["y"], e["z"]] for e in acts]
    steps, wet = _movers(rec, poses, ents, t_from // 50, t_to // 50, known)
    q0 = len(q)
    q += [[s["tick"], math.floor(s["x"]), math.floor(s["y"] - 0.2), math.floor(s["z"])] for s in steps]
    q1 = len(q)
    q += [[w["tick"], math.floor(w["x"]), math.floor(w["y"] + 0.3), math.floor(w["z"])] for w in wet]
    rb = blocks(rec, q)
    dig_name = {id(e): n for e, n in zip(digs, rb["at"][:len(digs)])}
    act_name = {id(e): n for e, n in zip(acts, rb["at"][len(digs):q0])}
    out = []

    def add(t_ms, kind, sound, what, xyz=None, volume=1.0, pitch=1.0, falloff=False):
        if not (t_from <= t_ms <= t_to):
            return
        p = _pose_at(poses, t_ms // 50)
        d = _dist(p, *xyz) if (p and xyz) else 0.0
        if d > HEAR:
            return
        rx = re.compile(HAS[kind])
        # (the harness logs only the camera's own steps: an actor's step is never one of them)
        has = kind != "step" and any(abs(st - t_ms) <= NEAR_MS and rx.search(sn) for st, sn in sounds)
        if falloff:   # vanilla's linear attenuation over 16 blocks (the fills of the older kinds play at full volume)
            volume *= max(0.05, 1 - d / HEAR)
        out.append({"t": t_ms / 1000, "kind": kind, "sound": sound, "volume": volume, "pitch": pitch, "what": what, "dist": round(d, 1), "has": has,
                    "seen": bool(p and xyz and in_view(p, *xyz))})

    # steps of walking mobs and actors (the block underfoot's step, or the mob's own: wolf, zombie, piglin, ravager, ...)
    for s, under in zip(steps, rb["at"][q0:q1]):
        if under in AIRS or under in FLUIDS or under in WATER:
            continue
        own = f"entity.{s['type']}.step"
        snd = own if own in known else block_sound(under, "step", known)
        add(s["tick"] * 50, "step", snd, f"{s['type']} step on {under}", (s["x"], s["y"], s["z"]), 0.15 if snd.startswith("block.") else 0.3,
            1.0 if snd.startswith("block.") else (rng.random() - rng.random()) * 0.1 + 1.0, True)
    # splashes into water and swim strokes in it
    state = {}
    for w, here in zip(wet, rb["at"][q1:]):
        k = w["id"]
        inside = here in WATER
        was, dist = state.get(k, (None, 0.0))
        player = w["type"] in ("player", "self")
        xyz = (w["x"], w["y"], w["z"])
        if inside and was is False:
            add(w["tick"] * 50, "splash", "entity.player.splash" if player else "entity.generic.splash", f"{w['type']} into the water", xyz, 0.5,
                (rng.random() - rng.random()) * 0.4 + 1.0, w["type"] != "self")
            dist = 0.0
        elif inside:
            dist += 0.6 * w["moved"]
            if dist > STEP_EVERY:
                dist = 0.0
                add(w["tick"] * 50, "swim", "entity.player.swim" if player else "entity.generic.swim", f"{w['type']} swimming", xyz, 0.25,
                    (rng.random() - rng.random()) * 0.4 + 1.0, w["type"] != "self")
        state[k] = (inside, dist)
    # idle voices (the cast is summoned Silent: vanilla's ambient timer, per mob within hearing)
    last_voice = -1e9
    for t_ms, typ, xyz, snd in _voices(rec, poses, ents, t_from // 50, t_to // 50, known):
        if t_ms - last_voice < MOB_VOICE_GAP * 1000:
            continue
        n0 = len(out)
        add(t_ms, "voice", snd, f"{typ} idle voice", xyz, 1.0, (rng.random() - rng.random()) * 0.2 + 1.0, True)
        if len(out) > n0:
            last_voice = t_ms

    # player digging: the hit sound every 4 ticks while mining, then the break (dig_end ok)
    broken = set()
    for i, e in enumerate(tl):
        if e["event"] != "dig":
            continue
        end = next((x for x in tl[i + 1:] if x["event"] == "dig_end"), None)
        name = dig_name.get(id(e), "stone")
        xyz = (e["x"] + 0.5, e["y"] + 0.5, e["z"] + 0.5)
        if end and end.get("ok"):
            for t in range(e["t"] + 200, end["t"] - 50, 200):
                add(t, "hit", block_sound(name, "hit", known), f"digging {name}", xyz, 0.25, 0.5)
            add(end["t"], "break", block_sound(name, "break", known), f"broke {name}", xyz, 1.0, 0.8)
            broken.add((e["x"], e["y"], e["z"]))
    # block changes: places, breaks the bot didn't dig, doors; a tick with many changes is staging (/fill), not an action
    per_tick = {}
    for c in rb["changes"]:
        per_tick[c[0]] = per_tick.get(c[0], 0) + 1
    seen_doors = set()
    for tick, x, y, z, a, b, pa, pb in rb["changes"]:
        if per_tick[tick] > 4 or a in FLUIDS or b in FLUIDS or "fire" in (a + b):
            continue
        xyz, t = (x + 0.5, y + 0.5, z + 0.5), tick * 50
        if a in AIRS and "anvil" in b:   # a falling anvil landing (the stunt drops them)
            add(t, "place", "block.anvil.land", f"{b} landed", xyz, 0.3, rng.random() * 0.1 + 0.9)
        elif a in AIRS and b not in AIRS:
            add(t, "place", block_sound(b, "place", known), f"placed {b}", xyz, 1.0, 0.8)
        elif b in AIRS and a not in AIRS and (x, y, z) not in broken:
            add(t, "break", block_sound(a, "break", known), f"{a} broke", xyz, 1.0, 0.8)
        elif a == b and "open" in pa and pa.get("open") != pb.get("open"):
            k = (tick, a, x, z)
            if k in seen_doors:
                continue
            seen_doors.add(k)
            opening = str(pb.get("open")).lower() == "true"   # (prismarine gives a bool, older dumps the string: every door read "closed")
            if b == "barrel":   # a barrel's `open` state is its lid (BarrelBlockEntity plays block.barrel.open/close, 0.5)
                add(t, "chest", f"block.barrel.{'open' if opening else 'close'}", f"barrel {'opened' if opening else 'closed'}", xyz, 0.5, rng.random() * 0.1 + 0.9)
                continue
            add(t, "door", door_sound(b, opening, known), f"{b} {'opened' if opening else 'closed'}", xyz, 1.0, rng.random() * 0.1 + 0.9)
    for e in tl:
        ev, t = e["event"], e["t"]
        if ev == "collect" and e.get("by") == "self":
            p = _pose_at(poses, t // 50)
            add(t, "pickup", "entity.item.pickup", "picked up an item", p[1:4] if p else None, 0.2, ((rng.random() - rng.random()) * 0.7 + 1.0) * 2.0)
        elif ev == "collect" and e.get("by") is not None:   # an actor or mob picking an item up: heard like any other sound
            r = _ent_at(ents, e.get("by"), t // 50)
            if r:
                add(t, "pickup", "entity.item.pickup", f"{r[2]} picked up an item", r[3:6], 0.2, ((rng.random() - rng.random()) * 0.7 + 1.0) * 2.0, True)
        elif ev in ("mob_hurt", "mob_death"):
            r = _ent_at(ents, e.get("id"), t // 50)
            typ = r[2] if r else "generic"
            snd = f"entity.{typ}.{'hurt' if ev == 'mob_hurt' else 'death'}"
            if snd not in known:
                snd = f"entity.generic.{'hurt' if ev == 'mob_hurt' else 'death'}"
            add(t, "hurt" if ev == "mob_hurt" else "death", snd, f"{typ} {'hit' if ev == 'mob_hurt' else 'died'}", r[3:6] if r else None, 1.0, (rng.random() - rng.random()) * 0.2 + 1.0)
        elif ev == "block_action":
            name = act_name.get(id(e), "")
            xyz = (e["x"] + 0.5, e["y"] + 0.5, e["z"] + 0.5)
            if name == "bell":
                add(t, "bell", "block.bell.use", "bell rung", xyz, 2.0, 1.0)
            elif name in ("chest", "trapped_chest", "ender_chest", "barrel") and e.get("a") == 1:
                pre = "ender_chest" if name == "ender_chest" else "barrel" if name == "barrel" else "chest"
                add(t, "chest", f"block.{pre}.{'open' if e.get('b', 0) > 0 else 'close'}", f"{name} {'opened' if e.get('b', 0) > 0 else 'closed'}", xyz, 0.5, rng.random() * 0.1 + 0.9)
        elif ev == "use_start" and e.get("item"):
            stop = next((x["t"] for x in tl if x["event"] == "use_stop" and x["t"] > t), t + 1600)
            item = e["item"]
            p = _pose_at(poses, t // 50)
            if DRINK.search(item):
                for tt in range(t + 350, stop, 200):
                    add(tt, "eat", "entity.generic.drink", f"drinking {item}", p[1:4] if p else None, 0.5, rng.random() * 0.1 + 0.9)
            elif FOOD.search(item):
                for tt in range(t + 350, stop, 200):
                    add(tt, "eat", "entity.generic.eat", f"eating {item}", p[1:4] if p else None, 0.5 + 0.5 * rng.randint(0, 1), (rng.random() - rng.random()) * 0.2 + 1.0)
        elif ev == "cart_primed":
            r = _ent_at(ents, e.get("id"), t // 50)
            add(t, "primed", "entity.tnt.primed", "TNT lit", r[3:6] if r else None)
        elif ev == "lightning":
            add(t, "thunder", "entity.lightning_bolt.thunder", "lightning", None, 2.0, 0.8 + rng.random() * 0.2)
    # TNT entities that appear (lit TNT) with no fuse sound
    first_seen = {}
    for r in rec.get("entities") or []:
        if r[2] == "tnt" and r[1] not in first_seen:
            first_seen[r[1]] = r
    for r in first_seen.values():
        add(r[0] * 50, "primed", "entity.tnt.primed", "TNT lit", r[3:6])
    return sorted(out, key=lambda o: o["t"])


def fills(rec, story_dir=None, known=None, evs=None):
    """The missing sounds to play: (t, sound, volume, pitch, note), with the key-word rule applied: under a key word a
    mob's idle voice is dropped (it is no action), a minor sound goes in 9 dB down and a causal one 6 dB down
    (scripts/story_audio.py's clarity guard keeps every one of them under the voice besides)."""
    keys = key_windows(rec, story_dir)
    out = []
    for o in (evs if evs is not None else events(rec, known)):
        if o["has"]:
            continue
        on_key = any(a <= o["t"] <= b for a, b in keys)
        if on_key and o["kind"] == "voice":
            continue
        g = (0.35 if o["kind"] in MINOR else 0.5) if on_key else 1.0
        out.append((o["t"], o["sound"], o["volume"] * g, o["pitch"], o["what"] + (f" (under a key word: {20 * math.log10(g):.0f} dB)" if on_key else "")))
    return out


# visible marks that make a sound in vanilla, and the sound (a mark or a fill) that must come with them
NEEDS = [("container", r"chest|barrel|shulker|ender_chest|open", 0.4, "a container opened with no open sound"),
         ("use_start", r"eat|drink|bow|crossbow|shield|bucket|spyglass|horn|honey|brush|trident|use|equip", 1.2, "an item used with no use sound"),
         ("mob_hurt", r"hurt|attack|death", 0.3, "a mob hit with no hurt sound"),
         ("mob_death", r"death", 0.3, "a mob died with no death sound"),
         ("lightning", r"thunder", 0.5, "lightning with no thunder")]


def silent_actions(rec, evs=None, story_dir=None):
    """Visible actions that would stay silent in the mix: a mark from NEEDS with no matching sound (a recorded `sound`
    mark or one of the fills) close after it, and every detected event whose fill is dropped. [(t s, what)]"""
    tl = rec["timeline"]
    evs = evs if evs is not None else events(rec)
    have = [(e["t"] / 1000, e.get("sound", "")) for e in tl if e["event"] == "sound"] + [(t, snd) for t, snd, *_ in fills(rec, story_dir, evs=evs)]
    lines = [e["t"] for e in tl if e["event"] in ("line", "start")]
    t0 = (min(lines) - 1000) / 1000 if lines else 0.0
    t1 = max([e["t"] for e in tl if e["event"] in ("end", "story_end")] or [1e12]) / 1000
    poses = rec.get("poses") or []
    ents = {}
    for r in rec.get("entities") or []:
        ents.setdefault(r[1], []).append(r)
    out = []
    for ev, rx, win, what in NEEDS:
        r = re.compile(rx)
        for e in tl:
            t = e["t"] / 1000
            if e["event"] != ev or not (t0 <= t <= t1):
                continue
            if ev == "use_start" and not e.get("item"):
                continue
            if ev in ("mob_hurt", "mob_death"):   # only within hearing of the camera
                row, p = _ent_at(ents, e.get("id"), e["t"] // 50), _pose_at(poses, e["t"] // 50)
                if not row or not p or _dist(p, *row[3:6]) > HEAR:
                    continue
            if not any(t - 0.15 <= st <= t + win and r.search(sn) for st, sn in have):
                out.append((t, what + (f" ({e.get('item') or e.get('title') or ''})" if ev in ("use_start", "container") else "")))
    return sorted(out)


def report(rec, story_dir=None):
    ev = events(rec)
    keys = key_windows(rec, story_dir)
    miss = [o for o in ev if not o["has"]]
    kinds = {}
    for o in ev:
        kinds[o["kind"]] = kinds.get(o["kind"], 0) + 1
    print(f"{len(ev)} visible sound-making events ({', '.join(f'{k} {n}' for k, n in sorted(kinds.items()))}), "
          f"{len(ev) - len(miss)} with a sound mark, {len(miss)} without (audio.py adds those for a story)")
    for o in miss:
        tag = "key word" if any(a <= o["t"] <= b for a, b in keys) else ""
        print(f"  {o['t']:7.2f}s  {o['what']:<34} -> {o['sound']:<32} {o['dist']:5.1f} blocks {'in view' if o['seen'] else '       '}  {tag}")
    sc = scenes(rec)
    print("ambience per shot: " + ", ".join(f"{a:.2f}-{b:.2f}s {k}" for a, b, k in sc))
    silent = silent_actions(rec, ev, story_dir)
    print(f"{len(silent)} visible action(s) that stay silent after the fills" + (":" if silent else ""))
    for t, what in silent:
        print(f"  {t:7.2f}s  {what}")
    return silent


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("rec")
    ap.add_argument("--story")
    ap.add_argument("--strict", action="store_true", help="exit 1 if a visible action stays silent")
    a = ap.parse_args()
    rec, p = load_rec(a.rec)
    rec["_path"] = str(p)   # rec_blocks.js reads the file itself (gzipped or not)
    silent = report(rec, a.story or story_dir_of(rec))
    sys.exit(1 if a.strict and silent else 0)
