#!/usr/bin/env python3
"""Key a generated fighter sprite's background and crop to content.

Usage: python3 scripts/prep-fighter.py <source.png> <slug> [tolerance]

Two paths depending on the source:
- Pre-keyed source (>5% pixels already alpha=0): skips flood-fill; instead
  cleans semi-transparent fringe by dropping any pixel with alpha<100 to
  fully transparent (engine alphaTest ~0.4 ≈ 102 — fringe would render as
  a dark halo otherwise), then crops to content bbox.
- Opaque source: flood-fills from the canvas border (gradients vary slowly
  between neighbours, so the fill walks the whole background and stops at
  the character's hard edge), then crops to content bbox.

Result saved to public/fighters/<slug>.png.
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


def clean_alpha(im):
    """Drop semi-transparent fringe: any pixel with alpha<100 becomes fully transparent."""
    w, h = im.size
    px = im.load()
    cleaned = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 100:
                px[x, y] = (0, 0, 0, 0)
                cleaned += 1
    return cleaned / (w * h)


def main():
    src, slug = sys.argv[1], sys.argv[2]
    tol = int(sys.argv[3]) if len(sys.argv) > 3 else 26
    im = Image.open(src).convert('RGBA')

    w, h = im.size
    total = w * h
    px = im.load()
    already_transparent = sum(1 for y in range(h) for x in range(w) if px[x, y][3] == 0)
    pre_keyed = (already_transparent / total) > 0.05

    if pre_keyed:
        ratio = clean_alpha(im)
        bbox = im.getbbox()
        im = im.crop(bbox)
        out = f'public/fighters/{slug}.png'
        im.save(out, optimize=True)
        print(f'{out}: pre-keyed source, alpha-cleaned (fringe<100 dropped), cropped to {im.size[0]}x{im.size[1]} (bbox {bbox})')
    else:
        ratio = key_flood(im, tol)
        bbox = im.getbbox()
        im = im.crop(bbox)
        out = f'public/fighters/{slug}.png'
        im.save(out, optimize=True)
        print(f'{out}: keyed {ratio:.0%} of canvas, cropped to {im.size[0]}x{im.size[1]} (bbox {bbox})')


if __name__ == '__main__':
    main()
