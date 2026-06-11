#!/usr/bin/env python3
"""Key out a connected near-white background from a generated sprite.

Flood-fills from the image border, so light pixels *inside* the subject (e.g.
the golem's pale stones) are kept — only background connected to the edge is
made transparent. Also softens the anti-aliased halo left around the subject.

Usage:
    python3 scripts/key-art.py in.png out.png [--threshold 224] [--feather 12]

threshold: a pixel counts as "background-white" when all RGB channels >= this.
feather:   width (px) of the alpha ramp applied to the cut edge.
"""
import sys
import numpy as np
from PIL import Image


def flood_from_border(near_white):
    """Boolean mask of near-white pixels reachable from any border pixel."""
    h, w = near_white.shape
    bg = np.zeros((h, w), dtype=bool)
    bg[0, :] |= near_white[0, :]
    bg[-1, :] |= near_white[-1, :]
    bg[:, 0] |= near_white[:, 0]
    bg[:, -1] |= near_white[:, -1]
    while True:
        grown = bg.copy()
        grown[1:, :] |= bg[:-1, :]
        grown[:-1, :] |= bg[1:, :]
        grown[:, 1:] |= bg[:, :-1]
        grown[:, :-1] |= bg[:, 1:]
        grown &= near_white
        if grown.sum() == bg.sum():
            return grown
        bg = grown


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    inp, outp = sys.argv[1], sys.argv[2]
    th = 224
    feather = 12
    args = sys.argv[3:]
    for i, a in enumerate(args):
        if a == "--threshold" and i + 1 < len(args):
            th = int(args[i + 1])
        if a == "--feather" and i + 1 < len(args):
            feather = int(args[i + 1])

    im = Image.open(inp).convert("RGBA")
    a = np.array(im)
    rgb = a[:, :, :3].astype(np.int16)
    near_white = rgb.min(axis=2) >= th

    bg = flood_from_border(near_white)
    a[:, :, 3] = np.where(bg, 0, a[:, :, 3])

    # Feather the cut: kept pixels near the boundary get an alpha ramp based on
    # how white they are, killing the bright halo without eating solid pixels.
    if feather > 0:
        from PIL import ImageFilter
        edge = Image.fromarray((bg * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(feather)
        )
        edge = np.array(edge).astype(np.float32) / 255.0  # 0 solid .. 1 background
        whiteness = np.clip((rgb.min(axis=2) - (th - 40)) / 40.0, 0, 1)
        ramp = np.clip(1.0 - edge * whiteness, 0, 1)
        keep = ~bg
        a[:, :, 3] = np.where(keep, (a[:, :, 3] * ramp).astype(np.uint8), a[:, :, 3])

    Image.fromarray(a, "RGBA").save(outp)
    cleared = int(bg.sum())
    print(f"keyed {inp} -> {outp}  ({cleared} px cleared, {100*cleared/bg.size:.1f}% of frame)")


if __name__ == "__main__":
    main()
