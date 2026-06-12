# Mechanic tooltips — design

2026-06-13 · approved direction: custom themed tooltip layer, "metaphor + plain meaning" voice.

## Problem

Sprint Boss invents game mechanics (enrage, carryover ×N, staleness, scope scars,
HEAL log entries, downed fighters…) whose real Jira meaning — and especially the
hidden thresholds behind them — isn't readable from the pixels. Today the only
explanation layer is a scattering of native `title` attributes: slow, unstyled,
inconsistent, and mute about the *concept* (a scar's title gives date + keys but
never says what a scar is).

## Decision summary

- **One tooltip system**: a `data-tip="…"` attribute on any DOM element, rendered
  by a single shared `TooltipLayer` bubble at the app root. No library.
- **Voice**: one succinct line that keeps the fiction but lands the fact —
  "Scope added — the boss regains HP." Dynamic numbers (aging thresholds,
  ordinals, counts) are interpolated, never vague.
- **Tooltips live in the DOM only.** The 3D arena gets none; every arena concept
  has a DOM counterpart (HP bar, chips, dock, log) that carries the tip.
- **Ambience is not explained.** Shadow-boxing, afterglow embers, debris, boss
  cracks, victory/defeat poses, hit flashes: no tooltips. Camera/resize
  discoverability hints and a "?" legend overlay are explicitly out of scope.

## Architecture

### TooltipLayer (`src/components/TooltipLayer.jsx`)

Mounted once in `App.jsx`. ~40 lines:

- Document-level `pointerover`: `e.target.closest('[data-tip]')` → arm a ~150 ms
  show timer for that element's `data-tip` string. Nested `[data-tip]` resolves
  to the innermost (so a scar's tip wins over the scar-strip's tip).
- `pointerout` past the target, `pointerdown`, `scroll` (capture), and `Escape`
  hide immediately.
- Renders one `position: fixed` `<div class="tipbox" aria-hidden="true">`.
  Placement: centered above the target rect; flips below when the target sits in
  the top band (rect.top < ~64 px); clamped to the viewport with an 8 px margin.
  `position: fixed` + root mounting is the whole reason this isn't a CSS
  `::after` — dock columns scroll internally and would clip per-element bubbles.
- Reads the tip text fresh on show (attribute, not cached) so dynamic strings
  stay current.

Styling in `index.css` (`.tipbox`): panel background, 1 px `--line` border,
`--ink` text at ~0.72 rem, max-width ~280 px, subtle shadow; all via existing
CSS vars so both themes work for free. No animation beyond a fast opacity fade —
calm base state.

TV behavior: no pointer → never fires. `?lite` unaffected (pure DOM).

### Copy module (`src/tipCopy.js`)

Pure, vitest-tested formatters; components call them and set `data-tip`.
Functions (names indicative): `ageTip(days, band, aging)`, `carryTip(priorSprints)`,
`scopeTip()`, `hpSegTip(issue, unit)`, `scarStripTip()`, `scarTip(group, unit)`,
`creepTip(n, unit)`, `logTagTip(type)`, `storyMeterTip(progress)`,
`statusTip(status)`, `chipTip(name, active)`, `staleCountTip(aging)`,
`beaconTip()`, `unestimatedTip(defaultPoints, unit)`, `bossHpTip()`.

### Migration rule

Every element that gains `data-tip` **loses its native `title`** (no double
bubble). All `title`s in touched components migrate, including informational
ones (ticket card key+summary, issue-type icon, fighter chip name), so the app
ends with one consistent system. Known loss: native titles were keyboard/AT
accessible; the bubble is hover-only and `aria-hidden`. Accepted for a
wall-display app — existing `aria-label`s stay.

### Enrage exception

`.enrage` already opens its math panel on hover/click; a tooltip would collide.
Instead the math panel gains a one-line definition footer:
`enraged = projected finish past sprint end` (faint, mono, last row). No
`data-tip` anywhere on the enrage button.

## Copy table

Dynamic values in `{braces}`; `unit` is `pts`/`tickets` per `stats.anyEstimated`.

### HUD band (`src/components/hud.jsx`)

| Target | Tip |
|---|---|
| "Boss HP" label | Boss HP = open work. One segment per ticket — it drains as tickets land; gold burned in the last ~2h. |
| `.hpseg` (migrates title) | {key} · {points} {unit}[ · done][ · blocked][ · joined mid-sprint (scope)] |
| `(+N creep)` counter | {n} {unit} joined after sprint start — the boss healed. |
| Scar strip (`.scarline`) | Scope scars — each ✚ marks tickets that joined after the sprint started. |
| `.scar` (migrates title) | {date} · +{pts} {unit} joined mid-sprint: {keys…} |
| `.dlog-tag` HIT | Ticket landed — the boss takes damage. |
| `.dlog-tag` HEAL | Scope added — the boss regains HP. |
| `.dlog-tag` BLOCK | Ticket flagged blocked — its fighter goes down. |
| `.dlog-tag` CLEAR | Block lifted — the fighter is back up. |
| `.dlog-tag` UNDO | Done ticket reopened — its damage is undone. |
| `.enrage-math` footer (not a tip) | enraged = projected finish past sprint end |

### Cards & dock (`src/components/Ticket.jsx`, `Dock.jsx`, `TicketModal.jsx`)

| Target | Tip |
|---|---|
| Ticket card (migrates title) | {key} — {summary} |
| `.ticket-age` fresh | {d} in this column — fresh (≤{freshDays}d). |
| `.ticket-age` warm | {d} in this column — warm; stale past {warmDays}d. |
| `.ticket-age` stale | {d} in this column — stale (past {warmDays}d without moving). |
| `.ticket-carry` (migrates title) | {ordinal} sprint for this ticket — carried over {n}×.[ Amber from ×3.] *(amber clause only when heavy)* |
| `.ticket-key` when `data-scope` | Joined mid-sprint — scope creep. |
| `.itype` icon (migrates title) | {issueType} |
| `.story-meter` (migrates title) | {done}/{total} of this story's sprint tickets done — counts every column. |
| Modal UNESTIMATED chip | No estimate — assumed {defaultPoints} {unit}. |
| Modal blocked `.beacon` | Blocked — the beacon cools as the block ages (~24h). |

### Fighters & ticker (`FighterBar.jsx`, `FighterCard.jsx`, `TruthTicker.jsx`)

| Target | Tip |
|---|---|
| `.fighter-chip` (migrates title) | {name} — click to focus the deck on their tickets. / {name} — click again to clear focus. *(when active)* |
| `.fc-badge` fighting | Fighting — has fresh work in flight. |
| `.fc-badge` resting | Resting — nothing open right now. |
| `.fc-badge` exhausted | Exhausted — every open ticket has gone stale. |
| `.fc-badge` down | Down — has a blocked ticket. |
| `.ticker-stale` | Parked past the stale threshold ({warmDays}d). |

Low-priority (same PR if trivial, else skip): `FighterCard` stat cells
("Updated 24h" → "tickets moved in the last 24h"; "Stale" → reuse stale
definition).

### Not tooltipped (deliberate)

Shadow-boxing, afterglow, debris, boss cracks/stages, hit flash, victory/defeat
tableaux, minion sprites, camera pan/zoom, arena resize grip, dock blocked
reasons (inline already), ticker blocker buttons (reason is the button text),
retro marks (existing titles migrate as-is, no concept change).

## Testing

- `tipCopy.js`: vitest — threshold interpolation from a fake `aging` config,
  carryover ordinals/heavy clause, log-tag map completeness vs `LOG_TYPES`,
  status map completeness vs the four statuses, pluralization.
- `TooltipLayer`: browser preview — bubble shows/hides on hover, innermost-wins
  nesting (scar inside scarline), flip below for top-band targets, no clipping
  when hovering a card deep in a scrolled dock column, both themes, hides on
  click/scroll/Esc.

## Out of scope / future

"?" legend overlay for the TV case (nobody hovers a wall display); camera and
resize discoverability hints; tooltips inside the 3D canvas.
