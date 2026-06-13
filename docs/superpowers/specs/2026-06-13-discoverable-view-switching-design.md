# Discoverable view-switching — design

2026-06-13 · approved direction: **A + B** — elevate the view switcher AND add a
gentle ambient discovery cue (glow on the switcher + a rotating ticker hint).

## Problem

Sprint Boss has three views (`ambient`, `standup`, `retro`) behind a small
color-inverted segmented control in the top-right header. On a wall display a
first-time or casual viewer never learns that **standup mode exists** — the
control doesn't read as "you can change what's on screen," and triggering it
feels hidden. Goal: advertise the door (discoverability), not make the
transition flashier.

## Decisions

- **A1 — Elevate the switcher.** Reframe the seg-ctl as an obvious view
  switcher: a quiet `VIEW` label before it, a leading glyph per mode, larger
  targets, a stronger active state (ink-invert + teal accent so the live mode
  reads across a room), and a `data-tip` per button naming the view + its
  shortcut. Glyphs are a draft for Bogdan's art pass.
- **A2 — Keyboard shortcuts.** `A`/`S`/`R` → ambient/standup/retro; `Esc` keeps
  its existing overlay-exit behavior. Global handler, suppressed while the
  ticket modal (`.backdrop`) owns the keys.
- **B — Gentle discovery cue (ambient-only).** One shared cadence drives both
  forms: while in ambient mode, every ~80 s a calm ~7 s *cue window* fires — the
  standup button breathes a slow glow and the truth ticker rotates in a hint.
  Never fires in standup/retro. Always-on (serves a rotating wall audience).
- **Cadence:** `periodMs = 80_000`, `windowMs = 7_000` (tunable constants).
- **Audience model:** always-on, not "back off after first standup" (a wall has
  a rotating audience; the cue is calm enough to leave running).

## Architecture

```
App
 ├─ useDiscoveryCue(mode) ──▶ cueing: boolean   (true only during a cue window, ambient only)
 ├─ keyboard A/S/R handler
 ├─ Header        ◀── cueing  (glow the standup button)
 └─ RaidView      ◀── cueing
      └─ TruthTicker ◀── hint  (render the rotating hint when cueing)
```

- **`src/discoveryCue.js`** (pure, tested):
  - `discoveryPhase(elapsedMs, { periodMs, windowMs })` → `boolean` — is the cue
    showing right now. The window sits at the **end** of each period:
    `(elapsedMs % periodMs) >= (periodMs - windowMs)`, guarding `periodMs > 0`
    (returns `false` otherwise) and clamping `windowMs` into `[0, periodMs]`.
    Putting the window at the end means `elapsedMs = 0` is quiet, so a
    freshly-entered ambient mode does NOT flash on arrival — the first cue
    arrives ~`(periodMs - windowMs)` in.
  - `CUE_PERIOD_MS = 80_000`, `CUE_WINDOW_MS = 7_000` exported constants.
  - `STANDUP_HINT` exported string constant: `"↑ Standup — each fighter's day
    at a glance"`.
- **`useDiscoveryCue(mode)`** (hook; lives in `src/discoveryCue.js` or `App`):
  resets an elapsed-ms clock to 0 whenever `mode` becomes `ambient`, ticks it
  via an interval (~1 s), and returns
  `mode === 'ambient' && discoveryPhase(elapsed, { periodMs: CUE_PERIOD_MS, windowMs: CUE_WINDOW_MS })`.
  Returns `false` for any non-ambient mode. Cleans up its interval on unmount /
  mode change.
- **`App.jsx`**: call the hook; pass `cueing` to `Header` and `RaidView`; add a
  `keydown` effect mapping `a/s/r` (ignored when `.backdrop` exists or a
  modifier key is held).
- **`Header.jsx`**: restyle the seg-ctl (label, glyphs, active accent,
  `data-tip` per button); when `cueing` is true, mark the standup button (e.g.
  `data-cue`) so CSS plays the breathing glow.
- **`RaidView.jsx`**: thread `cueing` through to `TruthTicker` as a `hint` prop
  (`cueing ? STANDUP_HINT : null`).
- **`TruthTicker.jsx`**: when `hint` is set, render a leading `.ticker-hint`
  item (teal) that fades in; otherwise render as today.
- **`index.css`**: `VIEW` label + switcher restyle; `@keyframes` breathing glow
  on `.seg-ctl button[data-cue]`; `.ticker-hint` style + fade-in. Themed vars
  only; light-mode tweaks under the existing `steel-daylight overrides` if
  needed.

## Data-layer purity

The cue is **presentation-only**, like fighter focus / camera pan / arena
resize: it never touches `view`, is never persisted, and is not part of retro
reconstruction. It reads `mode` (UI state) and wall-clock elapsed only.

## Testing

- `src/discoveryCue.js`: vitest — `discoveryPhase` false in the quiet stretch,
  true inside the end-of-period window, correct across a period boundary;
  `elapsed = 0` is quiet (no arrival flash); `windowMs >= periodMs` ⇒ always on;
  `periodMs <= 0` ⇒ always `false`. Assert `STANDUP_HINT` non-empty and the two
  constants are positive numbers.
- Browser preview: standup button breathes during a cue window and is calm
  otherwise; ticker hint fades in/out in sync; no cue in standup/retro; switcher
  reads as a view control with the active mode obvious; `A/S/R` switch and are
  suppressed while a ticket modal is open; both themes.

## As-built divergences (2026-06-13)

- **Active-state teal underline dropped.** The spec called for "ink-invert +
  teal accent." In dark mode (primary theme) the active pill is the light
  `--ink` fill, and a bright teal underline on it measured ~1.59:1 — invisible.
  The ink-invert pill alone already reads across a room, so the teal underline
  was removed. Brand teal still appears in the cue glow and the ticker hint.
- **A/S/R shortcuts also bail when any `<input>` has focus** (not just the
  ticket modal) so the retro range slider can't be knocked out of retro by a
  stray letter key.
- Minor polish deferred to Bogdan's art pass: the `☰` standup glyph reads like
  a menu icon; the ticker hint has no inter-item separator / fade-out and
  reflows the ticker ~226px when it appears.

## Out of scope / future

- **C — contextual standup-time prompt** (auto/scheduled CTA): deferred.
- Retro-specific cue: the elevated switcher covers retro discoverability.
- "Back off after first standup entry this session": not built; easy to add
  later (gate the hook on a `seenStandup` flag).
