# Light theme redo — "Steel daylight"

**Date:** 2026-06-12
**Status:** Approved by Bogdan (direction A "steel daylight", seam B "framed viewport", all 3D stays dark)

## Goal

Replace the current warm bone/manila light theme with a cool blue-gray "steel daylight"
palette — the night-shift floor with the lights on. Dark mode stays byte-identical.
Every 3D canvas (main arena **and** the standup FighterCard mini-canvas) keeps the dark
backdrop in both themes; light mode affects only the flat UI around them.

## Decisions made

| Question | Decision |
| --- | --- |
| Palette direction | **Steel daylight** — cool blue-gray neutrals, same steel hue family as dark mode |
| 3D scenes in light mode | **All stay dark** — arena + FighterCard mini-canvas; sprites/painted art are tuned for dark ground |
| Light↔dark seam | **Framed viewport** — the arena is a rounded, bordered panel like every other panel; a monitor showing the fight |

## Design

### 1. Token block (`html[data-theme='light']` in `src/index.css`)

Rebuild around cool steel. Approximate starting values (tuned live during implementation):

- `--bg: #dfe4e9` — steel-gray room; `--bg-grid` slightly blue
- `--panel: #f6f8fa`, `--panel-2: #eef1f4`, `--inset: #e2e7ec`
- `--line: #c3ccd6`, `--line-2: #a4b2c0`
- `--ink: #1c2733` (dark steel, not black), `--dim: #5d6f81`, `--faint: #8c9aa8`
- `--steel` family stays mid-tone so machinery silhouettes read on light ground
- `--eye`: darkened teal
- `--belt` / `--belt-stripe` / `--glow-red` / `--hatch-dark`: retoned to the cool family
- Signals (`--teal --amber --red --lime --ember`): keep the darkened-for-light-contrast
  approach, retuned for the cooler ground (amber less brown, red less brick)

### 2. Arena pinned dark, framed

- Add fixed scene tokens to `:root` (theme-independent dark values):
  `--scene-bg: #0a0e13`, `--scene-panel: #0c1219`, `--scene-ink: #e8eef4`,
  `--scene-dim: #8da0b3`.
- Point the `cssVar` reads in `src/raid/ArenaScene.jsx` (background, fog, floor
  texture, floor name captions) at the scene tokens. The scene renders identically in
  both themes with no other scene-code changes. The FighterCard mini-canvas reuses the
  same rig and inherits the dark backdrop.
- Light mode only: the arena container gets the framed-viewport treatment — same
  border/radius language as other panels plus a thin dark inner keyline so the
  light→dark seam looks deliberate. (Dark mode arena chrome untouched.)

### 3. Hardcoded-color sweep

Audit the ~60 hardcoded colors in `index.css` (black drop shadows, white top-sheens,
`.backdrop`, `.standup`, scrollbars, `::selection`). Where they look wrong on light
ground, add `html[data-theme='light']`-scoped overrides (or retokenize when an
existing var fits): shadows go softer and bluer (`rgba(28,39,51,…)`), the panel
top-sheen flips to suit light surfaces. **No dark-mode value changes.**

### 4. Scope

Light treatment covers: header, boss HP bar + scar timeline + enrage timer, fighter
roster bar, dock, truth ticker, standup overlay (chrome around the dark mini-canvas),
boot/no-sprint screens (verify the `BossFigure` SVG golem reads CSS vars and survives).

Out of scope: any scene/sprite code beyond the token re-pointing, theme toggle
mechanics, data layer, new state.

## Testing

- Existing vitest suite unaffected (no pure-logic changes); `npm test` must stay green.
- Visual verification in the browser preview, both themes, including: standup overlay,
  focus lens, blocked cards, enrage ambience, boot screens.
- Final pass is Bogdan's eye on the live app — iterate token values there.
