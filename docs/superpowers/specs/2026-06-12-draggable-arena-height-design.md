# Draggable arena height — design

## Goal

Let the user change the Raid view's arena (battle scene) height by dragging a
grip on its bottom edge. The columns below reflow to take the remaining space.
Session-only: resets to the CSS default on reload.

## Context

The arena is sized purely by CSS in `src/index.css`:
`.arena { ... flex: 0 1 22vh; ... }`. `RaidView.jsx` is a flex column
(`.raidview { display: flex; flex-direction: column; }`) holding, top to
bottom: `.raid-top` (HP/enrage), `.arena` (the R3F scene), `<FighterBar>`,
`<Dock>` (`.dock`, `flex: 1 1 0`), and `<TruthTicker>`. The dock already
absorbs leftover vertical space, so shrinking/growing the arena reflows the
columns automatically.

The camera's pan/zoom interaction (wheel + left-drag) lives on the R3F canvas
*inside* the arena (`ArenaScene.jsx`, `cameraControls.js`). The resize handle is
a separate sibling DOM element, so it never receives the canvas's pointer events
and needs no conflict-avoidance logic.

Existing localStorage usage is limited to `sb-theme` (`App.jsx`). Per the design
decision, arena height is **not** persisted.

## State

`RaidView` gains one piece of state:

```js
const [arenaH, setArenaH] = useState(null); // px once dragged; null = CSS default
```

- `null` → arena uses its CSS rule (`flex: 0 1 22vh`); no inline style applied.
- a number → applied inline as `style={{ flex: `0 0 ${arenaH}px` }}`, overriding
  the CSS basis so the arena holds exactly that height.

It is session-only presentation state, like `focus`: never mutates `view`, not
persisted, reset to `null` on reload (initial value).

A ref to the arena element is needed to read its current rendered height at
drag start:

```js
const arenaRef = useRef(null);
```

Apply `ref={arenaRef}` and the conditional inline style to the existing
`.arena` `<div>`.

## DOM

In `RaidView.jsx`, insert a handle element between the `.arena` block and
`<FighterBar>`:

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

## Drag mechanics

Pointer events with pointer capture, tracked via a ref:

```js
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
  const next = clampArenaHeight(d.startH + (e.clientY - d.startY), window.innerHeight);
  setArenaH(next);
};

const onResizeUp = (e) => {
  drag.current.down = false;
  e.currentTarget.releasePointerCapture?.(e.pointerId);
};
```

- Dragging down (positive dy) grows the arena → columns shrink.
- Dragging up shrinks the arena → columns grow.
- The R3F canvas auto-reflows to its container via drei/R3F's resize handling,
  so the scene reframes correctly as the arena height changes.
- Double-clicking the handle calls `setArenaH(null)` → back to the CSS default,
  matching the camera's double-click-to-reset convention.

## Pure logic: `src/raid/arenaResize.js`

The clamp is the only non-DOM logic; extract and test it.

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

`RaidView` imports `clampArenaHeight` from `./arenaResize`.

## Styling

CSS under `.arena-resize` in `src/index.css`, placed right after the `.arena`
rule, dark-first with existing variables. Always-visible centered grip that
brightens on hover/active:

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

(`touch-action: none` on the handle keeps pointer-drag from being hijacked by
touch scrolling on a touch-capable display.)

## Testing

- **Unit (vitest):** `src/raid/__tests__/arenaResize.test.js` for
  `clampArenaHeight` — below min clamps to `MIN_ARENA_PX`, above max clamps to
  `viewportH * MAX_ARENA_FRACTION`, an in-range value passes through, and a tiny
  viewport where `max < min` still returns `MIN_ARENA_PX` (min wins).
- **Browser preview:** drag the handle down → arena grows and columns shrink;
  drag up → arena shrinks and columns grow; release holds the height;
  double-click → resets to the 22vh default; clamping holds at both extremes;
  and the camera left-drag pan *inside* the arena still works (handle didn't
  steal its events).

## Out of scope (YAGNI)

- localStorage persistence of the height.
- Horizontal / per-column resizing.
- Rubber-band animation at the min/max bounds.
- Keyboard-driven resize.
```
