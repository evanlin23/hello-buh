"""THE KEEP's recording plus the avatar's two characters: a mannequin named Buh (Steve's skin, stunts/brand_castle.js)
and a creeper, shoulder to shoulder, standing still. Writes work/brand/avatar.rec.json.gz.

    python3 brand/make_avatar_rec.py

Two pairs: east of the castle facing east (shot from the east with the sunset behind them), and west of it facing west
(shot from the west with the moonrise or sunrise behind them). The castle centre is set + [0, 1, -45].
"""
import gzip, json, math, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent.parent
rec = json.load(gzip.open(HERE / "renders/keep/lapse_castle.rec.json.gz"))
S = rec["set"]
y = S["y"] + 1                      # the grass top
PAIRS = [  # (x, z from the set, facing yaw: mineflayer, 0 = north, -pi/2 = east)
    (100.0, -46.0, -math.pi / 2),
    (-131.0, -46.0, math.pi / 2),
]
eid = 9000
for x0, z0, face in PAIRS:
    side = 1 if face < 0 else -1    # keep Buh on the left of the frame, the creeper on the right
    cast = [(eid + 1, "mannequin", 0.33 * side, +0.32, +0.22, {"name": "Buh"}), (eid + 2, "creeper", -0.33 * side, -0.30, -0.18, {})]
    eid += 10
    for tick in range(1700, 2000):
        for i, name, dz, turn, head, extra in cast:
            rec["entities"].append([tick, i, name, S["x"] + x0 + 0.5, y, S["z"] + z0 + 0.5 + dz, face + turn, 0.0, face + head, extra])
out = HERE / "work/brand/avatar.rec.json.gz"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_bytes(gzip.compress(json.dumps(rec).encode()))
print(out)
