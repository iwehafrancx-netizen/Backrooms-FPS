"""Generates every texture of the game into assets/textures.

    python3 tools/make-textures.py

All textures are painted procedurally (noise + simple patterns), so they are
original, seamless (they tile without visible edges) and small. Photos-like
materials are saved as .jpg; anything that needs transparency as .png.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'textures')
os.makedirs(OUT, exist_ok=True)
N = 512  # texture size; 512 keeps the download small and still looks sharp


def rng(seed):
    return np.random.default_rng(seed)


def tile_noise(size, cells, seed):
    """Seamless value noise: random grid of `cells` x `cells`, cubic-smoothed."""
    g = rng(seed).random((cells, cells))
    y, x = np.mgrid[0:size, 0:size] / size * cells
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    x1, y1 = (x0 + 1) % cells, (y0 + 1) % cells
    x0, y0 = x0 % cells, y0 % cells
    a = g[y0, x0] * (1 - fx) + g[y0, x1] * fx
    b = g[y1, x0] * (1 - fx) + g[y1, x1] * fx
    return a * (1 - fy) + b * fy


def fbm(size, base, octaves, seed, gain=0.5):
    """Fractal noise (several octaves of tile_noise), normalised to 0..1."""
    out, amp, total = np.zeros((size, size)), 1.0, 0.0
    for o in range(octaves):
        out += tile_noise(size, base * 2 ** o, seed + o * 31) * amp
        total += amp
        amp *= gain
    return out / total


def colorize(t, c0, c1):
    """Map a 0..1 field between two RGB colours."""
    t = np.clip(t, 0, 1)[..., None]
    return np.array(c0) * (1 - t) + np.array(c1) * t


def save(name, arr, quality=86):
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    path = os.path.join(OUT, name)
    if name.endswith('.png'):
        img.save(path, optimize=True)
    else:
        img.convert('RGB').save(path, quality=quality, optimize=True, progressive=True)


# ------------------------------------------------------------------ wood
def wood(name, light, dark, seed, planks=0, rings=22.0):
    """Long grain along X; optional plank seams for floors."""
    y, x = np.mgrid[0:N, 0:N] / N
    warp = fbm(N, 4, 4, seed) * 0.35
    grain = np.sin((y + warp) * rings * np.pi * 2) * 0.5 + 0.5
    grain = grain ** 3 * 0.6 + fbm(N, 32, 2, seed + 5) * 0.4
    img = colorize(grain, light, dark)
    if planks:
        h = N // planks
        r = rng(seed + 9)
        for i in range(planks):
            img[i * h:(i + 1) * h] *= 0.9 + r.random() * 0.2  # each plank slightly different
            img[i * h:i * h + 2] *= 0.45  # dark seam
            off = int(r.random() * N)
            img[i * h:(i + 1) * h, off:off + 2] *= 0.5  # butt joint
    return img


save('wood_oak.jpg', wood('oak', (196, 152, 104), (142, 98, 60), 1))
save('wood_walnut.jpg', wood('walnut', (120, 80, 52), (64, 40, 26), 2))
save('floor_parquet.jpg', wood('parquet', (182, 132, 84), (120, 78, 44), 3, planks=6, rings=30))

# painted wood: almost flat white with a faint brush direction
paint = fbm(N, 8, 3, 4) * 0.5 + fbm(N, 64, 1, 5) * 0.5
save('wood_painted.jpg', colorize(paint, (236, 234, 228), (214, 212, 204)))


# ------------------------------------------------------------------ fabrics
def weave(c0, c1, period, seed, rough=0.35):
    y, x = np.mgrid[0:N, 0:N]
    warp_t = (np.sin(x / period * np.pi * 2) * 0.5 + 0.5)
    weft_t = (np.sin(y / period * np.pi * 2) * 0.5 + 0.5)
    checker = ((x // period + y // period) % 2).astype(float)
    t = checker * warp_t + (1 - checker) * weft_t
    t = t * (1 - rough) + fbm(N, 16, 3, seed) * rough
    return colorize(t, c0, c1)


save('fabric_weave.jpg', weave((170, 170, 170), (230, 230, 230), 4, 10))
save('fabric_cotton.jpg', weave((228, 228, 228), (250, 250, 250), 2, 11, rough=0.5))
save('fabric_twill.jpg', weave((175, 175, 180), (225, 225, 230), 3, 12))
save('fabric_burlap.jpg', weave((150, 120, 80), (215, 190, 140), 6, 13, rough=0.45))
save('fabric_denim.jpg', weave((150, 155, 170), (215, 220, 230), 2, 14, rough=0.4))
# knit: rows of little V stitches
y, x = np.mgrid[0:N, 0:N]
knit = np.abs(np.sin(x / 6 * np.pi + np.abs(((y % 10) - 5) / 5) * 1.5))
save('fabric_knit.jpg', colorize(knit * 0.7 + fbm(N, 32, 2, 15) * 0.3, (170, 170, 170), (235, 235, 235)))
# pyjama stripes (tinted by the material colour in the game)
stripes = ((x // 24) % 2).astype(float) * 0.5 + fbm(N, 32, 2, 16) * 0.15
save('fabric_stripes.jpg', colorize(stripes, (245, 245, 245), (175, 175, 190)))

# leather: cellular wrinkles + soft sheen
lea = fbm(N, 24, 4, 20)
lea = np.abs(lea - 0.5) * 2
save('leather.jpg', colorize(lea ** 0.6, (205, 205, 205), (150, 150, 150)))

# ------------------------------------------------------------------ stone, metal, clay
marble = fbm(N, 3, 6, 30)
veins = np.abs(np.sin((marble * 6 + np.mgrid[0:N, 0:N][1] / N * 2) * np.pi)) ** 0.25
save('marble.jpg', colorize(1 - veins * 0.35 - fbm(N, 16, 2, 31) * 0.1, (150, 150, 155), (246, 246, 244)))

brushed = fbm(N, 2, 1, 40) * 0.3 + rng(41).random((1, N)).repeat(N, 0) * 0.7
brushed = Image.fromarray((brushed * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
save('metal_brushed.jpg', colorize(np.asarray(brushed) / 255, (175, 178, 182), (235, 237, 240)))
save('metal_painted.jpg', colorize(fbm(N, 8, 4, 42) * 0.6 + fbm(N, 64, 1, 43) * 0.4, (190, 190, 190), (225, 225, 225)))
save('terracotta.jpg', colorize(fbm(N, 12, 4, 50), (190, 190, 190), (240, 240, 240)))

# ------------------------------------------------------------------ floors & walls
# ceramic tiles 4 x 4 with grout
t = fbm(N, 8, 3, 60) * 0.25
img = colorize(t, (232, 230, 224), (205, 202, 195))
for i in range(5):
    k = i * N // 4
    img[max(0, k - 2):k + 2, :] = (150, 146, 140)
    img[:, max(0, k - 2):k + 2] = (150, 146, 140)
save('floor_tiles.jpg', img)

# checkered kitchen tiles
cx = ((x // (N // 8)) + (y // (N // 8))) % 2
img = np.where(cx[..., None] == 0, colorize(fbm(N, 16, 2, 61) * 0.2, (40, 42, 46), (60, 62, 66)), colorize(fbm(N, 16, 2, 62) * 0.2, (226, 224, 218), (240, 238, 232)))
save('floor_checker.jpg', img)

# carpet: dense soft noise
save('carpet.jpg', colorize(fbm(N, 64, 3, 70) * 0.7 + fbm(N, 6, 3, 71) * 0.3, (92, 70, 64), (138, 108, 96)))
save('carpet_blue.jpg', colorize(fbm(N, 64, 3, 72) * 0.7 + fbm(N, 6, 3, 73) * 0.3, (52, 66, 92), (86, 104, 136)))

# wallpaper with a damask-like diamond pattern
pat = (np.abs(np.sin(x / N * np.pi * 8)) * np.abs(np.sin(y / N * np.pi * 8)))
diamond = (np.abs(((x % 64) - 32)) + np.abs(((y % 64) - 32))) < 10
img = colorize(fbm(N, 16, 2, 80) * 0.15 + pat * 0.1, (214, 200, 170), (228, 216, 190))
img[diamond] *= 0.9
save('wallpaper_cream.jpg', img)
vert = ((x // 32) % 2).astype(float)
save('wallpaper_green.jpg', colorize(vert * 0.15 + fbm(N, 16, 2, 81) * 0.1, (118, 140, 116), (142, 164, 138)))
save('wall_plaster.jpg', colorize(fbm(N, 6, 5, 82), (218, 214, 206), (238, 235, 228)))
save('wall_office.jpg', colorize(fbm(N, 6, 5, 83), (196, 202, 208), (214, 220, 226)))

# brick (outside walls)
img = colorize(fbm(N, 32, 3, 90), (150, 74, 54), (176, 96, 70))
bh, bw = N // 16, N // 4
for r in range(16):
    img[r * bh:r * bh + 3, :] = (196, 190, 180)
    off = (bw // 2) * (r % 2)
    for c in range(5):
        k = (c * bw + off) % N
        img[r * bh:(r + 1) * bh, k:k + 3] = (196, 190, 180)
    img[r * bh + 3:(r + 1) * bh] *= 0.92 + rng(91 + r).random() * 0.16
save('brick.jpg', img)

# outside ground
save('grass.jpg', colorize(fbm(N, 48, 4, 100) * 0.7 + fbm(N, 4, 3, 101) * 0.3, (52, 86, 38), (98, 136, 64)))
save('pavement.jpg', colorize(fbm(N, 24, 4, 102), (120, 120, 118), (160, 158, 154)))
img = colorize(fbm(N, 64, 3, 103), (48, 50, 54), (78, 80, 84))
save('asphalt.jpg', img)

# ------------------------------------------------------------------ props
# leaf: rgba with soft alpha edge and a central vein
leaf = np.zeros((N, N, 4))
u = (x / N - 0.5) * 2  # -1..1 across the leaf
v = y / N  # 0..1 along it
width = np.sin(v * np.pi) * 0.95
inside = np.abs(u) < width
leaf[..., :3] = colorize(fbm(N, 8, 3, 110) * 0.5 + np.abs(u) * 0.5, (110, 170, 80), (54, 100, 42))
leaf[np.abs(u) < 0.03] = (150, 190, 110, 255)
leaf[..., 3] = np.where(inside, 255, 0)
save('leaf.png', leaf)

# rug: border + centre medallion
img = colorize(fbm(N, 32, 2, 120) * 0.3, (122, 32, 34), (150, 46, 44))
img[:24], img[-24:], img[:, :24], img[:, -24:] = (36, 48, 82), (36, 48, 82), (36, 48, 82), (36, 48, 82)
d = np.hypot(x - N / 2, (y - N / 2) * 1.4)
img[(d > 80) & (d < 96)] = (214, 176, 96)
img[d < 40] = (214, 176, 96)
img[(np.abs(x - N / 2) + np.abs(y - N / 2) * 1.4) < 30] = (36, 48, 82)
save('rug.jpg', img)

# banknote: pale green guilloche
g = np.sin(np.hypot(x - 256, y - 256) / 6) * 0.5 + 0.5
save('banknote.jpg', colorize(g * 0.4 + fbm(N, 16, 2, 130) * 0.6, (150, 190, 140), (210, 230, 200)))


# two original paintings (loot): an abstract sunset landscape and a portrait-like still life
def painting_a():
    img = Image.new('RGB', (N, N))
    d = ImageDraw.Draw(img)
    for i in range(N):  # sky gradient
        t = i / N
        d.line([(0, i), (N, i)], fill=(int(250 - 90 * t), int(170 - 60 * t), int(90 + 60 * t)))
    d.ellipse([300, 150, 400, 250], fill=(255, 226, 150))  # sun
    d.polygon([(0, 330), (120, 240), (230, 320), (340, 230), (512, 330), (512, 512), (0, 512)], fill=(64, 72, 110))
    d.polygon([(0, 400), (180, 330), (360, 410), (512, 360), (512, 512), (0, 512)], fill=(40, 52, 70))
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    a = np.asarray(img).astype(float) * (0.9 + fbm(N, 64, 2, 140)[..., None] * 0.2)  # canvas texture
    return a


def painting_b():
    img = Image.new('RGB', (N, N), (46, 38, 34))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 360, N, N], fill=(92, 62, 40))  # table
    d.ellipse([140, 230, 260, 380], fill=(196, 160, 60))  # pear
    d.ellipse([250, 260, 370, 380], fill=(170, 40, 36))  # apple
    d.polygon([(330, 120), (380, 120), (400, 370), (310, 370)], fill=(70, 96, 120))  # bottle
    img = img.filter(ImageFilter.GaussianBlur(2))
    return np.asarray(img).astype(float) * (0.88 + fbm(N, 64, 2, 141)[..., None] * 0.24)


save('painting_a.jpg', painting_a())
save('painting_b.jpg', painting_b())

print('textures written to', os.path.relpath(OUT, ROOT), ':', len(os.listdir(OUT)), 'files')
