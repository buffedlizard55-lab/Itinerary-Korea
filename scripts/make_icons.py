#!/usr/bin/env python3
"""Render the Korea Compass PWA icons as PNG without external dependencies.

The icon mirrors assets/compass.svg: a forest-green rounded square, a mint
compass ring, a sun-gold needle, and a cream pivot. Pure stdlib so the icons
stay reproducible anywhere the catalog build runs.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "icons"

FOREST = (0x14, 0x33, 0x2D)
MINT = (0xD9, 0xEE, 0xE5)
SUN = (0xF5, 0xB9, 0x4F)
CREAM = (0xFF, 0xFE, 0xFD)

# Needle polygon from the SVG path, in the 64x64 viewBox.
NEEDLE = [(45.8, 18.2), (36.4, 34.3), (20.3, 43.7), (29.7, 27.6)]


def inside_polygon(x: float, y: float, points: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(points) - 1
    for i, (xi, yi) in enumerate(points):
        xj, yj = points[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def inside_rounded_rect(x: float, y: float, size: float, radius: float) -> bool:
    if not (0 <= x <= size and 0 <= y <= size):
        return False
    if x < radius and y < radius:
        return (x - radius) ** 2 + (y - radius) ** 2 <= radius ** 2
    if x > size - radius and y < radius:
        return (x - (size - radius)) ** 2 + (y - radius) ** 2 <= radius ** 2
    if x < radius and y > size - radius:
        return (x - radius) ** 2 + (y - (size - radius)) ** 2 <= radius ** 2
    if x > size - radius and y > size - radius:
        return (x - (size - radius)) ** 2 + (y - (size - radius)) ** 2 <= radius ** 2
    return True


def sample(x: float, y: float, size: float) -> tuple[int, int, int] | None:
    """Color of one point in the scaled 64-unit viewBox, or None if transparent."""
    u = x / size * 64
    v = y / size * 64
    if not inside_rounded_rect(u, v, 64, 18):
        return None
    color = FOREST
    dist = ((u - 32) ** 2 + (v - 32) ** 2) ** 0.5
    if abs(dist - 20) <= 1.25:  # ring stroke, width 2.5
        color = MINT
    if inside_polygon(u, v, NEEDLE):
        color = SUN
    if dist <= 5.4:
        color = CREAM if dist > 3.4 else FOREST
    return color


def render(size: int, supersample: int = 3) -> bytes:
    rows = []
    step = 1 / supersample
    for py in range(size):
        row = bytearray()
        for px in range(size):
            sums = [0.0, 0.0, 0.0]
            coverage = 0
            for sy in range(supersample):
                for sx in range(supersample):
                    x = px + (sx + 0.5) * step
                    y = py + (sy + 0.5) * step
                    color = sample(x, y, size)
                    if color is None:
                        continue  # transparent corner
                    sums[0] += color[0]
                    sums[1] += color[1]
                    sums[2] += color[2]
                    coverage += 1
            if coverage == 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes((
                    round(sums[0] / coverage),
                    round(sums[1] / coverage),
                    round(sums[2] / coverage),
                    round(255 * coverage / (supersample * supersample)),
                ))
        rows.append(bytes(row))
    return b"".join(rows)


def write_png(path: Path, size: int) -> None:
    raw = render(size)
    stride = size * 4  # RGBA bytes per row
    scanlines = b"".join(b"\x00" + raw[y * stride:(y + 1) * stride] for y in range(size))

    def chunk(tag: bytes, payload: bytes) -> bytes:
        block = tag + payload
        return struct.pack(">I", len(payload)) + block + struct.pack(">I", zlib.crc32(block) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(scanlines, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(png)
    print(f"Wrote {path.relative_to(ROOT)} ({size}x{size})")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    write_png(OUT / "icon-192.png", 192)
    write_png(OUT / "icon-512.png", 512)


if __name__ == "__main__":
    main()
