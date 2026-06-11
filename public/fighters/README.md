# Painted fighter sprites

A fighter renders painted art when its roster entry (`src/raid/sprites/roster.js`)
has an `art: '<slug>'` field and `<slug>.png` exists here. No field / no file /
load failure → the in-code pixel-matrix fighter renders instead (always safe).

## File requirements

- One character, calm idle pose, full body. The engine adds ALL motion:
  breathing, attack lunges with smears, blocked/victory poses, flashes, dust.
  Don't bake in action poses, shadows, ground, or text.
- Transparent background, cropped so the feet sit at the image bottom
  (`scripts/prep-fighter.py <source.png> <slug>` keys gradient backgrounds
  and crops automatically).
- ~1024px tall sources are fine — textures are downscaled to ≤512px at load.
- Style reference: chunky pixel-art like `public/boss/idle.png`; the face is
  the person's identity (no photo-disc head on art fighters).

`*-raw.png` files are untracked source dumps; only `<slug>.png` files ship.
