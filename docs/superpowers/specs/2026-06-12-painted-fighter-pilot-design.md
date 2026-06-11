# Painted fighter pilot — design

**Date:** 2026-06-12
**View:** Raid (battle scene)

## Goal

Replace one fighter's pixel-matrix sprite with Bogdan's high-res painted
character art, animated procedurally so it feels game-like (the previous
static-art attempt was reverted same-day — a flat PNG standing next to
frame-animated pixel fighters read as dead). This is a **pilot**: one
character only, judged live in the preview by Bogdan. Full-roster rollout
happens only if the pilot feels right, as a separate follow-up.

## Pilot scope (hard boundary)

- **In:** exactly one painted fighter — the warhammer paladin image Bogdan
  provided — wired to a single roster entry. Everyone else renders the
  existing pixel-matrix fighters, byte-for-byte unchanged.
- **Out (explicitly deferred until the pilot is approved):** the other 7
  character images, a generic "recruit" art fallback, class-flavored ranged
  attacks (bow arrow / staff bolt), the glint-sweep polish, layered cutout
  puppetry (cape/arm layers), any removal of the matrix system.

## Decisions made during brainstorming

1. **Art format:** flat single PNGs now; renderer built rig-shaped so layered
   cutout puppetry can be added per class later without rework.
2. **Identity:** the painted face IS the person in the scene — no floating
   photo-disc head on art fighters. Photo avatars remain everywhere in the
   HUD (dock cards, damage log, ticket modal).
3. **Attacks:** uniform anticipation-lunge-recover grammar for all classes
   now; ranged projectile variants are a later polish pass.

## Art pipeline (mirrors the boss)

- Convention: `public/fighters/<slug>.png` — background keyed to transparent,
  cropped to content so the feet sit at the image bottom, one calm idle pose.
  The engine adds all motion and effects (same philosophy as
  `public/boss/README.md`). A short `public/fighters/README.md` documents this
  for the rollout phase.
- The paladin source has a dark gradient background; key it via an extended
  `scripts/key-art.py` flow. If automated keying leaves halos, Bogdan exports
  a transparent version instead (he has the originals).
- Loader: `src/raid/fighterArt.js` mirroring `bossArt.js` — cached texture,
  linear filter (painted art), **downscaled at load to ≤512px tall** so a
  future 8-10 character roster doesn't bloat TV VRAM.
- `src/raid/sprites/roster.js` gains an optional `art: '<slug>'` field per
  person. For the pilot, the paladin is assigned to the roster's hammer-class
  member (matches his weapon); Bogdan can re-point it to any teammate by
  editing one line.

## Renderer: a rig with N layers, where N = 1

- `FighterSprite` branches exactly like the boss does: fighter has art → new
  art rig path; no art → the current pixel-matrix path, untouched. This is
  the revert-protection: unknown assignees and everyone without art keep
  working, and the pilot itself renders a mixed party.
- The rig renders an ordered array of layer planes anchored at the feet.
  Today the array has one entry (the full body). A future layered export
  (cape / arm / body) slots into the same array with per-layer pivots and
  motion params — no rewrite.
- No avatar-disc head and no head-anchor tracking on the art path.
- World height ≈ 1.5–1.7 units (vs 1.34 matrix) — exact value is a live
  designer call in the preview, exposed as one constant.

## Animation grammar (procedural, mapped onto existing machinery)

All motion is transforms on the rig, driven by `useFrame` with the existing
hit-stop (`frozen()`) respected. Timing reuses the existing 5-segment ATK
timeline and `STRIKE_AT` so `onStrike` (hit-stop, shake, sparks, floats,
boss reaction) fires exactly as today.

- **Idle:** breath — scaleY 1 ± 0.012 anchored at the feet, ~1.1 s period —
  plus sway rotate ±0.6°, offset by the existing per-fighter `phase`. Calm
  base per the wall-display ethos.
- **Attack:** anticipation (lean ≈ −8°, shift back, squash 0.95) → strike
  (lunge forward the same world distance as the matrix lunge, +5° lean,
  3 ghost after-image planes fading ~0.3 s, white material flash) → recovery
  (cubic ease back, ~0.5 s).
- **Blocked (down):** rotate to ≈ 75° (laid out) + dim; existing beacon
  renders above, height taken from the rig plane.
- **Exhausted:** slump (small forward lean, scale 0.97) + existing 0.55 dim.
- **Resting:** existing 0.8 dim, slower breath.
- **Victory tableau:** bounce hop (y sine with squash on landing).
  **Defeat:** slump like exhausted.
- **Garnish (v1):** dust puffs at the feet on lunge (reuse the ImpactFX
  pattern, gray). Nothing else.

## Integrations that must keep working unchanged

Focus dim + teal ring, kill auras, beacon heat, tableau poses, attack pulse
routing by issue key, `?lite` flag (lite skips ghosts + dust). All of these
are material-color or floor-decal concerns and compose with the rig the same
way they compose with the matrix sprite.

## Pure logic & testing

- Attack-phase mapping is a pure function `attackPose(t)` →
  `{ x, rot, scaleY }` (plus phase flags for ghost spawning), unit-tested in
  vitest alongside the existing raidState tests.
- Plane layout shares `fitPlane` with `bossArtMath.js` (extract if needed).
- The R3F rig is verified in the browser preview using `npm run mock`
  (synthetic attack/block/victory events), side by side with matrix fighters
  to judge the mixed-party look.

## Success criteria

Bogdan watches the pilot in the preview (idle, attack with ghosts, blocked,
victory) and judges whether it feels game-like next to the matrix fighters
and the painted boss. Approval triggers the rollout phase (remaining
characters + recruit fallback + the deferred polish, as its own spec/plan).
