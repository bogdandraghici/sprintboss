#!/usr/bin/env python3
"""Key a generated fighter sprite's background and crop to content.

Usage: python3 scripts/prep-fighter.py <source.png> <slug> [tolerance]

Flood-fills from the canvas border: gradients vary slowly between neighbours,
so the fill walks the whole background and stops at the character's hard
edge. Result is cropped to the opaque bounding box (feet at the bottom) and
saved to public/fighters/<slug>.png.
"""
import sys
from collections import deque
from PIL import Image


def key_flood(im, tol):
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    for (x, y) in q:
        seen[y * w + x] = 1
    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                nr, ng, nb, _ = px[nx, ny]
                if abs(nr - r) < tol and abs(ng - g) < tol and abs(nb - b) < tol:
                    seen[ny * w + nx] = 1
                    q.append((nx, ny))
    cleared = 0
    for y in range(h):
        for x in range(w):
            if seen[y * w + x]:
                px[x, y] = (0, 0, 0, 0)
                cleared += 1
    return cleared / (w * h)


def main():
    src, slug = sys.argv[1], sys.argv[2]
    tol = int(sys.argv[3]) if len(sys.argv) > 3 else 26
    im = Image.open(src).convert('RGBA')
    ratio = key_flood(im, tol)
    bbox = im.getbbox()
    im = im.crop(bbox)
    out = f'public/fighters/{slug}.png'
    im.save(out, optimize=True)
    print(f'{out}: keyed {ratio:.0%} of canvas, cropped to {im.size[0]}x{im.size[1]} (bbox {bbox})')


if __name__ == '__main__':
    main()
