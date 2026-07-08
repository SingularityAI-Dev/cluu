from __future__ import annotations

from pathlib import Path
import math
import struct
import zlib

W = H = 48
SUNFLOWER_SIZE = 64


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    h = hex_color.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)


PALETTE = {
    'transparent': (0, 0, 0, 0),
    'ink': rgba('2d2a26'),
    'ink_soft': rgba('4a5240', 210),
    'meadow_mid': rgba('6fa872'),
    'meadow_light': rgba('9bc49e'),
    'meadow_shadow': rgba('42744b'),
    'meadow_deep': rgba('315f3a'),
    'cluu_body': rgba('f4d1b5'),
    'cluu_body_dark': rgba('d99575'),
    'cluu_cheek': rgba('e8b8a0'),
    'white': rgba('ffffff'),
    'black': rgba('241f18'),
    'sunflower_petal': rgba('f2c94c'),
    'sunflower_core': rgba('7a4a2a'),
    'sunflower_core_light': rgba('c9823a'),
    'sunflower_stem': rgba('5b8f45'),
    'sunflower_stem_dark': rgba('3f6f38'),
    'sunflower_leaf': rgba('79b966'),
    'sunflower_withered': rgba('a86f3a'),
    'sunflower_withered_dark': rgba('6f4329'),
    'sunflower_withered_leaf': rgba('6f7b46'),
}


def blank(size: int) -> bytearray:
    return bytearray([0] * size * size * 4)


def put(pixels: bytearray, size: int, x: int, y: int, color: tuple[int, int, int, int]) -> None:
    if 0 <= x < size and 0 <= y < size:
        i = (y * size + x) * 4
        pixels[i : i + 4] = color


def rect(pixels: bytearray, size: int, x1: int, y1: int, x2: int, y2: int, color: tuple[int, int, int, int]) -> None:
    for y in range(y1, y2 + 1):
        for x in range(x1, x2 + 1):
            put(pixels, size, x, y, color)


def ellipse(
    pixels: bytearray,
    size: int,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    color: tuple[int, int, int, int],
) -> None:
    for y in range(size):
        for x in range(size):
            value = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            if value <= 1:
                put(pixels, size, x, y, color)


def ring(
    pixels: bytearray,
    size: int,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    inner: float,
    color: tuple[int, int, int, int],
) -> None:
    for y in range(size):
        for x in range(size):
            value = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
            inner_value = ((x + 0.5 - cx) / (rx * inner)) ** 2 + ((y + 0.5 - cy) / (ry * inner)) ** 2
            if value <= 1 and inner_value > 1:
                put(pixels, size, x, y, color)


def line(pixels: bytearray, size: int, x1: int, y1: int, x2: int, y2: int, color: tuple[int, int, int, int]) -> None:
    dx = abs(x2 - x1)
    dy = -abs(y2 - y1)
    sx = 1 if x1 < x2 else -1
    sy = 1 if y1 < y2 else -1
    err = dx + dy
    x, y = x1, y1
    while True:
        put(pixels, size, x, y, color)
        if x == x2 and y == y2:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x += sx
        if e2 <= dx:
            err += dx
            y += sy


def png(path: str, pixels: bytearray, width: int, height: int) -> None:
    raw = b''.join(b'\x00' + bytes(pixels[y * width * 4 : (y + 1) * width * 4]) for y in range(height))

    def chunk(name: bytes, data: bytes) -> bytes:
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name + data) & 0xFFFFFFFF)

    data = b'\x89PNG\r\n\x1a\n'
    data += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    data += chunk(b'IDAT', zlib.compress(raw, 9))
    data += chunk(b'IEND', b'')
    Path(path).write_bytes(data)


def grass_tile() -> bytearray:
    pixels = blank(32)
    for y in range(32):
        for x in range(32):
            wave = int(5 * math.sin((x + y) / 5))
            color = PALETTE['meadow_mid'] if (x + y) % 2 else PALETTE['meadow_light']
            put(pixels, 32, x, y, (color[0], color[1], color[2], 245))
    for x in range(0, 32, 4):
        offset = (x // 4) % 3
        line(pixels, 32, x + offset, 30, x + offset - 2, 18 + offset, PALETTE['meadow_shadow'])
        line(pixels, 32, x + offset + 1, 31, x + offset + 3, 20 + offset, PALETTE['meadow_light'])
        if x % 8 == 0:
            put(pixels, 32, x + 2, 17, PALETTE['sunflower_petal'])
            put(pixels, 32, x + 3, 17, PALETTE['sunflower_core_light'])
    rect(pixels, 32, 0, 31, 31, 31, PALETTE['meadow_deep'])
    return pixels


def cluu_body(scale: float, frame: int) -> bytearray:
    pixels = blank(48)
    ellipse(pixels, 48, 24, 28 + (1 - scale) * 4, 15 * scale, 17 * scale, PALETTE['cluu_body_dark'])
    ellipse(pixels, 48, 24, 27 + (1 - scale) * 4, 14 * scale, 16 * scale, PALETTE['cluu_body'])
    rect(pixels, 48, 18, 41, 22, 43, PALETTE['black'])
    rect(pixels, 48, 26, 41, 30, 43, PALETTE['black'])
    ellipse(pixels, 48, 16, 29, 3, 2, PALETTE['cluu_cheek'])
    ellipse(pixels, 48, 32, 29, 3, 2, PALETTE['cluu_cheek'])
    eye_y = 22
    if frame in (2, 3, 4):
        line(pixels, 48, 18, eye_y, 22, eye_y, PALETTE['black'])
        line(pixels, 48, 26, eye_y, 30, eye_y, PALETTE['black'])
    else:
        eye_x = 18 if frame < 5 else 17
        other_x = 26 if frame < 5 else 25
        rect(pixels, 48, eye_x, eye_y - 3, eye_x + 5, eye_y + 2, PALETTE['white'])
        rect(pixels, 48, other_x, eye_y - 3, other_x + 5, eye_y + 2, PALETTE['white'])
        put(pixels, 48, eye_x + 4, eye_y - 1, PALETTE['black'])
        put(pixels, 48, other_x + 4, eye_y - 1, PALETTE['black'])
    if frame in (2, 3, 4):
        line(pixels, 48, 21, 33, 27, 33, PALETTE['black'])
    else:
        put(pixels, 48, 23, 33, PALETTE['black'])
        put(pixels, 48, 25, 33, PALETTE['black'])
    return pixels


def cluu_content() -> bytearray:
    pixels = blank(384)
    for frame in range(8):
        scale = 1.06 if frame == 1 else 1.0
        frame_pixels = cluu_body(scale, frame)
        for y in range(48):
            for x in range(48):
                src = (y * 48 + x) * 4
                dst = (y * 384 + frame * 48 + x) * 4
                pixels[dst : dst + 4] = frame_pixels[src : src + 4]
    return pixels


def cluu_base() -> bytearray:
    return cluu_body(1.0, 0)


def cluu_body_pattern() -> bytearray:
    pixels = blank(48)
    ellipse(pixels, 48, 24, 27, 14, 16, PALETTE['cluu_body_dark'])
    for x in range(17, 31, 3):
        line(pixels, 48, x, 16, x - 2, 37, PALETTE['meadow_light'])
    return pixels


def cluu_head() -> bytearray:
    pixels = blank(48)
    ellipse(pixels, 48, 24, 25, 15, 16, PALETTE['cluu_body_dark'])
    ellipse(pixels, 48, 24, 24, 14, 15, PALETTE['cluu_body'])
    rect(pixels, 48, 18, 21, 22, 25, PALETTE['white'])
    rect(pixels, 48, 26, 21, 30, 25, PALETTE['white'])
    put(pixels, 48, 21, 23, PALETTE['black'])
    put(pixels, 48, 29, 23, PALETTE['black'])
    line(pixels, 48, 21, 32, 27, 32, PALETTE['black'])
    return pixels


def cluu_eyes() -> bytearray:
    pixels = blank(48)
    rect(pixels, 48, 18, 21, 22, 25, PALETTE['white'])
    rect(pixels, 48, 26, 21, 30, 25, PALETTE['white'])
    put(pixels, 48, 21, 23, PALETTE['black'])
    put(pixels, 48, 29, 23, PALETTE['black'])
    return pixels


def cluu_back() -> bytearray:
    pixels = blank(48)
    ellipse(pixels, 48, 24, 27, 16, 17, PALETTE['sunflower_stem_dark'])
    ellipse(pixels, 48, 24, 27, 12, 13, PALETTE['meadow_shadow'])
    line(pixels, 48, 17, 18, 31, 36, PALETTE['sunflower_stem'])
    return pixels


def revived_sunflower() -> bytearray:
    pixels = blank(SUNFLOWER_SIZE)
    ellipse(pixels, SUNFLOWER_SIZE, 32, 59, 18, 4, PALETTE['sunflower_stem_dark'])
    rect(pixels, SUNFLOWER_SIZE, 30, 34, 34, 58, PALETTE['sunflower_stem'])
    line(pixels, SUNFLOWER_SIZE, 29, 44, 23, 51, PALETTE['sunflower_stem_dark'])
    line(pixels, SUNFLOWER_SIZE, 35, 48, 41, 54, PALETTE['sunflower_stem_dark'])
    ellipse(pixels, SUNFLOWER_SIZE, 21, 52, 7, 3, PALETTE['sunflower_leaf'])
    ellipse(pixels, SUNFLOWER_SIZE, 43, 55, 7, 3, PALETTE['sunflower_leaf'])
    for i in range(12):
        angle = (math.tau * i) / 12
        px = 32 + math.cos(angle) * 13
        py = 22 + math.sin(angle) * 13
        ellipse(pixels, SUNFLOWER_SIZE, px, py, 5, 7, PALETTE['sunflower_petal'])
    ellipse(pixels, SUNFLOWER_SIZE, 32, 22, 10, 10, PALETTE['sunflower_core'])
    ellipse(pixels, SUNFLOWER_SIZE, 30, 19, 4, 3, PALETTE['sunflower_core_light'])
    line(pixels, SUNFLOWER_SIZE, 25, 17, 37, 28, PALETTE['ink_soft'])
    return pixels


def withered_sunflower() -> bytearray:
    pixels = blank(SUNFLOWER_SIZE)
    ellipse(pixels, SUNFLOWER_SIZE, 32, 59, 18, 4, PALETTE['sunflower_withered_dark'])
    line(pixels, SUNFLOWER_SIZE, 29, 56, 34, 34, PALETTE['sunflower_withered'])
    line(pixels, SUNFLOWER_SIZE, 34, 34, 39, 24, PALETTE['sunflower_withered_dark'])
    line(pixels, SUNFLOWER_SIZE, 28, 45, 22, 51, PALETTE['sunflower_withered_leaf'])
    line(pixels, SUNFLOWER_SIZE, 36, 48, 43, 47, PALETTE['sunflower_withered_leaf'])
    for i in range(10):
        angle = (math.tau * i) / 10 + 0.2
        px = 39 + math.cos(angle) * (10 + (i % 3))
        py = 25 + math.sin(angle) * (10 + (i % 3))
        ellipse(pixels, SUNFLOWER_SIZE, px, py, 4, 6, PALETTE['sunflower_withered'])
    ellipse(pixels, SUNFLOWER_SIZE, 39, 25, 8, 8, PALETTE['sunflower_core'])
    line(pixels, SUNFLOWER_SIZE, 34, 22, 44, 30, PALETTE['ink_soft'])
    return pixels


def write_assets() -> None:
    root = Path('public/sprites')
    root.mkdir(parents=True, exist_ok=True)
    png(str(root / 'grass_32.png'), grass_tile(), 32, 32)
    png(str(root / 'cluu_content.png'), cluu_content(), 384, 48)
    png(str(root / 'cluu_base.png'), cluu_base(), 48, 48)
    png(str(root / 'cluu_body_pattern.png'), cluu_body_pattern(), 48, 48)
    png(str(root / 'cluu_head.png'), cluu_head(), 48, 48)
    png(str(root / 'cluu_eyes.png'), cluu_eyes(), 48, 48)
    png(str(root / 'cluu_back.png'), cluu_back(), 48, 48)
    png(str(root / 'encounter_meadow_sunflower_revived.png'), revived_sunflower(), SUNFLOWER_SIZE, SUNFLOWER_SIZE)
    png(str(root / 'encounter_meadow_sunflower_withered.png'), withered_sunflower(), SUNFLOWER_SIZE, SUNFLOWER_SIZE)
    print('regenerated Cluu, grass, and sunflower sprites')


if __name__ == '__main__':
    write_assets()
