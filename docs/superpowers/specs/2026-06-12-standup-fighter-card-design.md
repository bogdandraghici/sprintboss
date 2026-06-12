# Standup fighter card — design

**Date:** 2026-06-12
**Status:** Approved (brainstorm)

## Goal

In standup mode, display a full-height **fighter card** on the side of the
modal showing the selected person's animated fighter sprite, name, and stats —
next to the existing "moved / parked" board.

## Layout

Restructure the `.su-board` panel in `StandupOverlay`
(`src/components/Modes.jsx`) into a two-column flex (`.su-body`):

- **Left:** fixed-width fighter card (`.fighter-card`).
- **Right:** the existing moved/parked board (flex-1).

The board keeps its meta line (`N moved · N parked`) but the person's name now
headlines the card, so the board's redundant avatar+name header is trimmed to
just the meta.

## New component: `src/raid/FighterCard.jsx`

Self-contained presentational card. Props:

- `fighter` — a party object from `deriveParty` (`name, avatar, open, done,
  stale, blocked, status, issues`).
- `movedCount` — selected person's `moved.length` from `buildStandup`.
- `parkedCount` — selected person's `still.length` from `buildStandup`.

Structure:

1. **Art stage (`.fc-art`)** — a small R3F `<Canvas>` with its own setup, NOT
   the arena's:
   - Lights mirror `ArenaScene`: `ambientLight intensity 0.35` + the two
     point lights (cyan back-light, warm key). No `fog`.
   - Background transparent (or panel tone) — set via the canvas style / a
     `<color>` only if needed; prefer transparent so the card's CSS gradient
     shows.
   - Camera framed close on a single fighter at origin (e.g.
     `position [0, 1.1, 4]`, fov ~30) — tune live in preview.
   - Reuses the **exact arena rig selection**: `artSlugFor(name)` →
     `FighterArtRig`, else `FighterSprite`. Pass `attack={null}`,
     `focus={null}`, `onFocus` no-op, `tableau={null}`, `position={[0,0,0]}`,
     `phase={0}`, `lite`.
   - The rig self-animates idle + shadow-boxing off the render clock
     (`flourish.js`), so the fighter is live with no extra wiring. `frameloop`
     stays default ("always") so the idle animation runs.
   - A **status badge** (`.fc-badge`) overlays top-left: FIGHTING / RESTING /
     DOWN / EXHAUSTED, color-coded (fighting=teal, resting=dim, exhausted=gold,
     down=red).
   - Contact shadow grounds the sprite (CSS radial under the canvas, or rely on
     the rig's own; simplest is a CSS shadow element).
2. **Name + class (`.fc-name`)** — full name + a class/role line derived from
   the roster weapon via `weaponClassLabel(name)`.
3. **Stat grid (`.fc-stats`)** — the 5 numeric cells from `cardStats(...)`:
   Completed · Moved (24h) · In flight · Stale · Blocked. The 6th element is the
   **status**, surfaced as the `.fc-badge` over the art (not a grid cell), so
   the card carries all 6 facts. Color cues: done=teal, stale=gold,
   blocked=red.

## Data

No data-layer changes. `StandupOverlay` already receives `snap`.

- Compute `deriveParty(snap)` once (memoized), key fighters by name.
- For the selected `person`, look up the matching fighter and pass it plus
  `person.moved.length` / `person.still.length` to `<FighterCard>`.
- Reusing `deriveParty` means the card's numbers match the live battle exactly.
- **Verify:** `deriveParty` reads `view.aging` and `view.flags` for the `stale`
  count. Confirm `snap` carries `aging` (and that `flags?.noChangelog` is
  absent/false on the live snapshot); if `aging` is missing, `stale` falls back
  to 0 — acceptable, but check whether RaidView threads a richer `view` we
  should pass instead.

## Pure helper + test: `src/raid/fighterCard.js`

Vitest-tested pure functions (honors the "pure logic is tested, R3F verified in
preview" convention):

- `cardStats(fighter, movedCount, parkedCount)` → ordered array of
  `{ key, label, value, tone }` (tone ∈ `done|stale|blocked|null`).
- `weaponClassLabel(name)` → e.g. `sword` → "Swordfighter", `daggers` →
  "Daggers", `bow` → "Archer", `staff` → "Mage", `hammer` → "Breaker"
  (final wording TBD with Bogdan; the mapping is the testable contract).
  Unknown/recruit → a neutral fallback ("Recruit").

Tests cover: stat ordering/values/tones, and the weapon→label mapping incl.
fallback.

## CSS (`index.css`)

Add dark-industrial styles matching the approved mockup:
`.su-body` (two-col flex), `.fighter-card`, `.fc-art`, `.fc-badge`,
`.fc-name`, `.fc-stats`, `.fc-stat`. Reuse existing CSS variables.

## Caveat to verify in preview

This mounts a **second WebGL canvas** while the standup overlay is open (the
arena canvas may still be mounted underneath). Fine on desktop; on weak TV
hardware (`?lite`) keep dpr low and confirm it doesn't choke. If it does,
consider unmounting the arena canvas while standup is open, or fall back to a
static rasterized sprite under `lite`.

## Out of scope

- Changing the standup data model (`buildStandup`).
- Any change to the arena scene itself.
- Final art direction / class-label wording (Bogdan's pass).
