"""Cast vs set colour contrast (docs/look.md section 5): the mean colour of each cast texture's visible front and its CIELAB
distance (dE) to common set materials, from the client jar. dE < 20 blends in (bold), 20-35 separates, > 35 pops.

    python3 scripts/cast_contrast.py > table.md
"""
import zipfile, io, numpy as np, sys
from PIL import Image
z = zipfile.ZipFile(str(__import__('pathlib').Path(__file__).resolve().parent.parent / 'work' / 'client' / '1.21.11.jar'))
T = lambda p: Image.open(io.BytesIO(z.read('assets/minecraft/textures/' + p))).convert('RGBA')
def mean(im, box=None):
    a = np.asarray(im.crop(box) if box else im, dtype=np.float32)
    m = a[:, :, 3] > 128
    return a[:, :, :3][m].mean(0) / 255
def lab(c):
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    X, Y, Zc = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]) @ c
    f = lambda t: np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X / 0.9505), f(Y), f(Zc / 1.089)
    return np.array([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)])
lum = lambda c: float(c @ [0.2126, 0.7152, 0.0722])
grass = mean(T('block/grass_block_top.png')) * np.array([0x91, 0xBD, 0x59]) / 255
SETS = {'grass': grass, 'oak_planks': mean(T('block/oak_planks.png')), 'spruce_planks': mean(T('block/spruce_planks.png')),
        'cobblestone': mean(T('block/cobblestone.png')), 'dirt_path': mean(T('block/dirt_path_top.png')), 'sand': mean(T('block/sand.png')),
        'day_sky': np.array([0x78, 0xA7, 0xFF]) / 255, 'night (lit 0.25)': np.array([0.08, 0.09, 0.16])}
# whole-body readings: players = head front + torso front + legs front; villagers = base + profession overlay composited
def player(n):
    im = T(f'entity/player/wide/{n}.png'); parts = [(8, 8, 16, 16), (20, 20, 28, 32), (4, 20, 8, 32), (44, 20, 48, 32)]
    return np.mean([mean(im, b) for b in parts], 0)
def villager(prof, typ='plains'):
    base = T('entity/villager/villager.png'); t = T(f'entity/villager/type/{typ}.png'); base.alpha_composite(t)
    if prof: base.alpha_composite(T(f'entity/villager/profession/{prof}.png'))
    # head front, body front, robe front, arms
    return np.mean([mean(base, b) for b in [(8, 8, 16, 18), (22, 20, 30, 32), (6, 38, 14, 56), (44, 22, 48, 30)]], 0)
CAST = {f'player:{n}': player(n) for n in ['steve', 'alex', 'ari', 'efe', 'kai', 'makena', 'noor', 'sunny', 'zuri']}
for p in ['farmer', 'librarian', 'cleric', 'butcher', 'armorer', 'weaponsmith', 'toolsmith', 'fletcher', 'shepherd', 'fisherman', 'cartographer', 'leatherworker', 'mason', 'nitwit']:
    CAST[f'villager:{p}'] = villager(p)
CAST['villager:none (plains)'] = villager(None)
for m, p in [('zombie', 'entity/zombie/zombie.png'), ('skeleton', 'entity/skeleton/skeleton.png'), ('creeper', 'entity/creeper/creeper.png'),
             ('enderman', 'entity/enderman/enderman.png'), ('pillager', 'entity/illager/pillager.png'), ('witch', 'entity/witch.png'),
             ('iron_golem', 'entity/iron_golem/iron_golem.png'), ('wolf', 'entity/wolf/wolf.png'), ('spider', 'entity/spider/spider.png'),
             ('wandering_trader', 'entity/wandering_trader.png'), ('husk', 'entity/zombie/husk.png'), ('allay', 'entity/allay/allay.png'), ('fox', 'entity/fox/fox.png'),
             ('sheep(white)', 'entity/sheep/sheep_wool.png'), ('cat:black', 'entity/cat/black.png')]:
    CAST[m] = mean(T(p))
print('| cast | colour | luma | ' + ' | '.join(SETS) + ' |')
print('|---|---|---|' + '---|' * len(SETS))
rows = []
for k, c in CAST.items():
    de = [float(np.linalg.norm(lab(c) - lab(s))) for s in SETS.values()]
    rows.append((k, c, de))
    hexc = '#%02x%02x%02x' % tuple(int(v * 255) for v in c)
    print(f'| {k} | {hexc} | {lum(c):.2f} | ' + ' | '.join(('**%d**' % d if d < 20 else '%d' % d) for d in de) + ' |')
