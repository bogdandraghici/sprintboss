# Enrage timer redesign — "instrument readout"

**Date:** 2026-06-13
**Component:** `EnrageTimer` (`src/components/hud.jsx`), styled in `src/index.css`
**Status:** Design approved (Bogdan), ready for implementation plan.

## Problem

The enrage timer (top-right of the Raid top band) reads as cluttered, especially in
its overrun state:

1. **Redundant double-red** — the big red `1d 10h over` numeral and the red pulsing
   `⚠ ENRAGED` pill say the same thing twice.
2. **No focal point** — four text blocks (faint "ENRAGE TIMER" label, big numeral,
   status pill, faint "ends 12 Jun") sit in a 2×2 grid, all competing.
3. **"over" rides the numeral** — `fmtCountdown` glues the status verb onto the
   countdown instead of treating direction as a state.
4. **Low-value end date** — "ends 12 Jun" on the face duplicates what the countdown
   already implies.
5. **Height instability** — the enraged pill carries padding + box-shadow and "over"
   can wrap, so the enraged state is taller than the healthy state and the whole
   `.raid-top` row reflows. **A fixed height across all states is a hard requirement.**

## Chosen direction: instrument readout (B)

A single-row gauge with a fixed height. A **colored left edge** is the only state
signal on the face; the time magnitude is the hero; the projection math moves entirely
into the existing hover/click panel.

### Face layout (single row, fixed height)

```
│ ENRAGE TIMER · OVER          ⚠ Enraged
│ 1d 10h
↑ 4px left edge (state color)
```

- A quiet panel card: `var(--panel)` background, `var(--line)` border, `0.4rem` radius
  — consistent with the rest of the HUD card language, and it gives the colored left
  edge something to attach to.
- **4px colored left border** = the state signal (replaces the filled pill).
- **Body** (left, vertical): a faint mono label line `ENRAGE TIMER · <suffix>`, then
  the big mono **magnitude** numeral (the hero).
- **Status tag** (right, `margin-left:auto`): a short mono word in the state color.
- **Fixed height** locked regardless of state (target ~72px / 4.5rem, tuned in the
  browser against the HP column) so the top row never reflows. Single-row layout means
  there is no second column to grow.

### State matrix

State is derived from the existing `view.stats` (`s`) — no data-layer changes.

| State (condition)                          | Left edge | Numeral color | Tag         | Label suffix | Pulse |
|--------------------------------------------|-----------|---------------|-------------|--------------|-------|
| **On track** (default)                     | teal      | ink           | `On track`  | `left`       | no    |
| **Enraged** (`s.enraged`, not cleared)     | red       | red           | `⚠ Enraged` | `over`/`left`*| yes  |
| **Cleared** (`s.remaining <= 0 && s.total > 0`) | teal | teal          | `✦ Cleared` | `to spare`/`done`** | no |

*Enraged with the deadline not yet passed (`ms >= 0`) still shows `left` — there is time
on the clock, but the pace projects a miss. When `ms < 0`, suffix is `over`.
**Cleared shows `to spare` while `ms > 0`; if the deadline has also passed, suffix `done`.

Decisions locked with Bogdan: **cleared = teal** (not amber); **keep the enraged
pulse**.

### Suffix / magnitude derivation

- **Magnitude numeral** = `fmtCountdownBody(ms)` — the existing `fmtCountdown` body with
  the `over` word stripped (see helper below). `ms = sprint.end - now`.
- **Suffix word** (in the label line): `ms < 0 ? 'over' : (cleared ? 'to spare' : 'left')`.
  The direction is thus expressed once, as a quiet label word — never glued to the numeral.

### The enraged pulse

A gentle pulse on the **left edge / inset glow only** (calm-base, punchy-event), not on
a pill:

```css
.enrage[data-state='enraged'] {
  border-left-color: var(--red);
  box-shadow: inset 3px 0 1.6rem rgba(255, 82, 99, 0.14);
  animation: enrage-edge 1.6s ease-in-out infinite;
}
@keyframes enrage-edge { 50% { box-shadow: inset 3px 0 1.6rem rgba(255, 82, 99, 0.30); } }
```

This replaces the existing `enrage-pulse` box-shadow on the pill. The room-level
`.app[data-enraged]` ambience is untouched.

### Hover / click math panel

Keep the existing `.enrage-math` panel (hover + `data-open` click toggle, absolute
position, anchored to the widget). One addition: a **`sprint ends <date>`** row, so the
exact end date that left the face still lives here. Existing rows (remaining, velocity,
projected finish, verdict, definition footer) are unchanged.

## Implementation notes

- **`src/lib.js`** — add pure helper `fmtCountdownBody(ms)`: the `fmtCountdown` body
  without the trailing `over`. `fmtCountdown` is currently only consumed by
  `EnrageTimer`; leave it in place but `EnrageTimer` switches to the new helper +
  separate suffix. Unit-test the new helper (days/hours/minutes boundaries, sign
  independence).
- **`src/components/hud.jsx`** — restructure `EnrageTimer`'s JSX into the single-row
  instrument: drop the two-column `text-left`/`text-right` split and the `enrage-chip`
  pill; compute a single `state` value (`'ok' | 'enraged' | 'cleared'`) and a `suffix`
  word; render label line + magnitude + tag; set `data-state` on the button for styling.
- **`src/index.css`** — rewrite the `.enrage*` block: card chrome + 4px left edge,
  fixed height, per-`data-state` edge/numeral/tag colors, the new `enrage-edge`
  keyframe. Remove `.enrage-chip*` and `enrage-pulse`. Update the light-theme override
  if needed (the colored edge is a signal, so it survives the "color = signals only"
  light rule; verify the inset glow reads on the light panel).

## Theming

- Scene/`--scene-*` tokens are not involved — this is DOM, themed normally.
- Light theme: edge colors use the deepened light `--teal`/`--red` tokens automatically.
  The inset red glow may need a lighter alpha on the light panel; check in the
  `steel-daylight overrides` section.

## Testing

- **Unit (vitest):** `fmtCountdownBody` boundaries + that it never emits `over`.
- **Browser preview:** verify the three states at identical height (no `.raid-top`
  reflow when toggling enraged), the pulse reads as calm, the hover panel shows the
  added sprint-end row, and both dark + light themes.

## Out of scope

- No changes to `shared/derive.js` / the stats data layer.
- No change to the room-level `data-enraged` ambience.
- No change to where the widget sits in `RaidView`.
