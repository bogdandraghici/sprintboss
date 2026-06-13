# Enrage Timer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Raid enrage-timer widget as a fixed-height single-row "instrument readout" so it stops feeling cluttered and stops reflowing the top band between states.

**Architecture:** Pure presentation change. A new pure `fmtCountdownBody` helper splits the time magnitude from its direction word. `EnrageTimer` collapses to one row: a quiet panel card with a 4px colored left edge (the only face state-signal), the magnitude numeral as the hero, a short status tag on the right, and the direction word demoted to the faint label. The projection math (plus the exact sprint-end date) lives entirely in the existing hover/click panel. No data-layer changes — state is derived from the existing `view.stats`.

**Tech Stack:** React 18 (plain JSX), CSS variables in `index.css`, vitest for the pure helper.

---

## File Structure

- `src/lib.js` — add pure `fmtCountdownBody(ms)`; refactor `fmtCountdown` to reuse it. (Magnitude formatting, shared.)
- `src/__tests__/lib.test.js` — add unit tests for `fmtCountdownBody`.
- `src/components/hud.jsx` — rewrite `EnrageTimer`'s JSX into the single-row instrument; swap the `fmtCountdown` import for `fmtCountdownBody`.
- `src/index.css` — rewrite the `.enrage*` block (card chrome, fixed height, left-edge state colors, themable glow keyframe); add a light-theme override in the `steel-daylight overrides` section.

State is derived from `view.stats` (`s`):
- **cleared** = `s.remaining <= 0 && s.total > 0`
- **enraged** = `s.enraged` (and not cleared)
- **ok** = otherwise

---

## Task 1: `fmtCountdownBody` helper + tests

**Files:**
- Modify: `src/lib.js:31-39`
- Test: `src/__tests__/lib.test.js`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/lib.test.js`. First extend the import on line 2:

```js
import { firstName, carryoverLabel, ordinal, fmtCountdownBody } from '../lib';
```

Then append this block:

```js
describe('fmtCountdownBody', () => {
  const D = 86400_000, H = 3600_000, M = 60_000;

  it('formats days + hours', () => {
    expect(fmtCountdownBody(1 * D + 10 * H)).toBe('1d 10h');
  });

  it('formats hours + minutes when under a day', () => {
    expect(fmtCountdownBody(2 * H + 5 * M)).toBe('2h 5m');
  });

  it('formats minutes only when under an hour', () => {
    expect(fmtCountdownBody(7 * M)).toBe('7m');
  });

  it('is sign-independent — never emits "over"', () => {
    expect(fmtCountdownBody(-(1 * D + 10 * H))).toBe('1d 10h');
    expect(fmtCountdownBody(-(7 * M))).not.toMatch(/over/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib.test.js`
Expected: FAIL — `fmtCountdownBody is not a function` (or import resolves to undefined).

- [ ] **Step 3: Add the helper and refactor `fmtCountdown` to reuse it**

In `src/lib.js`, replace the current `fmtCountdown` (lines 31-39):

```js
export function fmtCountdown(ms) {
  const over = ms < 0;
  let s = Math.abs(ms) / 1000;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const body = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return over ? `${body} over` : body;
}
```

with:

```js
export function fmtCountdownBody(ms) {
  const s = Math.abs(ms) / 1000;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function fmtCountdown(ms) {
  const body = fmtCountdownBody(ms);
  return ms < 0 ? `${body} over` : body;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib.test.js`
Expected: PASS (all `fmtCountdownBody` cases green; existing lib tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/lib.js src/__tests__/lib.test.js
git commit -m "feat(lib): fmtCountdownBody — magnitude without direction word"
```

---

## Task 2: Rebuild the `EnrageTimer` JSX

**Files:**
- Modify: `src/components/hud.jsx:4` (import) and `src/components/hud.jsx:10-62` (component)

No unit test — R3F/DOM widgets are verified in the browser preview (project convention); the math behind it is covered by Task 1 and the untouched `shared/derive.js`. Browser verification is Task 4.

- [ ] **Step 1: Swap the import**

`src/components/hud.jsx` line 4 — replace `fmtCountdown` with `fmtCountdownBody`:

```js
import { fmtCountdownBody, fmtDate, fmtDays, timeAgo, cls, DAY } from '../lib';
```

- [ ] **Step 2: Replace the component body**

Replace `EnrageTimer` (lines 10-62) with:

```jsx
export function EnrageTimer({ view }) {
  const [, tick] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  const [open, setOpen] = useState(false);

  const now = view.timeTravel ? view.now : Date.now();
  const ms = view.sprint.end - now;
  const s = view.stats;
  const unit = s.anyEstimated ? 'pts' : 'tickets';
  const slack = s.projectedFinish ? (view.sprint.end - s.projectedFinish) / DAY : null;

  const cleared = s.remaining <= 0 && s.total > 0;
  const state = cleared ? 'cleared' : s.enraged ? 'enraged' : 'ok';
  const suffix = cleared ? (ms > 0 ? 'to spare' : 'done') : ms < 0 ? 'over' : 'left';
  const tag = cleared ? '✦ Cleared' : s.enraged ? '⚠ Enraged' : 'On track';

  return (
    <button className="enrage" data-state={state} data-open={open} onClick={() => setOpen((o) => !o)}>
      <span className="enrage-body">
        <span className="label label-faint block">Enrage timer · {suffix}</span>
        <span className="enrage-count">{fmtCountdownBody(ms)}</span>
      </span>
      <span className="enrage-tag">{tag}</span>

      <span className="enrage-math">
        <span>remaining <b>{s.remaining} {unit}</b></span>
        <span>
          velocity <b>{s.velocity.toFixed(1)} {unit}/day</b>{' '}
          <i style={{ color: 'var(--faint)' }}>({view.velocityWindowDays || 3}d rolling)</i>
        </span>
        <span>
          projected finish{' '}
          <b>{s.remaining <= 0 ? 'done' : s.projectedFinish ? fmtDate(s.projectedFinish) : 'never at this pace'}</b>
        </span>
        <span>sprint ends <b>{fmtDate(view.sprint.end)}</b></span>
        <span style={{ color: s.enraged ? 'var(--red)' : 'var(--teal)', fontWeight: 700 }}>
          {s.remaining <= 0
            ? 'scope cleared'
            : slack == null
              ? 'no completions in window'
              : slack >= 0
                ? `${fmtDays(slack)} to spare`
                : `misses deadline by ${fmtDays(-slack)}`}
        </span>
        <span style={{ color: 'var(--faint)' }}>enraged = projected finish past sprint end</span>
      </span>
    </button>
  );
}
```

Notes on what changed vs. the old body:
- Numeral uses `fmtCountdownBody(ms)` (no `over`) with no inline color — color now comes from CSS via `data-state`.
- The `text-left`/`text-right` two-column split and the `enrage-chip` pill are gone.
- Direction word (`over`/`left`/`to spare`/`done`) is appended to the faint label.
- New `sprint ends` row added to the math panel; the `ends 12 Jun` line on the face is removed.

- [ ] **Step 3: Confirm the unit suite still passes (nothing else imported `fmtCountdown`)**

Run: `npx vitest run`
Expected: PASS — no test referenced `fmtCountdown`; `fmtCountdown` still exists for any future caller.

- [ ] **Step 4: Commit (JSX + CSS land together in Task 3; commit there)**

Do not commit yet — the new classes/`data-state` are unstyled until Task 3. Proceed.

---

## Task 3: Rewrite the `.enrage*` CSS

**Files:**
- Modify: `src/index.css:258-278` (dark/base block)
- Modify: `src/index.css` `steel-daylight overrides` section (light override near line 603)

- [ ] **Step 1: Replace the base enrage block**

Replace `src/index.css` lines 258-278 (`/* enrage timer */` through the `:hover`/`[data-open]` rule) with:

```css
/* enrage timer — instrument readout */
.enrage {
  display: flex; align-items: center; gap: 0.8rem; position: relative;
  height: 4.5rem; min-width: 13rem; box-sizing: border-box;
  padding: 0.6rem 0.85rem; text-align: left;
  background: var(--panel); border: 1px solid var(--line);
  border-left: 4px solid var(--teal); border-radius: 0.4rem;
}
.enrage-body { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
.enrage-count { font-family: var(--font-m); font-size: 1.7rem; font-weight: 700; line-height: 1; color: var(--ink); }
.enrage-tag {
  margin-left: auto; white-space: nowrap;
  font-family: var(--font-m); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.12em;
  color: var(--teal);
}

.enrage[data-state='enraged'] {
  --eglow: rgba(255, 82, 99, 0.14);
  --eglow-hi: rgba(255, 82, 99, 0.30);
  border-left-color: var(--red);
  box-shadow: inset 3px 0 1.6rem var(--eglow);
  animation: enrage-edge 1.6s ease-in-out infinite;
}
.enrage[data-state='enraged'] .enrage-count,
.enrage[data-state='enraged'] .enrage-tag { color: var(--red); }
.enrage[data-state='cleared'] .enrage-count,
.enrage[data-state='cleared'] .enrage-tag { color: var(--teal); }
@keyframes enrage-edge { 50% { box-shadow: inset 3px 0 1.6rem var(--eglow-hi); } }

.enrage-math {
  position: absolute; right: 0; top: calc(100% + 0.4rem); z-index: 30;
  background: var(--panel); border: 1px solid var(--line-2); border-radius: 0.5rem;
  padding: 0.7rem 0.9rem; font-family: var(--font-m); font-size: 0.75rem;
  display: none; flex-direction: column; gap: 0.3rem; min-width: 17rem;
  box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.45);
}
.enrage:hover .enrage-math, .enrage[data-open='true'] .enrage-math { display: flex; }
```

(`enrage-chip`, `enrage-chip[data-s=...]`, and `@keyframes enrage-pulse` are intentionally dropped.)

- [ ] **Step 2: Add the light-theme override**

In `src/index.css`, in the `steel-daylight overrides` section (the existing `html[data-theme='light'] .enrage-math` rule is around line 603), add directly after it:

```css
html[data-theme='light'] .enrage[data-state='enraged'] {
  --eglow: rgba(210, 51, 65, 0.10);
  --eglow-hi: rgba(210, 51, 65, 0.22);
}
```

(The dark `--scene-*`-style approach isn't needed — these are themed signal colors. The custom props resolve against the animated element, so the keyframe picks up the light values automatically.)

- [ ] **Step 3: Run the unit suite (sanity — CSS-only, should be unaffected)**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/hud.jsx src/index.css
git commit -m "feat(raid): enrage timer as fixed-height instrument readout

Single-row gauge: 4px colored left edge is the sole face state-signal,
time magnitude is the hero, direction word demoted to the faint label,
status tag on the right. Drops the redundant red pill and the on-face
end date (now in the hover panel). Fixed height kills the top-band
reflow between healthy/enraged states."
```

---

## Task 4: Browser verification

**Files:** none (verification only). Use the project preview tooling, not Bash.

- [ ] **Step 1: Start the mock dev server**

The mock feed exercises animation/event states. Start the preview (`preview_start`) against `npm run mock` if not already running, then load the Raid view.

- [ ] **Step 2: Verify the three states hold the same height**

- Confirm `.enrage` renders at a fixed `4.5rem` height.
- Use the retro/time-machine scrubber (or mock state) to move between **on track**, **enraged**, and **cleared**.
- Take a `preview_snapshot` / `preview_inspect` of `.raid-top` in each state and confirm the HP column does **not** shift vertically (no reflow). This is the headline requirement.

- [ ] **Step 3: Verify the signals read correctly**

- **On track:** teal left edge, ink numeral, `On track` tag, label `Enrage timer · left`.
- **Enraged:** red left edge with a gentle inset pulse, red numeral, `⚠ Enraged` tag, label `· over` (or `· left` if the deadline hasn't passed yet).
- **Cleared:** teal edge, teal numeral + `✦ Cleared` tag, label `· to spare`.
- No `over` text glued to the numeral in any state.

- [ ] **Step 4: Verify the hover/click panel**

- Hover (and click to pin via `data-open`) the widget; the math panel shows remaining, velocity, projected finish, **sprint ends <date>**, the verdict line, and the definition footer.

- [ ] **Step 5: Verify light theme**

- Toggle to light theme (`preview_eval` to flip `data-theme`, or the in-app control). Confirm the colored edge still reads as a clear signal and the enraged inset glow isn't muddy on the light panel (the light `--eglow` override applies). Adjust the alpha values from Task 3 Step 2 if the glow is too weak/strong, then re-commit.

- [ ] **Step 6: Capture proof**

- `preview_screenshot` of the enraged and cleared states (dark + light) to share with Bogdan for the art-direction sign-off.

---

## Self-Review

**Spec coverage:**
- Redundant double-red → pill removed; single state signal (left edge) — Task 2/3. ✔
- No focal point → single-row layout, magnitude is the hero — Task 2/3. ✔
- "over" glued to numeral → `fmtCountdownBody` + label suffix — Task 1/2. ✔
- Low-value end date → moved to math panel (`sprint ends` row) — Task 2. ✔
- Height instability → fixed `4.5rem`, single row; verified no reflow — Task 3/4. ✔
- State matrix (cleared=teal, pulse kept) → Task 2 derivation + Task 3 colors/keyframe. ✔
- Hover panel preserved + end-date added — Task 2. ✔
- Light theme — Task 3 Step 2 + Task 4 Step 5. ✔
- No data-layer change — confirmed; only `lib.js`/`hud.jsx`/`index.css` touched. ✔

**Placeholder scan:** No TBD/"handle edge cases"/vague steps — every code step shows full code; the one tunable (glow alpha, card height) has a concrete starting value plus an explicit browser-tuning step. ✔

**Type/name consistency:** `fmtCountdownBody` defined in Task 1, imported in Task 2; classes `enrage-body`/`enrage-count`/`enrage-tag` and `data-state` values `ok|enraged|cleared` match between Task 2 JSX and Task 3 CSS; custom props `--eglow`/`--eglow-hi` defined and referenced consistently across base + light + keyframe. ✔
