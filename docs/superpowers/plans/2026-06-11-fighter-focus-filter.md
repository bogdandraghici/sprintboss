# Fighter Focus Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Click a fighter's sprite in the Raid battle scene to "focus" them; while focused, the dock columns, boss HP bar, battle scene, and truth ticker all spotlight/filter to that fighter's tickets.

**Architecture:** A single `focus` value (the focused assignee's name string, or `null`) lives in `RaidView` and is threaded to the scene, HP bar, dock, and ticker. Focus is a **presentation lens, not a data mutation** — `view.issues` is never shrunk, so the boss HP total, enrage timer, and sprint stats stay whole. Each surface applies the lens to its own rendering. Pure filtering logic lives in `raidState.js` (vitest-tested); R3F components are verified in the browser preview.

**Tech Stack:** React 18, @react-three/fiber v8 (R3F), vitest, plain JSX, CSS variables.

---

## File structure

- `src/raid/raidState.js` — **modify**: `deriveDock(view, focus)` gains optional `focus`; add `focusColumnCounts(view, focus)`. Pure, tested.
- `src/raid/__tests__/raidState.test.js` — **modify**: tests for the two above.
- `src/components/Dock.jsx` — **modify**: accept `focus`, pass into `deriveDock`.
- `src/components/TruthTicker.jsx` — **modify**: accept `focus`, recompute counts/stale/blocked for the focused assignee.
- `src/components/hud.jsx` (`HpBar`) — **modify**: accept `focus`, dim non-focused segments via `data-dim`.
- `src/index.css` — **modify**: `.hpseg[data-dim='true']` dim rule.
- `src/raid/FighterSprite.jsx` — **modify**: invisible hit-box mesh (`onClick` → focus), dim when another fighter is focused, teal ground ring when focused.
- `src/raid/ArenaScene.jsx` — **modify**: accept `focus`/`onFocus`; invisible backdrop plane (`onClick` → clear focus); pass `focus`/`onFocus` to fighters.
- `src/raid/RaidView.jsx` — **modify**: `focus` state, `Esc` handler, auto-clear-on-leave effect, thread `focus`/`onFocus` to children.

All new props default to `null`, so each change is backward-safe and the app stays runnable between tasks.

---

### Task 1: `deriveDock(view, focus)` — filter dock by assignee

**Files:**
- Modify: `src/raid/raidState.js` (the `deriveDock` function, ~lines 78-95)
- Test: `src/raid/__tests__/raidState.test.js` (the existing `describe('deriveDock', ...)` block)

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe('deriveDock', () => { ... })` block in `src/raid/__tests__/raidState.test.js` (after the existing two `it(...)` cases). It reuses the `columns` and `mk` helpers already defined in that block:

```js
  it('focus filters groups and blocked to one assignee; unassigned dropped', () => {
    const view = { columns, issues: [
      mk('A-1', 0, { assignee: 'Ana' }),
      mk('A-2', 1, { assignee: 'Bo' }),
      mk('A-3', 0, { assignee: 'Ana' }),
      mk('A-4', 0, {}), // unassigned
      mk('A-5', 1, { assignee: 'Ana', blocked: true }),
    ] };
    const { groups, blocked } = deriveDock(view, 'Ana');
    expect(groups.flatMap((g) => g.issues.map((i) => i.key))).toEqual(['A-1', 'A-3']);
    expect(blocked.map((i) => i.key)).toEqual(['A-5']);
  });
  it('null focus behaves exactly like no focus', () => {
    const view = { columns, issues: [mk('A-1', 0, { assignee: 'Ana' }), mk('A-2', 1, {})] };
    expect(deriveDock(view, null)).toEqual(deriveDock(view));
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/raid/__tests__/raidState.test.js -t "focus filters"`
Expected: FAIL — `deriveDock('Ana')` ignores the second arg today, so groups include `A-2`/`A-4` and the assertion fails.

- [ ] **Step 3: Write minimal implementation**

Replace the `deriveDock` function in `src/raid/raidState.js` with:

```js
export function deriveDock(view, focus = null) {
  const doneIdx = view.columns.length - 1;
  const mine = (it) => !focus || it.assignee === focus;
  const lanes = view.columns
    .map((c, idx) => ({ name: c.name, idx, isBlockedZone: c.isBlockedZone }))
    .filter((c) => c.idx !== doneIdx && !c.isBlockedZone);
  const groups = lanes.map((c, i) => ({
    name: c.name,
    idx: c.idx,
    kind: i === 0 ? 'queue' : 'work',
    issues: view.issues
      .filter((it) => it.col === c.idx && !it.blocked && !it.done && mine(it))
      .sort((a, b) => a.columnSince - b.columnSince),
  }));
  const blocked = view.issues
    .filter((i) => i.blocked && !i.done && mine(i))
    .sort((a, b) => a.columnSince - b.columnSince);
  return { groups, blocked };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/raid/__tests__/raidState.test.js`
Expected: PASS — all `deriveDock` cases (including the two pre-existing ones) green.

- [ ] **Step 5: Commit**

```bash
git add src/raid/raidState.js src/raid/__tests__/raidState.test.js
git commit -m "feat(raid): deriveDock accepts a focus assignee to filter columns"
```

---

### Task 2: `focusColumnCounts(view, focus)` — per-column counts for the ticker

**Files:**
- Modify: `src/raid/raidState.js` (add new exported function near `deriveDock`)
- Test: `src/raid/__tests__/raidState.test.js`

- [ ] **Step 1: Write the failing test**

Add a new `describe` block to `src/raid/__tests__/raidState.test.js`. Also add `focusColumnCounts` to the existing import line (currently `import { bossStage, deriveDock, deriveTableau } from '../raidState';`) so it becomes:

```js
import { bossStage, deriveDock, deriveTableau, focusColumnCounts } from '../raidState';
```

Then add:

```js
describe('focusColumnCounts', () => {
  const mk = (key, col, assignee) => ({ key, col, assignee });
  it('counts a focused assignee per column index', () => {
    const view = { issues: [
      mk('A-1', 0, 'Ana'), mk('A-2', 0, 'Ana'), mk('A-3', 1, 'Ana'),
      mk('B-1', 0, 'Bo'),
    ] };
    const c = focusColumnCounts(view, 'Ana');
    expect(c.get(0)).toBe(2);
    expect(c.get(1)).toBe(1);
    expect(c.get(2)).toBeUndefined();
  });
  it('null focus returns an empty map', () => {
    const view = { issues: [mk('A-1', 0, 'Ana')] };
    expect(focusColumnCounts(view, null).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/raid/__tests__/raidState.test.js -t "focusColumnCounts"`
Expected: FAIL — `focusColumnCounts is not a function` (not exported yet).

- [ ] **Step 3: Write minimal implementation**

Add this function to `src/raid/raidState.js` immediately after `deriveDock`:

```js
// Per-column ticket counts for a focused assignee, keyed by column index.
// Feeds the truth ticker when a fighter is focused. focus null -> empty map.
export function focusColumnCounts(view, focus) {
  const counts = new Map();
  if (!focus) return counts;
  for (const i of view.issues) {
    if (i.assignee !== focus) continue;
    counts.set(i.col, (counts.get(i.col) || 0) + 1);
  }
  return counts;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/raid/__tests__/raidState.test.js`
Expected: PASS — both `focusColumnCounts` cases green, nothing else broken.

- [ ] **Step 5: Commit**

```bash
git add src/raid/raidState.js src/raid/__tests__/raidState.test.js
git commit -m "feat(raid): focusColumnCounts helper for focused ticker counts"
```

---

### Task 3: Dock passes focus into `deriveDock`

**Files:**
- Modify: `src/components/Dock.jsx` (lines 8-9)

- [ ] **Step 1: Add the `focus` prop**

In `src/components/Dock.jsx`, change the component signature and the `deriveDock` call:

```jsx
export default function Dock({ view, onSelect, focus = null }) {
  const { groups, blocked } = deriveDock(view, focus);
```

(Everything else in `Dock` and `DockGroup` stays the same — the headers already render `g.issues.length`, which is now the filtered count.)

- [ ] **Step 2: Verify tests still pass**

Run: `npx vitest run`
Expected: PASS — 69+ tests; no behavior change yet because `RaidView` still passes no `focus` (defaults to `null`).

- [ ] **Step 3: Commit**

```bash
git add src/components/Dock.jsx
git commit -m "feat(raid): Dock forwards focus to deriveDock"
```

---

### Task 4: TruthTicker recomputes for the focused assignee

**Files:**
- Modify: `src/components/TruthTicker.jsx`

- [ ] **Step 1: Implement focus-aware counts**

Replace the entire contents of `src/components/TruthTicker.jsx` with:

```jsx
// src/components/TruthTicker.jsx
import { ageBand } from '../lib';
import { focusColumnCounts } from '../raid/raidState';

// The no-metaphor strip: per-column counts + stale, then every blocker with its
// reason. When a fighter is focused, every count narrows to their tickets.
export default function TruthTicker({ view, onSelect, focus = null }) {
  const agingOn = !view.flags?.noChangelog;
  const mine = (i) => !focus || i.assignee === focus;
  const lanes = view.columns
    .map((c, idx) => ({ ...c, idx }))
    .slice(0, -1)
    .filter((c) => !c.isBlockedZone);
  const fcounts = focusColumnCounts(view, focus);
  const blocked = view.issues.filter((i) => i.blocked && !i.done && mine(i));
  return (
    <div className="ticker mono">
      {lanes.map((c) => {
        const count = focus ? (fcounts.get(c.idx) || 0) : c.count;
        const stale = agingOn
          ? view.issues.filter((i) => i.col === c.idx && !i.blocked && !i.done && mine(i) &&
              ageBand(i.daysInColumn, view.aging) === 'stale').length
          : 0;
        return (
          <span key={c.name} className="ticker-col">
            {c.name.toLowerCase()} <b>{count}</b>
            {stale > 0 && <i className="ticker-stale"> {stale} stale</i>}
          </span>
        );
      })}
      <span className="ticker-sep">·</span>
      {blocked.length === 0 ? (
        <span className="ticker-ok">no blockers</span>
      ) : (
        blocked.map((i) => (
          <button key={i.key} className="ticker-block" onClick={() => onSelect(i)}>
            ⚑ {i.key} {i.blockedReason || 'flagged'}
          </button>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify tests still pass**

Run: `npx vitest run`
Expected: PASS — no test covers the ticker; `RaidView` still passes no `focus`, so the strip renders exactly as before.

- [ ] **Step 3: Commit**

```bash
git add src/components/TruthTicker.jsx
git commit -m "feat(raid): TruthTicker narrows counts to the focused fighter"
```

---

### Task 5: HpBar dims non-focused segments

**Files:**
- Modify: `src/components/hud.jsx` (`HpBar`, lines 64 and ~98-108)
- Modify: `src/index.css` (near the `.hpseg` rules)

- [ ] **Step 1: Add the `focus` prop and `data-dim` attribute**

In `src/components/hud.jsx`, change the `HpBar` signature:

```jsx
export function HpBar({ view, onSelect, focus = null }) {
```

Then on the segment `<button>` (currently around line 98), add a `data-dim` attribute alongside the existing ones:

```jsx
          <button
            key={issue.key}
            className="hpseg"
            style={{ flexGrow: issue.points, '--heat': glow.get(issue.key) || 0 }}
            data-done={issue.done}
            data-scope={issue.addedMidSprint}
            data-blocked={issue.blocked}
            data-dim={focus ? issue.assignee !== focus : undefined}
            title={`${issue.key} · ${issue.points} ${unit}${issue.done ? ' · done' : ''}${issue.addedMidSprint ? ' · added mid-sprint' : ''}`}
            onClick={() => onSelect(issue)}
          />
```

- [ ] **Step 2: Add the dim CSS**

In `src/index.css`, find the `.hpseg` rules and add directly after them:

```css
.hpseg[data-dim='true'] { opacity: 0.22; }
```

- [ ] **Step 3: Verify tests still pass**

Run: `npx vitest run`
Expected: PASS — no behavior change yet (`focus` is `null`, so `data-dim` is `undefined` and the attribute is omitted).

- [ ] **Step 4: Commit**

```bash
git add src/components/hud.jsx src/index.css
git commit -m "feat(raid): HpBar dims segments not owned by the focused fighter"
```

---

### Task 6: FighterSprite — hit-box, dim, and selection ring

**Files:**
- Modify: `src/raid/FighterSprite.jsx`

- [ ] **Step 1: Accept `focus` / `onFocus` props**

In `src/raid/FighterSprite.jsx`, change the component signature (line ~29) to add the two props:

```jsx
export default function FighterSprite({ fighter, attack, onStrike, position, phase = 0, aura = 0, beaconHeat = 0, tableau = null, focus = null, onFocus }) {
```

- [ ] **Step 2: Compose the focus dim into the existing brightness**

In the `useFrame` body, replace the existing dim lines (currently lines ~80-82):

```jsx
    // Dim the weary.
    const dim = fighter.status === 'exhausted' ? 0.55 : fighter.status === 'resting' ? 0.8 : 1;
    mat.current.color.setScalar(dim);
    headMat.current.color.setScalar(dim);
```

with:

```jsx
    // Dim the weary, and dim everyone except the focused fighter further.
    const weary = fighter.status === 'exhausted' ? 0.55 : fighter.status === 'resting' ? 0.8 : 1;
    const focusDim = focus && fighter.name !== focus ? 0.32 : 1;
    const dim = weary * focusDim;
    mat.current.color.setScalar(dim);
    headMat.current.color.setScalar(dim);
```

- [ ] **Step 3: Add the hit-box and selection ring to the JSX**

In the returned JSX, inside the outer `<group ref={group} position={position}>`, add the hit-box mesh as the FIRST child (before the body mesh) and the selection ring after the body mesh. The hit-box plane is intentionally larger than the sprite and fully transparent (`opacity={0}`), but still raycastable because the mesh is `visible`:

```jsx
  return (
    <group ref={group} position={position}>
      {/* Oversized invisible click target — the swaying sprite is small; this
          makes it easy to hit. stopPropagation so the backdrop doesn't clear. */}
      {onFocus && (
        <mesh
          position={[0, PX * (SPRITE_H / 2), 0.06]}
          onClick={(e) => { e.stopPropagation(); onFocus(fighter.name); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          <planeGeometry args={[SPRITE_W * PX * 1.6, SPRITE_H * PX * 1.15]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <mesh position={[0, PX * (SPRITE_H / 2), 0]}>
        <planeGeometry args={[SPRITE_W * PX, SPRITE_H * PX]} />
        <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      {/* Selection cue: a teal ring on the floor under the focused fighter. */}
      {focus === fighter.name && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.42, 0.55, 40]} />
          <meshBasicMaterial color="#7fe7ff" transparent opacity={0.75} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      {/* initial head height is approximate — useFrame re-anchors it every frame */}
      <mesh ref={head} position={[0, PX * 47, 0.02]}>
        <planeGeometry args={[HEAD_SIZE, HEAD_SIZE]} />
        <meshBasicMaterial ref={headMat} map={headTex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      {aura > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.55, 24]} />
          <meshBasicMaterial ref={auraMat} color="#ff9d5c" transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      {fighter.status === 'down' && <Beacon heat={beaconHeat} />}
    </group>
  );
```

- [ ] **Step 4: Verify tests still pass and the app builds**

Run: `npx vitest run`
Expected: PASS. (No unit test covers FighterSprite; this confirms nothing else broke. Visual behavior is verified end-to-end in Task 8.)

- [ ] **Step 5: Commit**

```bash
git add src/raid/FighterSprite.jsx
git commit -m "feat(raid): fighter click target, focus dim, and selection ring"
```

---

### Task 7: ArenaScene — backdrop to clear focus, thread props to fighters

**Files:**
- Modify: `src/raid/ArenaScene.jsx`

- [ ] **Step 1: Accept `focus` / `onFocus` on the scene**

In `src/raid/ArenaScene.jsx`, change the component signature (line ~91):

```jsx
export default function ArenaScene({ view, party = [], minions = [], horde = 0, actions = [], focus = null, onFocus = () => {} }) {
```

- [ ] **Step 2: Add an invisible backdrop that clears focus on click**

Add this component near the other scene helpers (e.g. right after the `Floor` function, before `Embers`):

```jsx
// A large invisible plane behind everything. Any click that isn't a fighter
// (whose hit-box stops propagation) falls through to here and clears focus.
// `visible` stays true so three.js still raycasts it; opacity 0 hides it.
function ClearBackdrop({ onClear }) {
  return (
    <mesh position={[0, 4, -6]} onClick={() => onClear()}>
      <planeGeometry args={[60, 30]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
```

- [ ] **Step 3: Render the backdrop and pass props to fighters**

In the returned JSX: add `<ClearBackdrop onClear={() => onFocus(null)} />` right after `<Floor />`, and add `focus={focus}` + `onFocus={onFocus}` to the `<FighterSprite ... />` props:

```jsx
      <Environment enraged={enraged} lite={LITE} />
      <Floor />
      <ClearBackdrop onClear={() => onFocus(null)} />
      {party.map((f, i) => (
        <FighterSprite
          key={f.name}
          fighter={f}
          phase={i * 0.7}
          attack={actions.find((a) => a.kind === 'attack' && a.fighter === i) || null}
          onStrike={strike}
          aura={auras.get(f.name) || 0}
          beaconHeat={blockHeat.get(f.name) || 0}
          tableau={tableau}
          focus={focus}
          onFocus={onFocus}
          position={[-8.2 + (i % 5) * 2.2 + Math.floor(i / 5) * 0.6, 0, 0.2 - Math.floor(i / 5) * 0.85]}
        />
      ))}
```

- [ ] **Step 4: Verify tests still pass**

Run: `npx vitest run`
Expected: PASS — `RaidView` still passes no `onFocus`, so `onFocus` defaults to a no-op and clicking does nothing yet.

- [ ] **Step 5: Commit**

```bash
git add src/raid/ArenaScene.jsx
git commit -m "feat(raid): scene backdrop clears focus; thread focus to fighters"
```

---

### Task 8: RaidView — focus state, Esc, auto-clear, wiring

**Files:**
- Modify: `src/raid/RaidView.jsx`

- [ ] **Step 1: Add state, effects, and thread props**

Replace the entire contents of `src/raid/RaidView.jsx` with:

```jsx
// src/raid/RaidView.jsx
// Command deck: data layers above and below, the scene as pure spectacle between.
import { useMemo, useState, useEffect } from 'react';
import ArenaScene from './ArenaScene';
import Dock from '../components/Dock';
import TruthTicker from '../components/TruthTicker';
import { EnrageTimer, HpBar, DamageLog } from '../components/hud';
import { deriveParty, deriveMinions, pulseActions } from './raidState';

export default function RaidView({ view, pulses, onSelect }) {
  const party = useMemo(() => deriveParty(view), [view]);
  const { minions, horde } = useMemo(() => deriveMinions(view), [view]);
  const actions = pulseActions(pulses, party);

  // Focused fighter (assignee name) or null. Presentation lens only — never
  // mutates `view`, never persisted, not part of retro reconstruction.
  const [focus, setFocus] = useState(null);

  // Esc clears the focus.
  useEffect(() => {
    if (!focus) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFocus(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);

  // If the focused fighter drops out of the party after a poll, clear focus.
  useEffect(() => {
    if (focus && !party.some((f) => f.name === focus)) setFocus(null);
  }, [party, focus]);

  return (
    <section className="raidview">
      <div className="raid-top">
        <div className="hud-hp">
          <HpBar view={view} onSelect={onSelect} focus={focus} />
        </div>
        <EnrageTimer view={view} />
      </div>
      <div className="arena">
        <ArenaScene
          view={view} party={party} minions={minions} horde={horde} actions={actions}
          focus={focus} onFocus={setFocus}
        />
        <div className="combat-log">
          <DamageLog view={view} />
        </div>
      </div>
      <Dock view={view} onSelect={onSelect} focus={focus} />
      <TruthTicker view={view} onSelect={onSelect} focus={focus} />
    </section>
  );
}
```

- [ ] **Step 2: Verify tests still pass**

Run: `npx vitest run`
Expected: PASS — all suites green (logic tests unaffected; this is wiring).

- [ ] **Step 3: Commit**

```bash
git add src/raid/RaidView.jsx
git commit -m "feat(raid): wire fighter focus state through the Raid view"
```

---

### Task 9: End-to-end browser verification

**Files:** none (verification only)

- [ ] **Step 1: Ensure the dev server is running and reload**

Use the preview tooling: `preview_start` (config `sprint-boss-live` or `sprint-boss-mock`) if not already running, then reload the page so the bundle and any 3D textures re-init.

- [ ] **Step 2: Confirm no console errors**

Check `preview_console_logs` (level `error`). Expected: no NEW errors referencing `RaidView`, `ArenaScene`, `FighterSprite`, `Dock`, `TruthTicker`, or `HpBar`. (Pre-existing stale HMR entries from earlier in the session do not count — confirm the error count is not growing after a clean reload.)

- [ ] **Step 3: Select a fighter and verify the lens**

Click a fighter sprite (`preview_click` on the canvas at a fighter's location, or drive via `preview_eval` if needed). Take a `preview_screenshot` and confirm:
- Dock columns now show only that fighter's tickets; headers show the reduced count.
- Other fighters in the scene are dimmed; the selected one keeps full brightness and shows the teal ground ring.
- The boss HP bar segments owned by others are dimmed.
- The truth ticker counts dropped to the focused fighter's totals.
- The boss HP "remaining / total" text is UNCHANGED (lens didn't shrink the sprint).

- [ ] **Step 4: Verify clearing**

Click empty scene space (e.g. upper background, away from any fighter) → focus clears, all surfaces return to full. Then select again and press `Esc` → clears. Confirm with a `preview_screenshot` after each.

- [ ] **Step 5: Verify switching**

Click fighter A, then click fighter B → the lens moves to B (no stale A state). Confirm via screenshot.

- [ ] **Step 6: Final commit (only if any fix was needed)**

If Steps 3-5 surfaced a bug, fix the source, re-verify from Step 2, then:

```bash
git add -A
git commit -m "fix(raid): <describe the focus-filter fix>"
```

If no fixes were needed, there is nothing to commit here.

---

## Notes for the implementer

- **Backward compatibility is the safety net:** every new prop defaults to `null`/no-op, so the app runs after every single task. Don't reorder tasks in a way that passes a non-null `focus` before its consumer accepts it.
- **Don't shrink `view`.** If you ever find yourself filtering `view.issues` and passing a new `view` down, stop — that breaks the boss HP total and enrage. Focus is applied per-consumer.
- **R3F click events** require the default event system (already on). Fighter hit-boxes MUST call `e.stopPropagation()` so the backdrop's `onClick` doesn't also fire and immediately clear the selection.
- **`visible` vs `opacity:0`:** the hit-box and backdrop use `opacity={0}` on a *visible* mesh. Do NOT use `visible={false}` — three.js skips invisible meshes during raycasting, which would break clicking.
