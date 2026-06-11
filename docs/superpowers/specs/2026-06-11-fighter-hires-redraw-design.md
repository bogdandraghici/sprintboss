# Fighter hi-res redraw — design

**Date:** 2026-06-11
**Status:** approved (brainstorm with Bogdan; direction picked via visual companion)

## Goal

Make the raid-view fighters look better while keeping the 8-bit style. Chosen
direction: redraw at higher native resolution with a distinct body per weapon
class, flat-chunky rendering (no shading ramps, no rim light).

Decisions made during brainstorming (each shown as pixel mockups):

1. Direction: **hi-res redraw** (over polish-in-place and pipeline-only lighting).
2. Treatment: **flat chunky** — one tone per material, hand-drawn outlines only.
   No hand-shading, no programmatic rim light. Faithful to the approved mockup DNA.
3. Bodies: **full per-class anatomy** (over shared-body-with-accents and
   one-shared-body).

## Art direction

- Native grid **14×20 → 20×28**, upscaled 2× at sheet build (40×56), exactly as
  the current pipeline does. Flat color per material, hand-drawn `K` outlines
  in the matrices are the only outlines.
- **Five class bodies**, keyed by the roster's existing `weapon` field:
  - `sword` — balanced knight
  - `hammer` — broad, squat bruiser
  - `bow` — lean, tall archer
  - `staff` — robed caster
  - `daggers` — small, hooded rogue
- Per-person identity is unchanged: palette swap (armor hue, hair color), hair
  overlay, avatar head riding the headless body.
- **Class-appropriate attack choreography in the drawings**: sword slash,
  hammer overhead smash, bow draw-and-loose, staff cast, dagger flurry. The
  attack *timeline* (`ATK` segments, strike timing, lunge offsets in
  `FighterSprite.jsx`) is unchanged — only artwork per frame changes.
- Six base poses per class, mapped to the existing 15 `FRAME`s via recipes as
  today: idle A/B, attack wind-up, attack strike, kneel, down.
- On-screen footprint stays roughly the same: `PX` retunes from 0.034 to ~0.024
  so a 40×56 sprite occupies the same world height (~1.36 units). Formation
  spacing, dock, and camera need no rework.
- Sprite art remains subject to Bogdan's art-direction pass; he reviews in the
  browser preview before the work is called done.

## Architecture

- `src/raid/sprites/bodies.js` → per-class body sets:
  `CLASS_BODIES = { sword: [6 poses], hammer: [...], bow: [...], staff: [...], daggers: [...] }`,
  each pose a 20×28 matrix. **Weapons are drawn into the body frames.**
- `src/raid/sprites/weapons.js` is **deleted**, along with the weapon-compose
  step in `roster.js`. Kneel/down poses are naturally weaponless (drawn that way).
- `compose()` survives for hair overlays. Hair sprites in `roster.js` are
  redrawn slightly larger to fit the new ~7px-wide head.
- `src/raid/sprites/roster.js`:
  - `FRAME` map unchanged (15 frames).
  - `RECIPES` unchanged in structure (base pose index + dx/dy nudges, ×2 on upscale);
    weapon-slot column dropped.
  - `build()` indexes `CLASS_BODIES[person.weapon]`.
  - `SPRITE_W = 40`, `SPRITE_H = 56`.
  - `HEAD_BOXES` / `HEAD_ANCHORS` become per-class × per-pose tables (5×6); the
    headless-erase and anchor mechanism is unchanged.
- `src/raid/FighterSprite.jsx`: replace hardcoded 28/40 plane + anchor math with
  the exported `SPRITE_W`/`SPRITE_H`; retune `PX`; bump the `sheetTexture` cache
  key (`v3` → `v4`).
- Everything else (rasterize, buildSheet, textures, avatar proxy, raidState) is
  untouched.

## Out of scope

Boss (has its own generated-art path), minions (`MinionSprite`), Factory view,
and any data-layer code.

## Testing

- Extend `src/raid/__tests__/sprites.test.js`:
  - every class × pose matrix is exactly 20 wide × 28 tall;
  - every non-transparent char has a palette entry (base + every roster override);
  - headless variants actually erase the head box (no body pixels survive inside it);
  - every head anchor lands inside sprite bounds for every frame;
  - `buildSheet` succeeds for every roster member and `__recruit__`.
- Browser verification on `npm run mock`: idle/attack/kneel/down/victory for
  each class, avatar head tracking every pose, in-scene size parity with the
  current build.
- Acceptance gate: Bogdan's art-direction review in the preview
  (mockups-are-contracts).
