# Discoverable View-Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `standup` view discoverable on the wall display, per `docs/superpowers/specs/2026-06-13-discoverable-view-switching-design.md` — elevate the view switcher, add A/S/R keyboard shortcuts, and run a gentle ambient discovery cue (standup-button glow + rotating ticker hint).

**Architecture:** A pure, tested `discoveryPhase` + a thin `useDiscoveryCue(mode)` hook live in `src/discoveryCue.js`. `App` runs the hook and a global keydown handler, passing one `cue` boolean to `Header` (glows the standup button) and through `RaidView` to `TruthTicker` (shows the hint). The cue is presentation-only — it never touches `view` or retro.

**Tech Stack:** React 18 (plain JSX, no TS), vitest, CSS vars in `src/index.css`. No new dependencies.

**Conventions:** commits go directly to `main`; `npm test` runs vitest (currently 168 passing); DOM/R3F components are preview-verified, pure logic gets unit tests. Run all commands from the repo root.

---

### Task 1: `discoveryCue.js` — pure phase fn, constants, hint, hook (TDD)

**Files:**
- Create: `src/discoveryCue.js`
- Test: `src/__tests__/discoveryCue.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/discoveryCue.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { discoveryPhase, CUE_PERIOD_MS, CUE_WINDOW_MS, STANDUP_HINT } from '../discoveryCue';

const OPTS = { periodMs: 100, windowMs: 10 }; // window = last 10ms of every 100ms

describe('discoveryPhase', () => {
  it('is quiet at elapsed 0 (no flash on entering ambient)', () => {
    expect(discoveryPhase(0, OPTS)).toBe(false);
  });
  it('is quiet through the bulk of the period', () => {
    expect(discoveryPhase(50, OPTS)).toBe(false);
    expect(discoveryPhase(89, OPTS)).toBe(false);
  });
  it('is on during the end-of-period window', () => {
    expect(discoveryPhase(90, OPTS)).toBe(true);
    expect(discoveryPhase(99, OPTS)).toBe(true);
  });
  it('wraps correctly into the next period', () => {
    expect(discoveryPhase(100, OPTS)).toBe(false); // start of period 2 — quiet
    expect(discoveryPhase(195, OPTS)).toBe(true);  // window of period 2
  });
  it('windowMs >= periodMs means always on', () => {
    expect(discoveryPhase(0, { periodMs: 100, windowMs: 100 })).toBe(true);
    expect(discoveryPhase(50, { periodMs: 100, windowMs: 200 })).toBe(true);
  });
  it('periodMs <= 0 is always false (guard)', () => {
    expect(discoveryPhase(50, { periodMs: 0, windowMs: 10 })).toBe(false);
    expect(discoveryPhase(50, { periodMs: -5, windowMs: 10 })).toBe(false);
  });
});

describe('constants', () => {
  it('period and window are positive, window shorter than period', () => {
    expect(CUE_PERIOD_MS).toBeGreaterThan(0);
    expect(CUE_WINDOW_MS).toBeGreaterThan(0);
    expect(CUE_WINDOW_MS).toBeLessThan(CUE_PERIOD_MS);
  });
  it('STANDUP_HINT is a non-empty string mentioning standup', () => {
    expect(typeof STANDUP_HINT).toBe('string');
    expect(STANDUP_HINT.length).toBeGreaterThan(8);
    expect(STANDUP_HINT.toLowerCase()).toContain('standup');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/__tests__/discoveryCue.test.js`
Expected: FAIL — cannot resolve `../discoveryCue`.

- [ ] **Step 3: Implement `src/discoveryCue.js`**

```jsx
// src/discoveryCue.js
// Discovery cue: a gentle, recurring nudge that the standup view exists. Pure
// cadence below; thin hook at the bottom. Presentation-only — reads UI `mode`
// and wall-clock elapsed, never touches `view` or retro reconstruction.
import { useEffect, useRef, useState } from 'react';

export const CUE_PERIOD_MS = 80_000; // one cue window every ~80s of ambient
export const CUE_WINDOW_MS = 7_000;  // each window lasts ~7s
export const STANDUP_HINT = "↑ Standup — each fighter's day at a glance";

// Is the cue showing at this elapsed time? The window sits at the END of each
// period, so elapsed 0 (just entered ambient) is quiet — no flash on arrival.
export function discoveryPhase(elapsedMs, { periodMs, windowMs }) {
  if (!(periodMs > 0)) return false;
  const w = Math.max(0, Math.min(windowMs, periodMs));
  return (elapsedMs % periodMs) >= (periodMs - w);
}

// Returns true only during a cue window while in ambient mode. Resets its
// elapsed clock whenever ambient is (re-)entered; ticks ~1s (window is 7s, so
// 1s granularity is plenty — the CSS animation carries the smoothness).
export function useDiscoveryCue(mode) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (mode !== 'ambient') { setElapsed(0); return undefined; }
    start.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Date.now() - start.current), 1000);
    return () => clearInterval(id);
  }, [mode]);
  return mode === 'ambient'
    && discoveryPhase(elapsed, { periodMs: CUE_PERIOD_MS, windowMs: CUE_WINDOW_MS });
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — 168 existing + new file green.

- [ ] **Step 5: Commit**

```bash
git add src/discoveryCue.js src/__tests__/discoveryCue.test.js
git commit -m "feat(discovery): discoveryPhase cadence + useDiscoveryCue hook"
```

---

### Task 2: Wire the cue + keyboard shortcuts into `App`

**Files:**
- Modify: `src/App.jsx`

No unit test — App wiring is preview-verified (Task 5).

- [ ] **Step 1: Import the hook**

Add to the import block at the top of `src/App.jsx` (after the `TooltipLayer` import):

```js
import { useDiscoveryCue } from './discoveryCue';
```

- [ ] **Step 2: Call the hook inside the component**

In `App()`, the existing state lines are:

```js
  const [mode, setMode] = useState('ambient');
  const [selected, setSelected] = useState(null);
  const [retroT, setRetroT] = useState(null);
```

Immediately after them, add:

```js
  const cue = useDiscoveryCue(mode);
```

- [ ] **Step 3: Add the A/S/R keyboard shortcuts**

The component already has an `exitToAmbient` callback and a retro `useEffect`. After the existing retro `useEffect` (the one depending on `[mode, snap, retroT]`), add a new effect:

```js
  // A / S / R jump between views — quick discoverability for whoever's driving.
  // Suppressed while the ticket modal owns the keys, or when a modifier is held.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('.backdrop')) return; // ticket modal
      const k = e.key.toLowerCase();
      if (k === 'a') setMode('ambient');
      else if (k === 's') setMode('standup');
      else if (k === 'r') setMode('retro');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
```

- [ ] **Step 4: Pass `cue` to Header and RaidView**

The current render lines are:

```jsx
      <Header view={view} mode={mode} setMode={setMode} theme={theme} setTheme={setTheme} refetch={refetch} />
      <main className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: '1fr' }}>
        <RaidView view={view} pulses={mode === 'retro' ? [] : pulses} onSelect={setSelected} />
      </main>
```

Change them to add `cue`:

```jsx
      <Header view={view} mode={mode} setMode={setMode} theme={theme} setTheme={setTheme} refetch={refetch} cue={cue} />
      <main className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: '1fr' }}>
        <RaidView view={view} pulses={mode === 'retro' ? [] : pulses} onSelect={setSelected} cue={cue} />
      </main>
```

- [ ] **Step 5: Verify suite stays green & commit**

Run: `npm test`
Expected: PASS (168 + Task 1's tests; nothing imports App in tests).

```bash
git add src/App.jsx
git commit -m "feat(discovery): wire cue hook + A/S/R shortcuts in App"
```

---

### Task 3: Header — elevate the switcher + standup glow

**Files:**
- Modify: `src/components/Header.jsx`
- Modify: `src/index.css` (seg-ctl restyle + glow keyframe)

- [ ] **Step 1: Replace the seg-ctl block in `Header.jsx`**

Update the function signature to accept `cue`:

```jsx
export default function Header({ view, mode, setMode, theme, setTheme, refetch, cue = false }) {
```

Add a module-level constant above the component (after any imports, before `export default function`):

```jsx
// Draft glyphs (Bogdan's art pass may swap these) + per-view tooltip copy.
const VIEWS = {
  ambient: { glyph: '◍', tip: 'Ambient — the live boss fight (A)' },
  standup: { glyph: '☰', tip: 'Standup — each fighter\'s daily board (S)' },
  retro:   { glyph: '⏪', tip: 'Retro — scrub the whole sprint (R)' },
};
```

Replace the existing seg-ctl markup:

```jsx
        <div className="seg-ctl">
          {['ambient', 'standup', 'retro'].map((m) => (
            <button key={m} data-on={mode === m} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>
```

with:

```jsx
        <span className="label label-faint">view</span>
        <div className="seg-ctl">
          {['ambient', 'standup', 'retro'].map((m) => (
            <button
              key={m}
              data-on={mode === m}
              data-cue={m === 'standup' && cue}
              onClick={() => setMode(m)}
              data-tip={VIEWS[m].tip}
            >
              <span className="seg-glyph" aria-hidden="true">{VIEWS[m].glyph}</span>
              {m}
            </button>
          ))}
        </div>
```

- [ ] **Step 2: Restyle the seg-ctl + add the glow keyframe in `index.css`**

Replace the existing seg-ctl rules (currently around lines 289–295):

```css
.seg-ctl { display: flex; border: 1px solid var(--line-2); border-radius: 0.45rem; overflow: hidden; }
.seg-ctl button {
  font-size: 0.68rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 0.42em 0.9em; color: var(--dim); border-right: 1px solid var(--line);
}
.seg-ctl button:last-child { border-right: 0; }
.seg-ctl button[data-on='true'] { background: var(--ink); color: var(--bg); }
```

with:

```css
.seg-ctl { display: flex; border: 1px solid var(--line-2); border-radius: 0.45rem; overflow: hidden; }
.seg-ctl button {
  display: inline-flex; align-items: center; gap: 0.4em;
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 0.46em 0.95em; color: var(--dim); border-right: 1px solid var(--line);
}
.seg-ctl button:last-child { border-right: 0; }
.seg-ctl button:hover { color: var(--ink); }
.seg-ctl button[data-on='true'] { background: var(--ink); color: var(--bg); box-shadow: inset 0 -2px 0 var(--teal); }
.seg-glyph { font-size: 0.85em; opacity: 0.9; }
/* discovery cue: the standup button breathes while the wall sits idle in
   ambient, drawing the eye to a view people might not know exists. */
.seg-ctl button[data-cue='true'] { animation: cue-glow 2.2s ease-in-out 3; }
@keyframes cue-glow {
  50% { box-shadow: 0 0 0.5rem var(--teal), inset 0 0 0 1px var(--teal); color: var(--teal); }
}
```

- [ ] **Step 3: Verify suite stays green**

Run: `npm test`
Expected: PASS (no test imports Header).

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.jsx src/index.css
git commit -m "feat(discovery): elevate view switcher (glyphs, label, active accent) + standup glow"
```

---

### Task 4: TruthTicker — rotating discovery hint

**Files:**
- Modify: `src/raid/RaidView.jsx`
- Modify: `src/components/TruthTicker.jsx`
- Modify: `src/index.css` (ticker-hint style)

- [ ] **Step 1: Thread `cue` → `hint` in `RaidView.jsx`**

Add the import near the other imports at the top of `src/raid/RaidView.jsx`:

```js
import { STANDUP_HINT } from '../discoveryCue';
```

Update the signature:

```jsx
export default function RaidView({ view, pulses, onSelect, cue = false }) {
```

Update the `TruthTicker` render line (currently the last child of `.raidview`):

```jsx
      <TruthTicker view={view} onSelect={onSelect} focus={focus} hint={cue ? STANDUP_HINT : null} />
```

- [ ] **Step 2: Render the hint in `TruthTicker.jsx`**

Update the signature:

```jsx
export default function TruthTicker({ view, onSelect, focus = null, hint = null }) {
```

The component returns `<div className="ticker mono"> … </div>`. Add the hint as the first child, immediately inside that div, before the `{lanes.map(...)}` expression:

```jsx
      {hint && <span className="ticker-hint">{hint}</span>}
```

- [ ] **Step 3: Style `.ticker-hint` in `index.css`**

After the existing `.ticker-ok` rule (around line 416), add:

```css
.ticker-hint { color: var(--teal); font-weight: 600; animation: fade 0.4s ease-out; }
```

(The `fade` keyframe already exists in this file — reused here.)

- [ ] **Step 4: Verify suite stays green**

Run: `npm test`
Expected: PASS (no test imports these components).

- [ ] **Step 5: Commit**

```bash
git add src/raid/RaidView.jsx src/components/TruthTicker.jsx src/index.css
git commit -m "feat(discovery): rotating standup hint in the truth ticker"
```

---

### Task 5: Browser verification + docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Verify in the browser preview**

Use the running preview (`sprint-boss-live` on 5173). Confirm:

1. The switcher reads as a view control — `view` label, a glyph + word per button, active mode shows the ink fill + teal underline.
2. Hover a switcher button → tooltip names the view + its shortcut letter.
3. Press `S` → standup overlay opens; `A` → back to ambient; `R` → retro; pressing keys while a ticket modal is open does NOT switch.
4. Discovery cue: to avoid an 80s wait, temporarily set `CUE_PERIOD_MS = 12_000` in `src/discoveryCue.js`, reload, stay in ambient — after ~5s the standup button breathes a teal glow AND the ticker shows "↑ Standup — each fighter's day at a glance"; both go quiet between windows. **Restore `CUE_PERIOD_MS = 80_000` afterward.**
5. Enter standup or retro → no glow, no ticker hint (cue is ambient-only).
6. Toggle light theme → glow/hint/active-accent all read on white panels.

Capture a screenshot of the elevated switcher (and one mid-glow) as proof.

- [ ] **Step 2: Update `CLAUDE.md`**

In the Raid section where modes are described, add a sentence (place it near the existing standup-mode bullet under "Architecture rules"):

```markdown
- **View discoverability**: the header view-switcher (`Header.jsx`) is an
  explicit `view` control (glyph + label per mode, active ink+teal accent,
  per-view tooltips with A/S/R shortcuts). A presentation-only discovery cue
  (`src/discoveryCue.js`: pure `discoveryPhase` + `useDiscoveryCue` hook, tested)
  fires a gentle ~7s window every ~80s while idle in ambient — the standup
  button breathes (`.seg-ctl button[data-cue]`) and the truth ticker rotates in
  `STANDUP_HINT`. Ambient-only; never touches `view`/retro. A/S/R shortcuts and
  the cue are wired in `App.jsx`.
```

- [ ] **Step 3: Final suite + commit**

Run: `npm test`
Expected: PASS.

```bash
git add CLAUDE.md
git commit -m "docs: record view-switcher discoverability + discovery cue convention"
```
