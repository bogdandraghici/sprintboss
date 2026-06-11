#!/usr/bin/env python3
"""Normalize generated fighter bodies for the scene.

For each public/fighters/body-N.png:
  * keep a one-time raw backup (body-N-raw.png, gitignored),
  * drop near-transparent halo pixels (alpha < 16),
  * crop to the opaque content bbox so the feet are the bottom edge,
  * detect the NECK in a vertical band around the figure's centre of mass
    (so an off-centre raised weapon/staff isn't mistaken for the neck),
  * write the cropped PNG back and emit public/fighters/bodies.json with each
    body's neck anchor (fractions of the cropped frame) + aspect ratio.

The scene fits each body so neck->feet is a constant world height (heads line
up across the party) and pins the avatar disc at the neck anchor.

Usage: python3 scripts/fit-fighters.py
"""
import json
import os
import shutil
import numpy as np
from PIL import Image

DIR = "public/fighters"
ALPHA_FLOOR = 16
BBOX_ALPHA = 64
BAND_FRAC = 0.10  # half-width of the centre band, as a fraction of figure width
MAX_H = 720  # cap output height — fighters render ~150px tall, so this is ample


def fit_one(path_raw):
    im = Image.open(path_raw).convert("RGBA")
    a = np.array(im)
    a[a[:, :, 3] < ALPHA_FLOOR, 3] = 0  # kill faint halo

    alpha = a[:, :, 3]
    ys, xs = np.where(alpha >= BBOX_ALPHA)
    if len(ys) == 0:
        return None
    y0, y1 = ys.min(), ys.max()
    x0, x1 = xs.min(), xs.max()
    a = a[y0 : y1 + 1, x0 : x1 + 1]
    h, w = a.shape[:2]
    alpha = a[:, :, 3]

    # Figure centre of mass (x), then the topmost opaque row within a centre
    # band — the neck/collar, not a raised staff off to the side.
    solid = alpha >= BBOX_ALPHA
    cols = np.where(solid.any(axis=0))[0]
    cx = int(np.average(np.where(solid.sum(axis=0) > 0)[0], weights=solid.sum(axis=0)[solid.sum(axis=0) > 0]))
    band = max(8, int(w * BAND_FRAC))
    lo, hi = max(0, cx - band), min(w, cx + band + 1)
    band_solid = solid[:, lo:hi]
    rows = np.where(band_solid.any(axis=1))[0]
    neck_y = int(rows.min()) if len(rows) else 0
    # neck x: centre of opaque pixels in that row, within the band
    row_solid = np.where(solid[neck_y, lo:hi])[0]
    neck_x = int(lo + (row_solid.mean() if len(row_solid) else band))

    return a, (neck_x / w, neck_y / h), (w, h)


def main():
    entries = []
    i = 1
    while True:
        used = os.path.join(DIR, f"body-{i}.png")
        raw = os.path.join(DIR, f"body-{i}-raw.png")
        if not os.path.exists(used) and not os.path.exists(raw):
            break
        # Preserve the original once; always process from the raw so it's idempotent.
        if not os.path.exists(raw):
            shutil.copyfile(used, raw)
        out = fit_one(raw)
        if out is None:
            print(f"body-{i}: no content, skipped")
            i += 1
            continue
        arr, neck, (w, h) = out
        img = Image.fromarray(arr, "RGBA")
        if h > MAX_H:  # downscale for load weight (neck/aspect are fractions, unaffected)
            img = img.resize((round(w * MAX_H / h), MAX_H), Image.LANCZOS)
        img.save(used)
        entries.append({"file": f"body-{i}.png", "neck": [round(neck[0], 4), round(neck[1], 4)], "aspect": round(w / h, 4)})
        print(f"body-{i}: cropped {w}x{h}, neck at ({neck[0]:.2f}, {neck[1]:.2f})")
        i += 1

    with open(os.path.join(DIR, "bodies.json"), "w") as f:
        json.dump({"bodies": entries}, f, indent=2)
    print(f"wrote {DIR}/bodies.json ({len(entries)} bodies)")


if __name__ == "__main__":
    main()
