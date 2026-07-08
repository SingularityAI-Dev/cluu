from pathlib import Path
import struct
import zlib

W = H = 48


def hex_to_rgba(hex_color, alpha=255):
    h = hex_color.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)


palette = {
    'ink': hex_to_rgba('2d2a26'),
    'stem': hex_to_rgba('5b8f45'),
    'stem_dark': hex_to_rgba('42744b'),
    'leaf': hex_to_rgba('6fa872'),
    'petal': hex_to_rgba('f2c94c'),
    'petal_light': hex_to_rgba('9bc49e'),
    'core': hex_to_rgba('7a4a2a'),
    'withered': hex_to_rgba('a86f3a'),
    'withered_leaf': hex_to_rgba('4a5240'),
}


def png(path, pixels):
    raw = b''.join(
        b'\x00' + bytes(pixels[y * W * 4 : (y + 1) * W * 4]) for y in range(H)
    )

    def chunk(name, data):
        return struct.pack('>I', len(data)) + name + data + struct.pack(
            '>I', zlib.crc32(name + data) & 0xFFFFFFFF
        )

    data = b'\x89PNG\r\n\x1a\n'
    data += chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))
    data += chunk(b'IDAT', zlib.compress(raw, 9))
    data += chunk(b'IEND', b'')
    Path(path).write_bytes(data)


def put(pixels, x, y, color):
    if 0 <= x < W and 0 <= y < H:
        i = (y * W + x) * 4
        pixels[i : i + 4] = color


def rect(pixels, x1, y1, x2, y2, color):
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            put(pixels, x, y, color)


def line(pixels, x1, y1, x2, y2, color):
    dx = abs(x2 - x1)
    dy = -abs(y2 - y1)
    sx = 1 if x1 < x2 else -1
    sy = 1 if y1 < y2 else -1
    err = dx + dy
    x, y = x1, y1
    while True:
        put(pixels, x, y, color)
        if x == x2 and y == y2:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x += sx
        if e2 <= dx:
            err += dx
            y += sy


def revived_pixels():
    pixels = bytearray([0] * W * H * 4)
    rect(pixels, 22, 24, 25, 46, palette['stem'])
    rect(pixels, 21, 32, 22, 45, palette['stem_dark'])
    rect(pixels, 26, 32, 26, 45, palette['leaf'])
    for y, x in [(34, 17), (34, 18), (35, 16), (36, 15), (37, 14), (38, 15), (39, 16)]:
        put(pixels, x, y, palette['leaf'])
    for y, x in [(38, 30), (38, 31), (39, 32), (40, 33), (41, 32), (42, 31), (42, 30)]:
        put(pixels, x, y, palette['leaf'])
    line(pixels, 18, 34, 22, 35, palette['stem_dark'])
    line(pixels, 30, 38, 26, 37, palette['stem_dark'])

    for y in range(10, 23):
        spread = abs(y - 16)
        for x in range(24 - (8 - spread // 2), 25 + (8 - spread // 2)):
            put(pixels, x, y, palette['petal_light'] if (x + y) % 3 == 0 else palette['petal'])
    for x in range(16, 33):
        spread = abs(x - 24)
        for y in range(16 - (8 - spread // 2), 17 + (8 - spread // 2)):
            put(pixels, x, y, palette['petal_light'] if (x + y) % 3 == 0 else palette['petal'])
    rect(pixels, 20, 12, 28, 20, palette['petal'])
    rect(pixels, 16, 16, 32, 17, palette['petal'])
    rect(pixels, 20, 12, 28, 20, palette['ink'])
    rect(pixels, 21, 13, 27, 19, palette['core'])
    put(pixels, 22, 14, palette['petal_light'])
    put(pixels, 26, 18, palette['petal_light'])
    rect(pixels, 17, 46, 31, 46, palette['stem_dark'])
    return pixels


def withered_pixels():
    pixels = bytearray([0] * W * H * 4)
    rect(pixels, 22, 24, 25, 46, palette['withered'])
    rect(pixels, 21, 32, 22, 45, palette['withered'])
    rect(pixels, 26, 32, 26, 45, palette['withered_leaf'])
    for y, x in [(33, 17), (34, 18), (35, 19), (36, 20), (37, 19), (38, 18)]:
        put(pixels, x, y, palette['withered_leaf'])
    for y, x in [(38, 29), (39, 30), (40, 31), (41, 30), (42, 29)]:
        put(pixels, x, y, palette['withered_leaf'])
    line(pixels, 18, 33, 22, 35, palette['withered'])
    line(pixels, 29, 38, 26, 37, palette['withered'])

    for y in range(17, 30):
        spread = abs(y - 23)
        for x in range(26 - (6 - spread // 2), 34 + (6 - spread // 2)):
            put(pixels, x, y, palette['petal'] if (x + y) % 2 == 0 else palette['withered'])
    rect(pixels, 27, 18, 33, 28, palette['withered'])
    rect(pixels, 24, 20, 27, 27, palette['petal'])
    rect(pixels, 28, 22, 33, 26, palette['core'])
    rect(pixels, 27, 18, 33, 28, palette['ink'])
    rect(pixels, 28, 19, 32, 27, palette['withered'])
    line(pixels, 24, 24, 30, 28, palette['withered'])
    rect(pixels, 17, 46, 31, 46, palette['withered_leaf'])
    return pixels


Path('public/sprites').mkdir(parents=True, exist_ok=True)
png('public/sprites/encounter_meadow_sunflower_revived.png', revived_pixels())
png('public/sprites/encounter_meadow_sunflower_withered.png', withered_pixels())
print('wrote sunflower sprites')
