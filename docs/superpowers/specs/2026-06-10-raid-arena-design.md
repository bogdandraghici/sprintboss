# Sprint Boss: Raid — HD-2D battle arena design

**Date:** 2026-06-10
**Status:** Approved (brainstorm with Bogdan)
**Replaces:** the conveyor-belt FactoryLine as the ambient view's primary metaphor.

## Concept

The ambient screen becomes a single HD-2D boss arena rendered with Three.js
(react-three-fiber). Hand-made pixel sprites — one per teammate — stand in a
battle row fighting the factory golem, reborn as a large pixel-art boss so the
app keeps its existing mascot. "Real game" quality comes from the environment,
not the sprites: volumetric light shafts, bloom, ember particles, reflective
floor, fog, slow ambient camera drift, and screen-shake / camera punch-ins on
events. Pixel sprites stay crisp (nearest-neighbor) inside the lit 3D diorama
— Octopath Traveler's recipe.

Tone follows the established motion language: calm base, punchy events.

## Layout

- **Arena** — ~80% of the screen. 3D diorama: floor, boss right, party row left.
- **Boss HP bar** — across the top. The existing per-ticket segmented HP bar,
  restyled as a raid frame. Scar timeline (scope-creep history) tucks under it.
- **Enrage timer** — top-right, expandable math panel as today.
- **Party frames** — bottom edge: real Jira avatar + name + live ticket counts
  per person. Clicking opens their state; clicking a ticket opens TicketModal.
- **Combat log** — floating bottom-right; the existing damage log, reskinned.
- **Truth ticker** — thin strip below the arena with per-column stale counts
  and the blocked list with reasons. Real data at a glance, no metaphor.

## State mapping (Jira → fight)

| Jira state | In the arena |
|---|---|
| Person has non-stale, non-blocked work in flight | Combat stance, breathing idle, occasional swings |
| `done` pulse (ticket completed) | Full attack: lunge, slash glow, boss hit-flash, floating −N damage number, HP bar drains, screen shake scaled to points |
| All of a person's tickets stale | Character kneels, exhausted, dimmed |
| Person has a flagged (blocked) ticket | Sprite knocked down, red beacon overhead; also listed in ticker |
| `scope-added` pulse (mid-sprint addition) | Boss casts a summon: green heal flash, +N floats up, a minion creature spawns beside the boss. One minion per mid-sprint ticket still open; completing it kills the minion |
| Enraged (projected finish misses sprint end) | Boss eyes burn red, arena lighting shifts red, ember rate doubles |
| Unassigned tickets | No fighter; they exist in the HP bar, ticker, and as minions if scope-added |

## Tech

- **Stack:** react-three-fiber + drei + @react-three/postprocessing
  (UnrealBloom, vignette, optional DOF) inside the existing Vite app.
- **Sprites:** billboarded planes, nearest-neighbor textures, sprite-sheet
  animation via UV offsets.
- **Asset pipeline — none.** Characters are defined as pixel matrices +
  palettes in code (JS/JSON grids rendered to canvas textures at runtime).
  Editing a haircut is a code review, not an art tool round-trip.
- **Frames per character:** idle ×2, attack ×3, kneel ×1, down ×1.
  Boss: idle ×2, hit, summon-cast, enraged idle ×2. Minion: idle ×2, death ×2.
- **Environment:** reflective floor (drei MeshReflectorMaterial), fog, 2–3
  point lights keyed to app theme, ember/dust particle system, slow camera
  drift on an ellipse; event-driven shake and punch-in.

## Sprite roster

Hand-made pixel sprites per teammate (MVP Team, board 28): Serban, Calin,
Cristina, Andrei, Alex, Corina, Mihai — plus any active assignee discovered in
the snapshot. Unknown/new assignees get a fallback "recruit" sprite until a
bespoke one lands. Sprite drafts are art-directed by Bogdan before shipping.

## What survives unchanged

- Data layer: `useSnapshot`, `usePulses`, `timeMachine.stateAt`, shared
  `derive.js` stats. The arena is a pure function of `view` + live pulses.
- Standup overlay and retro scrubber: retro replays the fight (pulses are
  suppressed in retro exactly as today).
- TicketModal, theming via CSS variables (scene lights/palette read the same
  tokens), Header and mode switching.
- The old FactoryLine component retires after the arena ships.

## Out of scope

- Audio.
- Pixelized-avatar generation (rejected: quality too variable).
- Photoreal/rigged 3D characters (rejected: uncanny, heavy pipeline).
- Per-ticket readable cards in ambient view (moved to ticker/modal/standup).

## Open questions (to resolve during implementation)

- Exact party row composition when >10 active assignees (row wraps vs scales).
- Whether DOF stays on (readability on a far wall display) — ship behind a
  toggle, default off, decide on the actual TV.
- Minion cap before they cluster into a "horde" stack (likely 6).
