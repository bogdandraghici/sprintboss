# Fighter Roster Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a horizontal bar of fighter thumbnails above the ticket dock; clicking a thumbnail focuses that fighter, filtering the whole command deck.

**Architecture:** The bar is a presentation-only view over the existing focus lens. `RaidView` already holds `focus`/`setFocus` and the derived `party`; the new `FighterBar` component receives `party`, `focus`, and `onFocus` and drives the same `setFocus` that the arena and HP bar already use. No new state, no `view` mutation. A `firstName` helper currently local to `ArenaScene` is lifted into `lib.js` so the bar and the scene share one copy.

**Tech Stack:** React 18 (plain JSX), Vitest, CSS variables in `index.css`. The existing `Avatar` component handles photo/initials rendering.

---

### Task 1: Extract `firstName` into lib.js (shared helper)

**Files:**
- Modify: `src/lib.js` (add export)
- Modify: `src/raid/ArenaScene.jsx:242-245` (remove local, import from lib)
- Test: `src/__tests__/lib.test.js` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { firstName } from '../lib';

describe('firstName', () => {
  it('takes the first token and capitalizes it', () => {
    expect(firstName('Ada Lovelace')).toBe('Ada');
  });
  it('splits on dots and underscores', () => {
    expect(firstName('grace.hopper')).toBe('Grace');
    expect(firstName('alan_turing')).toBe('Alan');
  });
  it('handles a single lowercase token', () => {
    expect(firstName('linus')).toBe('Linus');
  });
  it('falls back to the whole string when no token splits out', () => {
    expect(firstName('  ')).toBe('  ');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib.test.js`
Expected: FAIL — `firstName` is not exported from `../lib`.

- [ ] **Step 3: Add the helper to `src/lib.js`**

Append to `src/lib.js` (use the exact logic currently in `ArenaScene.jsx`):

```js
export function firstName(name) {
  const first = String(name).split(/[\s._]+/).filter(Boolean)[0] || String(name);
  return first.charAt(0).toUpperCase() + first.slice(1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Replace the local helper in `ArenaScene.jsx`**

Delete the local function at `src/raid/ArenaScene.jsx:242-245`:

```js
function firstNameOf(name) {
  const first = String(name).split(/[\s._]+/).filter(Boolean)[0] || String(name);
  return first.charAt(0).toUpperCase() + first.slice(1);
}
```

Add `firstName` to the existing `../lib` import near the top of `ArenaScene.jsx`. Find the line importing from `'../lib'` (or add one if absent) and ensure `firstName` is included, e.g.:

```js
import { firstName } from '../lib';
```

Then update the one call site at `src/raid/ArenaScene.jsx` (inside `FighterNames`): change `{firstNameOf(f.name)}` to `{firstName(f.name)}`.

- [ ] **Step 6: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS (all existing suites + the new lib test).

- [ ] **Step 7: Commit**

```bash
git add src/lib.js src/__tests__/lib.test.js src/raid/ArenaScene.jsx
git commit -m "refactor(lib): extract shared firstName helper from ArenaScene"
```

---

### Task 2: Create the FighterBar component

**Files:**
- Create: `src/components/FighterBar.jsx`

This component is plain DOM (no R3F), verified in the browser preview — no unit test. It renders one `<button>` per party member, each with an `Avatar` and a first-name caption, and dims non-focused members when a focus is active.

- [ ] **Step 1: Write the component**

Create `src/components/FighterBar.jsx`:

```jsx
// src/components/FighterBar.jsx
// A roster strip above the dock: one thumbnail per fighter. Clicking focuses
// that fighter, filtering the whole command deck (dock, HP bar, scene, ticker).
// Presentation lens only — drives the same setFocus the arena uses; clearing
// stays via Esc / empty-space click in the arena.
import Avatar from './Avatar';
import { firstName } from '../lib';

export default function FighterBar({ party = [], focus = null, onFocus = () => {} }) {
  if (party.length === 0) return null;
  return (
    <div className="fighter-bar" role="toolbar" aria-label="Fighters">
      {party.map((f) => {
        const active = focus === f.name;
        const dimmed = focus && !active;
        return (
          <button
            key={f.name}
            type="button"
            className="fighter-chip"
            data-active={active}
            data-dimmed={dimmed}
            aria-pressed={active}
            title={f.name}
            onClick={() => onFocus(f.name)}
          >
            <Avatar name={f.name} src={f.avatar} size="2.4rem" />
            <span className="fighter-chip-name">{firstName(f.name)}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FighterBar.jsx
git commit -m "feat(raid): add FighterBar roster component"
```

---

### Task 3: Wire FighterBar into RaidView

**Files:**
- Modify: `src/raid/RaidView.jsx`

- [ ] **Step 1: Import the component**

In `src/raid/RaidView.jsx`, add after the existing `import Dock` line (line 5):

```jsx
import FighterBar from '../components/FighterBar';
```

- [ ] **Step 2: Render the bar between the arena and the dock**

In `src/raid/RaidView.jsx`, locate the closing `</div>` of the `.arena` block and the `<Dock ... />` line (currently lines 48–49). Insert the bar between them:

```jsx
      </div>
      <FighterBar party={party} focus={focus} onFocus={setFocus} />
      <Dock view={view} onSelect={onSelect} focus={focus} />
```

(`party`, `focus`, and `setFocus` are all already in scope in this component.)

- [ ] **Step 3: Commit**

```bash
git add src/raid/RaidView.jsx
git commit -m "feat(raid): mount FighterBar above the dock"
```

---

### Task 4: Style the FighterBar

**Files:**
- Modify: `src/index.css` (add a `.fighter-bar` block in the raid section)

- [ ] **Step 1: Add the CSS**

In `src/index.css`, after the `.arena` rules (around line 388, before the `/* ── raid dock ── */` comment at line 390), add:

```css
/* ── raid fighter bar ───────────────────────────────────────── */
.fighter-bar {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  overflow-x: auto;
  flex: 0 0 auto;
  padding: 0.1rem 0.1rem 0.2rem;
}
.fighter-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex: 0 0 auto;
  width: 3.2rem;
  padding: 0.3rem 0.2rem;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--dim);
  cursor: pointer;
  transition: opacity 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.fighter-chip:hover { border-color: var(--line); color: var(--ink); }
.fighter-chip[data-active='true'] {
  border-color: color-mix(in srgb, var(--ink) 40%, var(--line));
  background: var(--steel-3);
  color: var(--ink);
}
.fighter-chip[data-dimmed='true'] { opacity: 0.35; }
.fighter-chip-name {
  font-size: 0.7rem;
  line-height: 1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

If `--steel-3`, `--line`, `--dim`, or `--ink` are not defined, check the `:root` block at the top of `src/index.css` and substitute the nearest existing token — do not invent new variables.

- [ ] **Step 2: Verify in the browser preview**

Start the mock server so the party is populated:

Run: `npm run mock`

Then via the preview tools:
- `preview_start` (if not running), load the app.
- `preview_snapshot` — confirm the bar renders above the ticket columns with one chip per fighter, each showing an avatar (or initials) and a first name.
- `preview_click` a chip — confirm the dock, HP bar, scene, and ticker all filter to that fighter, the clicked chip shows the active state, and the others dim.
- Press Esc (`preview_eval` dispatching a keydown, or click empty space in the arena) — confirm focus clears and all chips return to rest.
- `preview_screenshot` — capture the base state and the focused state as proof.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(raid): style the fighter roster bar"
```

---

### Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (the Raid view description)

- [ ] **Step 1: Document the bar**

In `CLAUDE.md`, in the Raid view bullet describing the layout (the one covering HP band / scene / dock / ticker), add a sentence noting the fighter roster bar: a strip of avatar+first-name thumbnails above the dock that drives the same focus lens as clicking a fighter in the arena (`FighterBar.jsx`; clearing via Esc / empty-space click). Note that `firstName` now lives in `lib.js` (shared by the bar and `ArenaScene`'s floor captions).

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note fighter roster bar in CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** Own bar above dock (Task 3) ✓; avatar + first name (Task 2) ✓; match-scene no-toggle click (`onClick={() => onFocus(f.name)}`, Task 2) ✓; focus brightens/others dim (Task 2 data attrs + Task 4 CSS) ✓; shared `firstName` helper (Task 1) ✓; vitest for `firstName` (Task 1) ✓; browser verification of FighterBar (Task 4) ✓; styling via existing CSS vars (Task 4) ✓; CLAUDE.md currency rule (Task 5) ✓.
- **No status tints / counts / toggle / unassigned chip** — out-of-scope items correctly absent.
- **Type consistency:** `firstName` used identically in Tasks 1 and 2; `FighterBar` props (`party`/`focus`/`onFocus`) match the render call in Task 3.
```
