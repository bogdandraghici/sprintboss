# Draggable Arena Height Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user drag a grip on the arena's bottom edge to resize the Raid view's battle scene; the ticket columns reflow to take the remaining space.

**Architecture:** A pure `clampArenaHeight` bounds helper (tested) plus session-only `arenaH` state in `RaidView` applied as an inline `flex` override on `.arena`. A sibling handle element between the arena and the fighter bar drives the resize via pointer events — separate from the camera's in-canvas drag, so no conflict logic is needed. Double-click resets to the CSS default.

**Tech Stack:** React 18 (plain JSX), Vitest, CSS variables in `index.css`. Pointer Events API with pointer capture.

---

### Task 1: clampArenaHeight bounds helper

**Files:**
- Create: `src/raid/arenaResize.js`
- Test: `src/raid/__tests__/arenaResize.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/raid/__tests__/arenaResize.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { clampArenaHeight, MIN_ARENA_PX, MAX_ARENA_FRACTION } from '../arenaResize';

describe('clampArenaHeight', () => {
  const VH = 1000; // viewport height; max = 700px at MAX_ARENA_FRACTION 0.7

  it('passes an in-range value through unchanged', () => {
    expect(clampArenaHeight(300, VH)).toBe(300);
  });
  it('clamps below the minimum up to MIN_ARENA_PX', () => {
    expect(clampArenaHeight(10, VH)).toBe(MIN_ARENA_PX);
  });
  it('clamps above the maximum down to viewportH * MAX_ARENA_FRACTION', () => {
    expect(clampArenaHeight(5000, VH)).toBe(VH * MAX_ARENA_FRACTION);
  });
  it('returns MIN_ARENA_PX when the viewport is too small for the min (min wins)', () => {
    expect(clampArenaHeight(80, 100)).toBe(MIN_ARENA_PX);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/raid/__tests__/arenaResize.test.js`
Expected: FAIL — cannot import from `../arenaResize` (module does not exist).

- [ ] **Step 3: Write the helper**

Create `src/raid/arenaResize.js`:

```js
// src/raid/arenaResize.js
// Bounds for the user-draggable arena height so neither the scene nor the
// ticket columns can be crushed. Pure — tested in arenaResize.test.js.
export const MIN_ARENA_PX = 120;
export const MAX_ARENA_FRACTION = 0.7;

export function clampArenaHeight(px, viewportH) {
  const max = viewportH * MAX_ARENA_FRACTION;
  return Math.max(MIN_ARENA_PX, Math.min(px, max));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/raid/__tests__/arenaResize.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/raid/arenaResize.js src/raid/__tests__/arenaResize.test.js
git commit -m "feat(raid): add clampArenaHeight bounds helper"
```

---

### Task 2: Wire the resize handle into RaidView

**Files:**
- Modify: `src/raid/RaidView.jsx`

This task adds the state, the arena ref + inline style, the pointer handlers, and the handle element. No unit test — the pure logic is already covered in Task 1; the wiring is verified in the browser in Task 3.

Current relevant portion of `src/raid/RaidView.jsx` (for reference):

```jsx
import { useMemo, useState, useEffect } from 'react';
...
export default function RaidView({ view, pulses, onSelect }) {
  ...
  const [focus, setFocus] = useState(null);
  ...
  return (
    <section className="raidview">
      <div className="raid-top">
        ...
      </div>
      <div className="arena">
        <ArenaScene ... />
        <div className="combat-log">
          <DamageLog view={view} />
        </div>
      </div>
      <FighterBar party={party} focus={focus} onFocus={setFocus} />
      <Dock view={view} onSelect={onSelect} focus={focus} />
      <TruthTicker view={view} onSelect={onSelect} focus={focus} />
    </section>
  );
}
```

- [ ] **Step 1: Add `useRef` to the React import**

Change the first import line in `src/raid/RaidView.jsx` from:

```jsx
import { useMemo, useState, useEffect } from 'react';
```

to:

```jsx
import { useMemo, useState, useEffect, useRef } from 'react';
```

- [ ] **Step 2: Import the clamp helper**

Add this import alongside the other `./` imports near the top of `src/raid/RaidView.jsx` (e.g. after the `deriveParty` import line):

```jsx
import { clampArenaHeight } from './arenaResize';
```

- [ ] **Step 3: Add resize state, refs, and handlers**

Inside the `RaidView` component body, after the existing `const [focus, setFocus] = useState(null);` line, add:

```jsx
  // Session-only arena height (px) the user can drag; null = CSS default (22vh).
  // Presentation lens only — never mutates `view`, never persisted.
  const [arenaH, setArenaH] = useState(null);
  const arenaRef = useRef(null);
  const drag = useRef({ down: false, startY: 0, startH: 0 });

  const onResizeDown = (e) => {
    const h = arenaRef.current?.getBoundingClientRect().height;
    if (h == null) return;
    drag.current = { down: true, startY: e.clientY, startH: h };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e) => {
    const d = drag.current;
    if (!d.down) return;
    setArenaH(clampArenaHeight(d.startH + (e.clientY - d.startY), window.innerHeight));
  };
  const onResizeUp = (e) => {
    drag.current.down = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
```

- [ ] **Step 4: Add the ref + inline style to the `.arena` div**

Change the arena opening tag in `src/raid/RaidView.jsx` from:

```jsx
      <div className="arena">
```

to:

```jsx
      <div
        className="arena"
        ref={arenaRef}
        style={arenaH != null ? { flex: `0 0 ${arenaH}px` } : undefined}
      >
```

- [ ] **Step 5: Add the handle element between the arena and the fighter bar**

In `src/raid/RaidView.jsx`, the arena `</div>` is immediately followed by the `<FighterBar ... />` line. Insert the handle between them:

```jsx
      </div>
      <div
        className="arena-resize"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize battle scene"
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onDoubleClick={() => setArenaH(null)}
      >
        <span className="arena-resize-grip" />
      </div>
      <FighterBar party={party} focus={focus} onFocus={setFocus} />
```

- [ ] **Step 6: Confirm the suite still passes (no regressions)**

Run: `npm test`
Expected: PASS (all suites, including Task 1's arenaResize test).

- [ ] **Step 7: Commit**

```bash
git add src/raid/RaidView.jsx
git commit -m "feat(raid): drag the arena bottom edge to resize it"
```

---

### Task 3: Style the resize handle and verify in the browser

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add the CSS**

In `src/index.css`, find the `.arena` rule (currently at line 373) and add this block immediately after it:

```css
.arena-resize {
  flex: none;
  height: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ns-resize;
  touch-action: none;
}
.arena-resize-grip {
  width: 2.5rem;
  height: 3px;
  border-radius: 3px;
  background: var(--steel-3);
  transition: background 0.15s ease, width 0.15s ease;
}
.arena-resize:hover .arena-resize-grip,
.arena-resize:active .arena-resize-grip {
  background: var(--dim);
  width: 3.5rem;
}
```

`--steel-3` and `--dim` are both defined in the `:root` block of `src/index.css`. If either is missing, substitute the nearest existing token — do not invent new variables.

- [ ] **Step 2: Verify in the browser preview**

A dev server may already be running — use `preview_list` to check; otherwise `preview_start` the `sprint-boss-live` config (port 5173). Use the `preview_*` MCP tools (NOT Bash, NOT Claude-in-Chrome).

- `preview_snapshot` / `preview_screenshot` — confirm a centered grip is visible on the arena's bottom edge, above the fighter bar.
- Drag the handle DOWN: use `preview_eval` to dispatch a realistic pointer sequence on `.arena-resize`, or use the pointer/drag preview affordance, then `preview_screenshot` — confirm the arena grew and the ticket columns shrank.
- Drag the handle UP and screenshot — confirm the arena shrank and the columns grew.
- Double-click the handle (`preview_eval` dispatching a `dblclick` on `.arena-resize`) and screenshot — confirm the arena returned to its default (~22vh) height.
- Confirm the camera still pans: drag inside the arena canvas (left-drag) and confirm the scene pans (the handle didn't steal canvas events). Check `preview_console_logs` for errors.

Suggested `preview_eval` drag helper (adjust the start coordinates to the handle's location from the snapshot):

```js
(() => {
  const el = document.querySelector('.arena-resize');
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const opts = (cy) => ({ clientX: x, clientY: cy, pointerId: 1, bubbles: true });
  el.dispatchEvent(new PointerEvent('pointerdown', opts(y)));
  el.dispatchEvent(new PointerEvent('pointermove', opts(y + 160)));
  el.dispatchEvent(new PointerEvent('pointerup', opts(y + 160)));
  return document.querySelector('.arena').getBoundingClientRect().height;
})()
```

(Note: `setPointerCapture` may throw on a synthetic pointer that isn't a real active pointer; if the eval errors on capture, wrap the dispatch so the move/up still fire, or test the drag via the preview's native pointer-drag affordance instead. The handler guards on `drag.current.down`, so a missed capture only affects pointer routing, not the height math.)

If resizing or reset doesn't behave, read the source, fix it, and re-verify before committing.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(raid): style the arena resize grip"
```

---

### Task 4: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the resize affordance**

In `CLAUDE.md`, in the Raid view layout description, add a sentence noting that the arena height is user-adjustable: a grip on the arena's bottom edge (`.arena-resize` in `RaidView.jsx`) drag-resizes the scene (session-only React state `arenaH`, not persisted, double-click resets to the CSS default), with bounds from the pure `clampArenaHeight` in `src/raid/arenaResize.js`. Mention it's a presentation lens like fighter focus / camera pan — never part of `view`.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: note draggable arena height in CLAUDE.md"
```

---

## Self-Review Notes

- **Spec coverage:** sibling handle between arena and FighterBar (Task 2 step 5) ✓; `arenaH` session-only state + inline `flex` override (Task 2 steps 3–4) ✓; pointer-capture drag mechanics (Task 2 step 3) ✓; double-click reset (Task 2 step 5) ✓; bounds via pure tested `clampArenaHeight` (Task 1) ✓; always-visible grip brightening on hover/active + `touch-action: none` (Task 3) ✓; unit tests incl. tiny-viewport min-wins case (Task 1) ✓; browser verification incl. camera-pan-still-works (Task 3) ✓; CLAUDE.md currency (Task 4) ✓.
- **Out-of-scope items** (persistence, horizontal resize, rubber-band, keyboard) correctly absent.
- **Type/name consistency:** `clampArenaHeight(px, viewportH)`, `MIN_ARENA_PX`, `MAX_ARENA_FRACTION`, `arenaH`/`setArenaH`, `arenaRef`, `.arena-resize`/`.arena-resize-grip` used identically across tasks.
```
