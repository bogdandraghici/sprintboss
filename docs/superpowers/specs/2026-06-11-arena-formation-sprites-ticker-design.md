# Arena formation, sprite identity & spotlight ticker — design

**Date:** 2026-06-11
**Status:** Approved by Bogdan (brainstorm session, all sections)

## Problem

Three issues with the arena view on the wall display:

1. Fighters are cramped — a tight grid (1.1 world units apart, rows of 5) left of the boss.
2. Fighters are generic — same 14×20 body, near-identical muted palettes, identical
   synchronized idle bobbing. At TV distance they read as clones.
   (Bogdan confirmed the *shared silhouette* is fine; the problems are size/detail,
   idle sameness, and color separation.)
3. The truth ticker shows only column counts + blocker keys — you can't tell what
   any task is actually about.

## Decisions (made via mockup comparison)

- **Formation:** half-circle around the boss, **boss stays anchored right** —
  the arc opens left (option A; boss-centered was explicitly rejected).
- **Ticker:** **spotlight** form factor — one ticket at a time, big type,
  rotating ~8s; scope = **active work only** (in progress / review / blocked).
- **Sprites:** scale up **and** redraw bodies at a higher grid (20×28).
  Full per-person costume pass deferred to Bogdan's art-direction round.

## 1. Formation & choreography

**Arc placement.** New pure helper `arcPositions(n)` in `src/raid/raidState.js`
(vitest-tested). Fighters sit on an arc around the boss center `(x 4.6, z −0.4)`:

- Sweep ≈ **120°–240°** (opens left; no slot directly behind the golem, which
  the boss plane would occlude).
- Radius ≈ **3.2** with small deterministic per-index jitter (seeded by index,
  not `Math.random()` at render time) so the line doesn't read as a protractor.
- Resulting depth range: front-arc fighters near z ≈ +2.4 (close to camera,
  render large), back-arc near z ≈ −3.2 (smaller, dimmed by the existing fog —
  free parallax). Even party-size spread across the sweep; stable ordering from
  `deriveParty` is preserved so slots don't reshuffle between polls.

**Facing.** With the sweep capped at 120°–240°, every slot lands left of the
boss (x ≤ 3.0 vs boss at 4.6), so the existing right-facing frames work
unchanged — **no mirroring needed**. (If the sweep ever widens past 90°/270°,
mirroring becomes necessary; out of scope now.)

**Attack choreography.** The lunge changes from a fixed `+0.5 on x` to a lunge
along the normalized fighter→boss direction (same timing envelope: wind-up
0.28s, strike, recover by 0.7s). Slash FX and damage floats spawn at the boss
edge nearest the attacker instead of hardcoded `x 3.4 / 4.2`. Orphan hits
(fighter −1) keep a fixed front-left anchor.

**Minions.** Move from the boss's front-left (currently x 2.6–4.1, z 0.6+ —
exactly where the new arc's front sits) to the **right flank**:
x ≈ 5.6–7.4, z ≈ 0.4–1.2, same 3-per-row stacking and horde counter.

**Camera.** Unchanged position; if the front arc clips the frame, nudge
fov 35 → 38. Verified in browser preview, not unit tests.

## 2. Sprites — scale, detail, identity

**Grid.** Bodies redraw at **20×28** (from 14×20), all six frames:
IDLE_A, IDLE_B, ATTACK_A, ATTACK_B, KNEEL, DOWN. Weapon overlays redrawn to
match and `HEAD_ANCHORS` updated per frame. Headless variants (avatar-head
pipeline) regenerated the same way as today.

**Scale.** World height ~2.0 → **~2.8 units** (PX stays 0.1); avatar head disc
0.8 → 0.9. Boss (4.2 units) remains visually dominant.

**Detail budget.** Readable-from-couch drafts: armor trim, belt, boots,
shoulder line per body. Still explicitly draft quality pending Bogdan's art
pass — no per-person costume shapes this round.

**Color identity.** Each roster entry gains a saturated signature accent
applied to armor trim + weapon energy pixels (e.g. cobalt / violet / jade /
ember — final hues are Bogdan's call at review). Replaces today's
near-identical desaturated armor tints. `__recruit__` stays deliberately gray.

**Idle variation.** Roster entries gain an `idle` profile:
- bob period 0.6–1.1s + phase offset (kills the synchronized-clones effect),
- sway amplitude (subtle group-level y/rotation wobble),
- occasional per-person fidget (weapon twitch / weight shift) done with
  transform wobble on the existing frames — no extra pixel frames.
All idle motion is driven by R3F clock time (scene-internal animation), never
`Date.now()`; data-derived state still comes exclusively from `view`.

**Tests** (`src/raid/__tests__`): every frame of every body/weapon has
consistent 20×28 dimensions; all palette keys used by matrices exist;
`HEAD_ANCHORS` fall inside the grid; `arcPositions(n)` — correct count, sweep
bounds, no slot in the occluded back wedge, deterministic output.

## 3. Spotlight ticker

`TruthTicker.jsx` becomes a spotlight strip (same position, bottom of the
raid view):

- **Fixed left block:** per-column counts + stale counts (as today), plus an
  always-visible red `⚑ n blocked` total — blockers never disappear into the
  rotation.
- **Spotlight:** one ticket at a time — mono line: key · assignee · column ·
  age (and blocked reason in red when blocked); below it the **full summary**
  in large sans type. Crossfade between tickets every **~8s**; position dots
  on the right show rotation progress. Clicking opens the existing ticket
  modal (`onSelect`).
- **Rotation list:** new pure selector `spotlightIssues(view)` (vitest-tested,
  lives next to the other selectors): blocked tickets first (oldest block
  first), then in-progress/review in board column order, oldest-in-column
  first within each column — staleness gets airtime. Derives entirely from `view`
  (time-travel safe). Only the rotation interval/index is local component
  state — presentation, not data.
- **Empty state:** no active work → calm "nothing in flight" line, counts
  block unchanged.
- Styling via existing CSS variables in `index.css`, mono/sans mix per the
  approved mockup.

## Out of scope

- Boss-centered composition (rejected).
- Per-person costume silhouettes / full art pass (Bogdan's later round).
- Factory view, HUD widgets, data layer, server.

## Verification

- `npm test` for all pure logic (arc, selectors, sprite matrices).
- Browser preview with `npm run mock` for: arc composition at party sizes
  1–10, mirrored facing, directional lunges + FX anchors, minion flank,
  ticker rotation/crossfade, blocked styling, TV-distance readability.
