# Raid Command Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Arena with the "Raid command deck" view — HD-2D pixel scene on top (pure spectacle), full-detail ticket dock below, afterglow residue for missed events — per the approved spec `docs/superpowers/specs/2026-06-11-raid-command-deck-design.md`.

**Architecture:** The data layer (`useSnapshot`, `shared/derive.js`, `timeMachine`) is untouched. `src/raid/` evolves in place: new pure modules (`heat.js`, `sprites/ops.js`) feed both DOM HUD and the R3F scene. Sprites are upscaled with a lossless programmatic 2× pass (28×40 fighters, 56×52 boss — the spec's "roughly doubled" 24×36/~48×44; exact 2× keeps the pipeline mechanical) plus recipe-derived new frames. Everything in the scene stays a pure function of `view` + short-lived pulses; idle motion uses the R3F clock, decay uses `view.now`, never `Date.now()` in scene code.

**Tech Stack:** React 18, @react-three/fiber v8, drei v9, @react-three/postprocessing 2.x (installed), vitest, plain JSX, CSS variables in `src/index.css`.

**Conventions for the executor:**
- Run all tests with `npm test` (vitest run). Targeted: `npx vitest run <path>`.
- R3F components are NOT unit-tested — verify in the browser preview against `npm run mock` (header gains hit/heal/block demo chips in mock mode).
- Commits go directly to `main`. NEVER push without Bogdan's explicit OK.
- Sprite matrices are drafts — Bogdan art-directs them in preview later. Do not block on art quality; block on pipeline correctness (tests).

## File structure (what exists / what changes)

```
src/
  App.jsx                      MODIFY  layout key 'arena' -> 'raid' + migration
  index.css                    MODIFY  raid-top, dock, combat-log, ticket densities, hpseg heat
  components/
    Header.jsx                 MODIFY  toggle labels ['raid','factory']
    Ticket.jsx                 MODIFY  density prop ('full'|'compact'|'chip')
    Dock.jsx                   CREATE  DOM ticket dock (uses deriveDock/dockDensity)
    hud.jsx                    MODIFY  HpBar gains afterglow heat
    RaidHud.jsx                DELETE  party frames retired; layout moves into RaidView
    FactoryLine.jsx            UNTOUCHED
    BossPanel.jsx              UNTOUCHED
    BossFigure.jsx             UNTOUCHED (boot screens use it)
  raid/
    RaidView.jsx               MODIFY  command-deck layout (top band / arena / dock / ticker)
    ArenaScene.jsx             MODIFY  hit-stop, impacts, scars, debris, auras, glyph poof, env, lite
    FighterSprite.jsx          MODIFY  15-frame anim, aura, beacon heat, PX 0.05
    BossSprite.jsx             MODIFY  damage stages, knockback, scars, death, PX 0.095
    MinionSprite.jsx           MODIFY  spawn glyph; exports minionPos
    FloatNum.jsx               MODIFY  arcing damage numbers (pop, ease-out, drift)
    Effects.jsx                MODIFY  full post chain (bloom/noise/grade/CA/vignette)
    Environment.jsx            CREATE  parallax backdrop, shafts, fog, braziers, dust
    Debris.jsx                 CREATE  planted-sword kill residue
    ImpactFX.jsx               CREATE  sparks + shockwave ring (also minion poof, green)
    heat.js                    CREATE  afterglow decay selectors (pure)
    timeBus.js                 CREATE  hit-stop freeze accumulator (like shakeBus)
    raidState.js               MODIFY  + bossStage, deriveDock, dockDensity, deriveTableau
    shakeBus.js                UNTOUCHED
    avatarTexture.js           UNTOUCHED
    sprites/
      ops.js                   CREATE  up2, shift, outline, rimLight (pure frame ops)
      bodies.js                UNTOUCHED (14×20 base frames stay the source of truth)
      roster.js                MODIFY  15-frame RECIPES pipeline, HEAD_ANCHORS15, rim palette
      weapons.js               UNTOUCHED (scaled in the roster pipeline)
      boss.js                  MODIFY  bossFrames(stage), crack overlays, core palette
      rasterize.js             UNTOUCHED
      textures.js              UNTOUCHED
    __tests__/
      ops.test.js              CREATE
      heat.test.js             CREATE
      raidState.test.js        MODIFY  + new selector tests
      sprites.test.js          MODIFY  15 frames, 28×40, rim char
CLAUDE.md                      MODIFY  final task: document the new view
```

Task order is load-bearing: every task leaves `npm test` green and the app working.

---

## Phase A — pure foundations

### Task 1: Frame ops (`up2`, `shift`, `outline`, `rimLight`)

**Files:**
- Create: `src/raid/sprites/ops.js`
- Test: `src/raid/__tests__/ops.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/raid/__tests__/ops.test.js
import { describe, it, expect } from 'vitest';
import { up2, shift, outline, rimLight } from '../sprites/ops';

describe('up2', () => {
  it('doubles every pixel in both axes', () => {
    expect(up2(['.A', 'B.'])).toEqual(['..AA', '..AA', 'BB..', 'BB..']);
  });
});

describe('shift', () => {
  it('moves content right/down, clipping and back-filling with transparency', () => {
    expect(shift(['AB..', 'CD..'], 1, 1)).toEqual(['....', '.AB.']);
  });
  it('moves content left/up', () => {
    expect(shift(['.AB.', '.CD.'], -1, -1)).toEqual(['CD..', '....']);
  });
  it('zero shift is identity', () => {
    expect(shift(['AB'], 0, 0)).toEqual(['AB']);
  });
});

describe('outline', () => {
  it('marks transparent 4-neighbours of opaque pixels, leaves opaque alone', () => {
    expect(outline(['...', '.A.', '...'])).toEqual(['.K.', 'KAK', '.K.']);
  });
  it('clips at the frame edge without throwing', () => {
    expect(outline(['A'])).toEqual(['A']);
  });
});

describe('rimLight', () => {
  it('marks opaque pixels whose left or top neighbour is transparent or outline', () => {
    // 'K' outline is treated as edge; the body pixel behind it gets rim.
    expect(rimLight(['KAA', 'KAA'])).toEqual(['KRR', 'KRA']);
  });
  it('never touches transparent or outline pixels', () => {
    expect(rimLight(['.K.', 'KAK'])).toEqual(['.K.', 'KRK']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/raid/__tests__/ops.test.js`
Expected: FAIL — cannot resolve `../sprites/ops`

- [ ] **Step 3: Write the implementation**

```js
// src/raid/sprites/ops.js
// Pure frame ops. A frame is an array of equal-length strings; '.' = transparent.
// These run at sheet-build time (once per cache key), not per render frame.

export const up2 = (frame) =>
  frame.flatMap((row) => {
    const wide = [...row].map((ch) => ch + ch).join('');
    return [wide, wide];
  });

export function shift(frame, dx, dy) {
  const w = frame[0].length;
  const h = frame.length;
  const blank = '.'.repeat(w);
  const rows = frame.map((row) =>
    dx === 0 ? row
    : dx > 0 ? ('.'.repeat(dx) + row).slice(0, w)
    : (row + '.'.repeat(-dx)).slice(-w)
  );
  return Array.from({ length: h }, (_, y) => {
    const sy = y - dy;
    return sy >= 0 && sy < h ? rows[sy] : blank;
  });
}

// Dark outline: any transparent pixel 4-touching an opaque pixel becomes outlineCh.
export function outline(frame, outlineCh = 'K') {
  const h = frame.length, w = frame[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : frame[y][x]);
  return frame.map((row, y) =>
    [...row].map((ch, x) => {
      if (ch !== '.') return ch;
      return at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.'
        ? outlineCh : '.';
    }).join('')
  );
}

// 1px rim light on the key-lit side (scene key light sits up-left): any opaque
// non-outline pixel whose left or top neighbour is transparent/outline gets rimCh.
export function rimLight(frame, rimCh = 'R', outlineCh = 'K') {
  const h = frame.length, w = frame[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : frame[y][x]);
  const edge = (ch) => ch === '.' || ch === outlineCh;
  return frame.map((row, y) =>
    [...row].map((ch, x) => {
      if (ch === '.' || ch === outlineCh) return ch;
      return edge(at(x - 1, y)) || edge(at(x, y - 1)) ? rimCh : ch;
    }).join('')
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/raid/__tests__/ops.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full suite, then commit**

Run: `npm test`
Expected: all green (existing suites unaffected)

```bash
git add src/raid/sprites/ops.js src/raid/__tests__/ops.test.js
git commit -m "feat: pure frame ops (up2/shift/outline/rimLight) for the sprite pipeline"
```

---

### Task 2: Afterglow selectors (`heat.js`)

**Files:**
- Create: `src/raid/heat.js`
- Test: `src/raid/__tests__/heat.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/raid/__tests__/heat.test.js
import { describe, it, expect } from 'vitest';
import {
  heat, segmentHeat, recentKills, bossScars, fighterAuras, fighterBlockHeat,
  SEGMENT_LIFE, SCAR_LIFE, AURA_LIFE, DEBRIS_LIFE, SCAR_MAX,
} from '../heat';

const HOUR = 3_600_000;
const NOW = 1_000 * HOUR;

describe('heat', () => {
  it('is 1 at the event, 0 after life, linear between, clamped', () => {
    expect(heat(NOW, NOW, 2 * HOUR)).toBe(1);
    expect(heat(NOW - HOUR, NOW, 2 * HOUR)).toBeCloseTo(0.5);
    expect(heat(NOW - 3 * HOUR, NOW, 2 * HOUR)).toBe(0);
    expect(heat(NOW + HOUR, NOW, 2 * HOUR)).toBe(1); // future-safe clamp
    expect(heat(null, NOW, 2 * HOUR)).toBe(0);
  });
});

describe('segmentHeat', () => {
  it('maps done issues to cooling heat keyed by issue key', () => {
    const issues = [
      { key: 'A-1', done: true, doneAt: NOW - SEGMENT_LIFE / 2 },
      { key: 'A-2', done: false, doneAt: null },
      { key: 'A-3', done: true, doneAt: NOW - SEGMENT_LIFE * 2 },
    ];
    const m = segmentHeat(issues, NOW);
    expect(m.get('A-1')).toBeCloseTo(0.5);
    expect(m.has('A-2')).toBe(false);
    expect(m.get('A-3')).toBe(0);
  });
});

describe('recentKills / bossScars', () => {
  const events = [
    { type: 'done', key: 'A-1', ts: NOW - DEBRIS_LIFE * 2 },
    { type: 'scope-added', key: 'X-1', ts: NOW },
    { type: 'done', key: 'A-2', ts: NOW - HOUR },
  ];
  it('keeps only done events still warm, with heat', () => {
    const kills = recentKills(events, NOW, DEBRIS_LIFE);
    expect(kills.map((k) => k.key)).toEqual(['A-2']);
    expect(kills[0].heat).toBeGreaterThan(0.9);
  });
  it('bossScars caps at SCAR_MAX newest', () => {
    const many = Array.from({ length: SCAR_MAX + 4 }, (_, i) =>
      ({ type: 'done', key: `K-${i}`, ts: NOW - i }));
    expect(bossScars(many, NOW)).toHaveLength(SCAR_MAX);
  });
});

describe('fighterAuras', () => {
  it('routes by issue owner (not event actor) and keeps the hottest', () => {
    const issues = [{ key: 'A-1', assignee: 'Ana' }, { key: 'A-2', assignee: 'Ana' }];
    const events = [
      { type: 'done', key: 'A-1', ts: NOW - AURA_LIFE * 9, actor: 'Reviewer' },
      { type: 'done', key: 'A-2', ts: NOW - AURA_LIFE / 4, actor: 'Bot' },
      { type: 'done', key: 'Z-9', ts: NOW, actor: 'Ghost' }, // unknown issue: ignored
    ];
    const m = fighterAuras(events, issues, NOW);
    expect(m.get('Ana')).toBeCloseTo(0.75);
    expect(m.size).toBe(1);
  });
});

describe('fighterBlockHeat', () => {
  it('fresher blocks burn brighter; unblocked issues drop out', () => {
    const issues = [
      { key: 'B-1', assignee: 'Bo', blocked: true, done: false },
      { key: 'B-2', assignee: 'Bo', blocked: false, done: false },
    ];
    const events = [
      { type: 'blocked', key: 'B-1', ts: NOW - HOUR },
      { type: 'blocked', key: 'B-2', ts: NOW },
    ];
    const m = fighterBlockHeat(events, issues, NOW);
    expect(m.get('Bo')).toBeGreaterThan(0.9);
  });
  it('a blocked issue with no blocked event still appears at heat 0', () => {
    const issues = [{ key: 'B-3', assignee: 'Cy', blocked: true, done: false }];
    expect(fighterBlockHeat([], issues, NOW).get('Cy')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/raid/__tests__/heat.test.js`
Expected: FAIL — cannot resolve `../heat`

- [ ] **Step 3: Write the implementation**

```js
// src/raid/heat.js
// Afterglow: events leave residue that cools over hours. Everything here is a
// pure function of (events, issues, now) — `now` is view.now (or the HUD's
// timeTravel-aware clock), NEVER Date.now() inside scene code. That makes the
// afterglow of any past moment reconstructable in retro mode for free.
import { HOUR } from '../lib';

export const SEGMENT_LIFE = 2 * HOUR;   // HP segment gold cool-down
export const AURA_LIFE = 2 * HOUR;      // attacker ember aura
export const SCAR_LIFE = 24 * HOUR;     // glowing impact scars on the boss
export const DEBRIS_LIFE = 24 * HOUR;   // planted swords on the battlefield
export const BEACON_LIFE = 24 * HOUR;   // blocked beacon freshness
export const SCAR_MAX = 8;

// 1 at the event, linear to 0 after `life`. Clamped both ends; null ts -> 0.
export const heat = (ts, now, life) =>
  ts == null ? 0 : Math.max(0, Math.min(1, 1 - (now - ts) / life));

// {issueKey -> 0..1} for done issues — drives HP segment afterglow.
export function segmentHeat(issues, now) {
  const m = new Map();
  for (const i of issues) {
    if (i.done && i.doneAt != null) m.set(i.key, heat(i.doneAt, now, SEGMENT_LIFE));
  }
  return m;
}

// Done events still warm under `life`: [{key, ts, heat}] in event order.
export const recentKills = (events, now, life) =>
  events
    .filter((e) => e.type === 'done')
    .map((e) => ({ key: e.key, ts: e.ts, heat: heat(e.ts, now, life) }))
    .filter((k) => k.heat > 0);

export const bossScars = (events, now) =>
  recentKills(events, now, SCAR_LIFE).slice(-SCAR_MAX);

export const debris = (events, now) => recentKills(events, now, DEBRIS_LIFE);

// {fighterName -> 0..1}: hottest recent kill per issue OWNER (the same
// key-not-actor routing rule as pulseActions — the closer may be a reviewer).
export function fighterAuras(events, issues, now) {
  const owner = new Map(issues.map((i) => [i.key, i.assignee]));
  const m = new Map();
  for (const e of events) {
    if (e.type !== 'done') continue;
    const name = owner.get(e.key);
    if (!name) continue;
    const h = heat(e.ts, now, AURA_LIFE);
    if (h > (m.get(name) || 0)) m.set(name, h);
  }
  return m;
}

// {fighterName -> 0..1}: freshness of the hottest live block they own.
// Blocked issues with no recorded event still appear at 0 (base brightness).
export function fighterBlockHeat(events, issues, now) {
  const lastBlocked = new Map();
  for (const e of events) if (e.type === 'blocked') lastBlocked.set(e.key, e.ts); // events are ts-sorted
  const m = new Map();
  for (const i of issues) {
    if (!i.blocked || i.done || !i.assignee) continue;
    const h = heat(lastBlocked.get(i.key) ?? null, now, BEACON_LIFE);
    if (!m.has(i.assignee) || h > m.get(i.assignee)) m.set(i.assignee, h);
  }
  return m;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/raid/__tests__/heat.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/raid/heat.js src/raid/__tests__/heat.test.js
git commit -m "feat: afterglow heat selectors (pure, retro-safe)"
```

---

### Task 3: raidState selectors (bossStage, deriveDock, dockDensity, deriveTableau)

**Files:**
- Modify: `src/raid/raidState.js` (append after `pulseActions`)
- Test: `src/raid/__tests__/raidState.test.js` (append)

- [ ] **Step 1: Write the failing tests** (append to `src/raid/__tests__/raidState.test.js`)

```js
import { bossStage, deriveDock, dockDensity, deriveTableau, QUEUE_MAX, WORK_MAX } from '../raidState';

describe('bossStage', () => {
  const s = (remaining, total) => bossStage({ remaining, total });
  it('maps hp fraction to crack stages: 0 pristine .. 3 near-death, 4 dead', () => {
    expect(s(10, 10)).toBe(0);
    expect(s(7.4, 10)).toBe(1);   // <= 75%
    expect(s(5, 10)).toBe(2);     // <= 50%
    expect(s(2.5, 10)).toBe(3);   // <= 25%
    expect(s(0, 10)).toBe(4);
    expect(s(0, 0)).toBe(0);      // empty sprint: pristine, not dead
  });
});

describe('deriveDock', () => {
  const columns = [
    { name: 'To Do', isBlockedZone: false },
    { name: 'In Progress', isBlockedZone: false },
    { name: 'Blocked', isBlockedZone: true },
    { name: 'Done', isBlockedZone: false },
  ];
  const mk = (key, col, over = {}) =>
    ({ key, col, columnSince: 5, done: false, blocked: false, ...over });
  it('one group per working column; first is the queue; done never appears', () => {
    const view = { columns, issues: [
      mk('A-1', 0), mk('A-2', 1), mk('A-3', 3, { done: true }),
    ] };
    const { groups } = deriveDock(view);
    expect(groups.map((g) => [g.name, g.kind])).toEqual([['To Do', 'queue'], ['In Progress', 'work']]);
    expect(groups.flatMap((g) => g.issues.map((i) => i.key))).toEqual(['A-1', 'A-2']);
  });
  it('blocked issues drain into the blocked list regardless of column, stalest first', () => {
    const view = { columns, issues: [
      mk('B-1', 2, { blocked: true, columnSince: 9 }),
      mk('B-2', 1, { blocked: true, columnSince: 3 }),
    ] };
    const { groups, blocked } = deriveDock(view);
    expect(blocked.map((i) => i.key)).toEqual(['B-2', 'B-1']);
    expect(groups[1].issues).toEqual([]);
  });
});

describe('dockDensity', () => {
  it('full up to max, compact to 2x, chips capped at 3x with overflow count', () => {
    expect(dockDensity(4, 6)).toEqual({ density: 'full', show: 4, more: 0 });
    expect(dockDensity(9, 6)).toEqual({ density: 'compact', show: 9, more: 0 });
    expect(dockDensity(20, 6)).toEqual({ density: 'chip', show: 18, more: 2 });
  });
  it('exports TV capacity constants', () => {
    expect(QUEUE_MAX).toBeGreaterThan(0);
    expect(WORK_MAX).toBeGreaterThan(0);
  });
});

describe('deriveTableau', () => {
  const mkV = (remaining, total, now, end) =>
    ({ stats: { remaining, total }, now, sprint: { end } });
  it('victory when all hp is gone', () => {
    expect(deriveTableau(mkV(0, 10, 5, 10))).toBe('victory');
  });
  it('defeat when the sprint ended with hp left', () => {
    expect(deriveTableau(mkV(3, 10, 11, 10))).toBe('defeat');
  });
  it('null mid-sprint, and null for an empty sprint', () => {
    expect(deriveTableau(mkV(3, 10, 5, 10))).toBe(null);
    expect(deriveTableau(mkV(0, 0, 5, 10))).toBe(null);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/raid/__tests__/raidState.test.js`
Expected: FAIL — `bossStage` etc. not exported

- [ ] **Step 3: Implement** (append to `src/raid/raidState.js`)

```js
// HP fraction -> boss damage stage. 0 pristine, 1..3 crack levels, 4 dead.
export function bossStage(stats) {
  if (!stats.total) return 0;
  const f = stats.remaining / stats.total;
  return f <= 0 ? 4 : f <= 0.25 ? 3 : f <= 0.5 ? 2 : f <= 0.75 ? 1 : 0;
}

// Dock groups mirror the board: working columns only (Done and blocked-zone
// columns never appear); blocked issues drain into one Blocked list, exactly
// like Factory's maintenance bay. Stalest-first within each group.
export function deriveDock(view) {
  const doneIdx = view.columns.length - 1;
  const lanes = view.columns
    .map((c, idx) => ({ name: c.name, idx, isBlockedZone: c.isBlockedZone }))
    .filter((c) => c.idx !== doneIdx && !c.isBlockedZone);
  const groups = lanes.map((c, i) => ({
    name: c.name,
    kind: i === 0 ? 'queue' : 'work',
    issues: view.issues
      .filter((it) => it.col === c.idx && !it.blocked && !it.done)
      .sort((a, b) => a.columnSince - b.columnSince),
  }));
  const blocked = view.issues
    .filter((i) => i.blocked && !i.done)
    .sort((a, b) => a.columnSince - b.columnSince);
  return { groups, blocked };
}

// No scrolling on a TV: degrade card density instead. Full cards up to `max`,
// summary-less to 2x, key-only chips to 3x, then a "+N more" counter.
export const QUEUE_MAX = 8;  // chip rows in the queue (first column) group
export const WORK_MAX = 6;   // full cards per working group

export function dockDensity(count, max = WORK_MAX) {
  if (count <= max) return { density: 'full', show: count, more: 0 };
  if (count <= max * 2) return { density: 'compact', show: count, more: 0 };
  const cap = max * 3;
  return { density: 'chip', show: Math.min(count, cap), more: Math.max(0, count - cap) };
}

// End-of-fight tableau: 'victory' (boss dead), 'defeat' (sprint over, hp left).
export function deriveTableau(view) {
  if (view.stats.total > 0 && view.stats.remaining <= 0) return 'victory';
  if (view.now > view.sprint.end && view.stats.remaining > 0) return 'defeat';
  return null;
}
```

- [ ] **Step 4: Run to verify pass, then full suite**

Run: `npx vitest run src/raid/__tests__/raidState.test.js` then `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/raid/raidState.js src/raid/__tests__/raidState.test.js
git commit -m "feat: bossStage, deriveDock, dockDensity, deriveTableau selectors"
```

---

## Phase B — view shell (layout, dock, HP afterglow)

### Task 4: View identity — `arena` becomes `raid`

**Files:**
- Modify: `src/App.jsx:21-28` (useLayout) and `src/App.jsx:62` (grid template)
- Modify: `src/components/Header.jsx:27` (toggle labels)

- [ ] **Step 1: Migrate the stored layout key in `src/App.jsx`**

Replace the `useLayout` hook:

```jsx
// 'raid' (command deck) or 'factory' (the original line + boss panel).
// Older clients stored 'arena' — that view evolved into 'raid'; map it forward.
function useLayout() {
  const [layout, setLayout] = useState(() => {
    const v = localStorage.getItem('sb-view');
    return v === 'arena' || !v ? 'raid' : v;
  });
  useEffect(() => {
    localStorage.setItem('sb-view', layout);
  }, [layout]);
  return [layout, setLayout];
}
```

- [ ] **Step 2: Update the grid ternary in `src/App.jsx`**

```jsx
<main className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: layout === 'raid' ? '1fr' : '3fr 2fr' }}>
  {layout === 'raid' ? (
```

(the `<RaidView …/>` / factory branches below stay as they are)

- [ ] **Step 3: Update the toggle in `src/components/Header.jsx`**

```jsx
{['raid', 'factory'].map((l) => (
```

- [ ] **Step 4: Verify in preview**

Run dev server via `npm run mock`, open preview. Expected: header toggle reads RAID/FACTORY, raid is default, switching works and persists across reload. With devtools: `localStorage.setItem('sb-view','arena')` + reload → raid loads.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/Header.jsx
git commit -m "feat: rename arena view slot to raid, migrate stored sb-view"
```

---

### Task 5: `Ticket` density prop

**Files:**
- Modify: `src/components/Ticket.jsx` (full replacement below)
- Modify: `src/index.css` (append density rules)

- [ ] **Step 1: Replace `src/components/Ticket.jsx`**

```jsx
import Avatar from './Avatar';
import { ageBand, fmtDays } from '../lib';

// The one ticket card, identical everywhere it appears (factory line, standup,
// raid dock). density: 'full' (default) | 'compact' (no summary) | 'chip'
// (key + age only) — the dock degrades density instead of scrolling on a TV.
export default function Ticket({ issue, view, onSelect, density = 'full' }) {
  const band = view.flags?.noChangelog ? 'off' : ageBand(issue.daysInColumn, view.aging);
  return (
    <button
      className="ticket pop-in"
      data-age={band}
      data-density={density}
      data-unestimated={!issue.estimated}
      data-scope={issue.addedMidSprint}
      onClick={() => onSelect(issue)}
      title={`${issue.key} — ${issue.summary}`}
    >
      <span className="age-dot" />
      <span className="ticket-key">{issue.key}</span>
      {band !== 'off' && <span className="ticket-age">{fmtDays(issue.daysInColumn)}</span>}
      {issue.estimated && <span className="ticket-pts">{issue.points}</span>}
      <span className="ticket-face">
        <Avatar name={issue.assignee} src={issue.assigneeAvatar} />
      </span>
      <span className="ticket-summary">{issue.summary}</span>
    </button>
  );
}
```

- [ ] **Step 2: Append to `src/index.css`** (after the existing `.ticket` rules around line 157)

```css
/* dock density degradation — drop summary first, then face/points */
.ticket[data-density='compact'] .ticket-summary { display: none; }
.ticket[data-density='chip'] .ticket-summary,
.ticket[data-density='chip'] .ticket-face,
.ticket[data-density='chip'] .ticket-pts { display: none; }
.ticket[data-density='chip'] { padding: 0.18rem 0.45rem; }
```

- [ ] **Step 3: Verify nothing regressed**

Run: `npm test` (green) and check Factory in preview — cards identical to before (default density `full`).

- [ ] **Step 4: Commit**

```bash
git add src/components/Ticket.jsx src/index.css
git commit -m "feat: ticket density variants for the raid dock"
```

---

### Task 6: Dock component

**Files:**
- Create: `src/components/Dock.jsx`
- Modify: `src/index.css` (append dock styles)

- [ ] **Step 1: Create `src/components/Dock.jsx`**

```jsx
// src/components/Dock.jsx
// The data half of the command deck: real tickets, grouped by board column.
// Queue (first column) is always key-only chips; working columns carry full
// cards and degrade density instead of scrolling; blocked is always loud.
import Ticket from './Ticket';
import { deriveDock, dockDensity, QUEUE_MAX, WORK_MAX } from '../raid/raidState';

export default function Dock({ view, onSelect }) {
  const { groups, blocked } = deriveDock(view);
  return (
    <div className="dock">
      {groups.map((g) => <DockGroup key={g.name} group={g} view={view} onSelect={onSelect} />)}
      <div className="dock-group dock-blocked" data-occupied={blocked.length > 0}>
        <div className="dock-head">
          <span className="label" style={{ color: blocked.length ? 'var(--red)' : 'var(--faint)' }}>
            {blocked.length ? `⚑ Blocked · ${blocked.length}` : 'No blockers'}
          </span>
        </div>
        <div className="dock-cards" data-density="full">
          {blocked.map((i) => (
            <div key={i.key} className="dock-blocked-card">
              <Ticket issue={i} view={view} onSelect={onSelect} />
              <span className="dock-reason">{i.blockedReason || 'Flagged'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DockGroup({ group, view, onSelect }) {
  const isQueue = group.kind === 'queue';
  const { density, show, more } = isQueue
    ? { density: 'chip', show: Math.min(group.issues.length, QUEUE_MAX), more: Math.max(0, group.issues.length - QUEUE_MAX) }
    : dockDensity(group.issues.length, WORK_MAX);
  return (
    <div className="dock-group" data-kind={group.kind}>
      <div className="dock-head">
        <span className="label">{group.name} · {group.issues.length}</span>
      </div>
      <div className="dock-cards" data-density={density}>
        {group.issues.slice(0, show).map((i) => (
          <Ticket key={i.key} issue={i} view={view} onSelect={onSelect} density={density} />
        ))}
        {more > 0 && <span className="dock-more mono">+{more} more</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append to `src/index.css`**

```css
/* ── raid dock ──────────────────────────────────────────────── */
.dock { display: flex; gap: 0.6rem; flex: none; align-items: stretch; }
.dock-group {
  background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px;
  padding: 0.5rem 0.6rem; min-width: 0; display: flex; flex-direction: column; gap: 0.4rem;
}
.dock-group[data-kind='queue'] { flex: 0 0 11rem; }
.dock-group[data-kind='work'] { flex: 1 1 0; }
.dock-blocked { flex: 0 0 15rem; }
.dock-blocked[data-occupied='true'] { border-color: color-mix(in srgb, var(--red) 50%, var(--line)); }
.dock-head { flex: none; }
.dock-cards { display: flex; flex-direction: column; gap: 0.3rem; overflow: hidden; min-height: 0; }
.dock-group[data-kind='work'] .dock-cards[data-density='full'],
.dock-group[data-kind='work'] .dock-cards[data-density='compact'] {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); align-content: start;
}
.dock-more { font-size: 0.66rem; color: var(--faint); padding: 0.1rem 0.2rem; }
.dock-blocked-card { display: flex; flex-direction: column; gap: 0.15rem; }
.dock-reason { font-size: 0.66rem; color: var(--red); padding: 0 0.3rem; }
```

- [ ] **Step 3: Compile check**

Run: `npx vite build --logLevel error`
Expected: builds clean (component is not mounted yet — that's Task 7)

- [ ] **Step 4: Commit**

```bash
git add src/components/Dock.jsx src/index.css
git commit -m "feat: ticket dock component (column groups, density degradation)"
```

---

### Task 7: RaidView becomes the command deck

**Files:**
- Modify: `src/raid/RaidView.jsx` (full replacement)
- Delete: `src/components/RaidHud.jsx` (party frames retired by design)
- Modify: `src/index.css` (add raid-top/combat-log, remove raid-hud/pframe blocks)

- [ ] **Step 1: Replace `src/raid/RaidView.jsx`**

```jsx
// src/raid/RaidView.jsx
// Command deck: data layers above and below, the scene as pure spectacle between.
import { useMemo } from 'react';
import ArenaScene from './ArenaScene';
import Dock from '../components/Dock';
import TruthTicker from '../components/TruthTicker';
import { EnrageTimer, HpBar, ScarTimeline, DamageLog } from '../components/hud';
import { deriveParty, deriveMinions, pulseActions } from './raidState';

export default function RaidView({ view, pulses, onSelect }) {
  const party = useMemo(() => deriveParty(view), [view]);
  const { minions, horde } = useMemo(() => deriveMinions(view), [view]);
  const actions = pulseActions(pulses, party);
  return (
    <section className="raidview">
      <div className="raid-top">
        <div className="hud-hp">
          <HpBar view={view} onSelect={onSelect} />
          <ScarTimeline view={view} />
        </div>
        <EnrageTimer view={view} />
      </div>
      <div className="arena">
        <ArenaScene view={view} party={party} minions={minions} horde={horde} actions={actions} />
        <div className="combat-log">
          <DamageLog view={view} />
        </div>
      </div>
      <Dock view={view} onSelect={onSelect} />
      <TruthTicker view={view} onSelect={onSelect} />
    </section>
  );
}
```

- [ ] **Step 2: Delete the old HUD overlay**

```bash
git rm src/components/RaidHud.jsx
```

- [ ] **Step 3: CSS — add the new bands, remove the dead overlay styles**

In `src/index.css`, REPLACE the whole `/* ── raid HUD overlay ───…` block (the rules for `.raid-hud`, `.hud-top`, `.hud-bottom`, `.party`, `.pframe`, `.pframe[data-status=…]`, `.pframe-head`, `.pframe-name`, `.pframe-status`, `.pframe-counts`, `.pframe-list`, `.pframe-row` — keep `.hud-hp` and everything from `.ticker` down) with:

```css
/* ── raid command deck bands ────────────────────────────────── */
.raid-top { display: flex; gap: 0.9rem; align-items: flex-start; flex: none; padding: 0.1rem 0.1rem 0; }
.hud-hp { flex: 1; min-width: 0; }
.combat-log {
  position: absolute; right: 0.7rem; bottom: 0.6rem; z-index: 5; width: min(23rem, 45%);
  background: color-mix(in srgb, var(--panel) 80%, transparent);
  border: 1px solid var(--line); border-radius: 8px; padding: 0.45rem 0.6rem;
  backdrop-filter: blur(4px); pointer-events: none;
}
```

- [ ] **Step 4: Verify in preview** (`npm run mock`)

Expected, top to bottom: HP bar + scar timeline + enrage chip; the 3D scene (unchanged visuals for now) with the damage log floating bottom-right inside it; the dock with queue chips / full cards / blocked card incl. reason; the truth ticker. Click a dock card → TicketModal opens. Click hit/heal/block header chips → scene animates as before. Switch to factory → unchanged.

- [ ] **Step 5: Run tests and commit**

Run: `npm test` — green (no component tests touch RaidHud).

```bash
git add -A
git commit -m "feat: command deck layout — top band, scene, dock, ticker; retire party frames"
```

---

### Task 8: HP segment afterglow

**Files:**
- Modify: `src/components/hud.jsx` (HpBar)
- Modify: `src/index.css` (hpseg glow)

- [ ] **Step 1: Wire heat into HpBar in `src/components/hud.jsx`**

Add to the imports at the top:

```jsx
import { segmentHeat } from '../raid/heat';
```

Inside `HpBar`, after `const s = view.stats;` add:

```jsx
  // Afterglow: freshly-killed segments glow gold and cool over ~2h.
  const now = view.timeTravel ? view.now : Date.now();
  const glow = segmentHeat(view.issues, now);
```

And give each segment its heat (the `<button className="hpseg" …>` element):

```jsx
          <button
            key={issue.key}
            className="hpseg"
            style={{ flexGrow: issue.points, '--heat': glow.get(issue.key) || 0 }}
```

(the rest of the button's props stay exactly as they are)

- [ ] **Step 2: Append to `src/index.css`** (after the existing `.hpseg[data-done='true']` rule)

```css
/* afterglow: a fresh kill burns gold and cools to depleted gray over ~2h */
.hpseg[data-done='true']::after {
  content: ''; position: absolute; inset: 0; border-radius: 2px;
  background: linear-gradient(180deg, #ffe09a, #f4a83d);
  opacity: calc(var(--heat, 0) * 0.9);
  transition: opacity 0.6s;
}
```

- [ ] **Step 3: Verify in preview** (`npm run mock`)

Click the `hit` header chip. Expected: the newly-depleted segment shows the gold overlay (inspect it — `--heat` close to 1, `::after` visible). Older done segments stay plain gray (`--heat: 0`). In retro mode, scrub to just after a completion — the segment glows there too.

Note: the spec's "reopened ticket relights its segment" needs no new code — `data-done` flips to false, the gold `::after` drops out, and the existing `.hpseg` background/opacity transition (0.4s) animates the relight.

- [ ] **Step 4: Run tests and commit**

Run: `npm test`

```bash
git add src/components/hud.jsx src/index.css
git commit -m "feat: HP segments glow gold after fresh kills and cool over 2h"
```

---

## Phase C — sprite upgrade (15-frame fighters, staged boss)

### Task 9: Fighter pipeline — 28×40, 15 frames, outline + rim

**Files:**
- Create: `src/raid/timeBus.js` (tiny; the new animation code reads it)
- Modify: `src/raid/sprites/roster.js` (full replacement)
- Modify: `src/raid/FighterSprite.jsx` (full replacement)
- Test: `src/raid/__tests__/sprites.test.js` (full replacement)

- [ ] **Step 1: Replace `src/raid/__tests__/sprites.test.js`** (failing first)

```js
// src/raid/__tests__/sprites.test.js
import { describe, it, expect } from 'vitest';
import { compose, BODY_FRAMES, BODY_HEADLESS, HEAD_ANCHORS } from '../sprites/bodies';
import {
  framesFor, headlessFramesFor, paletteFor, ROSTER, FRAME,
  HEAD_ANCHORS15, SPRITE_W, SPRITE_H,
} from '../sprites/roster';
import { BOSS_FRAMES, BOSS_PALETTE, MINION_FRAMES, SLASH } from '../sprites/boss';
import { rasterize } from '../sprites/rasterize';

const FRAME_COUNT = Object.keys(FRAME).length; // 15

describe('compose', () => {
  it('overlays non-transparent chars at an offset, clipping out-of-bounds', () => {
    const out = compose(['....', '....'], ['HH', 'HH'], 3, 0);
    expect(out).toEqual(['...H', '...H']);
  });
});

describe('body + roster frames (28×40 pipeline)', () => {
  it('every roster member yields 15 equal-sized renderable frames', () => {
    for (const name of [...Object.keys(ROSTER), 'Unknown Person']) {
      const frames = framesFor(name);
      expect(frames).toHaveLength(FRAME_COUNT);
      for (const f of frames) {
        expect(f).toHaveLength(SPRITE_H);
        expect(f[0]).toHaveLength(SPRITE_W);
        expect(() => rasterize(f, paletteFor(name))).not.toThrow();
      }
    }
  });
  it('frames carry the automatic rim-light pass', () => {
    const idle = framesFor('Serban Chiricescu')[FRAME.IDLE_A];
    expect(idle.some((row) => row.includes('R'))).toBe(true);
  });
  it('unknown names fall back to the recruit look', () => {
    expect(paletteFor('Unknown Person')).toEqual(paletteFor('__recruit__'));
  });
});

describe('headless (avatar-headed) frames', () => {
  it('every roster member yields 15 renderable headless frames', () => {
    for (const name of [...Object.keys(ROSTER), 'Unknown Person']) {
      const frames = headlessFramesFor(name);
      expect(frames).toHaveLength(FRAME_COUNT);
      for (const f of frames) expect(() => rasterize(f, paletteFor(name))).not.toThrow();
    }
  });
  it('erases the head box on the base body (idle head region transparent)', () => {
    const idle = BODY_HEADLESS[0];
    for (let y = 0; y <= 6; y++) expect(idle[y].slice(2, 10)).toBe('........');
    expect(idle[9]).toBe(BODY_FRAMES[0][9]); // torso untouched
  });
  it('has one head anchor per FRAME, inside the 28×40 grid', () => {
    expect(HEAD_ANCHORS).toHaveLength(6); // base anchors stay in 14×20 space
    expect(HEAD_ANCHORS15).toHaveLength(FRAME_COUNT);
    for (const [cx, cy] of HEAD_ANCHORS15) {
      expect(cx).toBeGreaterThanOrEqual(0);
      expect(cx).toBeLessThanOrEqual(SPRITE_W);
      expect(cy).toBeGreaterThanOrEqual(0);
      expect(cy).toBeLessThanOrEqual(SPRITE_H);
    }
  });
});

describe('boss / minion / slash', () => {
  it('boss frames are renderable and equal-sized', () => {
    for (const f of BOSS_FRAMES) {
      expect(f).toHaveLength(BOSS_FRAMES[0].length);
      expect(() => rasterize(f, BOSS_PALETTE)).not.toThrow();
    }
  });
  it('minion and slash render', () => {
    for (const f of MINION_FRAMES) expect(() => rasterize(f, BOSS_PALETTE)).not.toThrow();
    expect(() => rasterize(SLASH, BOSS_PALETTE)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/raid/__tests__/sprites.test.js`
Expected: FAIL — `HEAD_ANCHORS15`, `SPRITE_W`, `SPRITE_H` not exported; frame counts wrong

- [ ] **Step 3: Create `src/raid/timeBus.js`**

```js
// Module-level hit-stop: writers add freeze seconds, TimeKeeper (ArenaScene)
// drains once per frame, everyone else just asks "are we frozen?".
// Mirrors shakeBus.
let freeze = 0;
export const addFreeze = (s) => { freeze = Math.min(0.25, freeze + s); };
export const drainFreeze = (dt) => { freeze = Math.max(0, freeze - dt); };
export const frozen = () => freeze > 0;
export const freezeLeft = () => freeze;
```

- [ ] **Step 4: Replace `src/raid/sprites/roster.js`**

```js
// src/raid/sprites/roster.js
// Hand-made look per teammate: palette + hair overlay + weapon.
// Names must match Jira display names. '__recruit__' is the unknown-assignee fallback.
//
// Frames are assembled from the 14×20 base bodies via RECIPES, upscaled 2×
// (28×40), then given automatic outline + rim-light passes. Editing art still
// means editing the 14×20 matrices in bodies.js / weapons.js.
import { BODY_FRAMES, BODY_HEADLESS, HEAD_ANCHORS, compose } from './bodies';
import { WEAPONS } from './weapons';
import { up2, shift, outline, rimLight } from './ops';

export const FRAME = {
  IDLE_A: 0, IDLE_B: 1, IDLE_C: 2, IDLE_D: 3,
  ATTACK_A: 4, ATTACK_B: 5, ATTACK_C: 6, ATTACK_D: 7, ATTACK_E: 8,
  HIT: 9, KNEEL_A: 10, KNEEL_B: 11, DOWN: 12, VICTORY_A: 13, VICTORY_B: 14,
};
export const SPRITE_W = 28;
export const SPRITE_H = 40;

// [baseBodyIdx (bodies.js order: idleA, idleB, attackA, attackB, kneel, down),
//  weaponSlot (weapons.js, same order), dx, dy]. dx/dy are 14×20 pixels applied
// to the assembled frame (weapon rides along), doubled by the upscale.
const RECIPES = [
  [0, 0, 0, 0],   // IDLE_A
  [1, 1, 0, 0],   // IDLE_B
  [0, 0, 0, 1],   // IDLE_C settle
  [1, 1, 0, 1],   // IDLE_D
  [2, 2, -1, 0],  // ATTACK_A anticipation (pull back)
  [2, 2, 0, 0],   // ATTACK_B wind-up
  [3, 3, 0, 0],   // ATTACK_C strike
  [3, 3, 1, 0],   // ATTACK_D follow-through
  [0, 0, 0, 0],   // ATTACK_E recover
  [0, 0, -1, 1],  // HIT react (lean back, drop)
  [4, 4, 0, 0],   // KNEEL_A
  [4, 4, 0, 1],   // KNEEL_B breathe
  [5, 5, 0, 0],   // DOWN
  [2, 2, 0, 0],   // VICTORY_A weapon pumped overhead
  [2, 2, 0, -1],  // VICTORY_B hop
];

const BASE_PALETTE = {
  K: '#0d1016', S: '#c9935f', H: '#3a2f26', A: '#46566b',
  B: '#2a3340', P: '#232a35', W: '#6b5b4a', L: '#bfefff', G: '#7fe7ff',
  R: '#dff4ff', // rim light, written by the rimLight pass
};

// Hair overlays sit at [4, 0] over the head rows (drafts — art-directed later).
const HAIR = {
  short:  ['.KHHK.', 'KHHHHK'],
  buzz:   ['......', 'KHHHHK'],
  long:   ['.KHHK.', 'KHHHHK', 'KH..HK', 'KH..HK'],
  bun:    ['KK.KHK', '.KHHHK'],
  spiky:  ['KH.HK.', 'KHHHHK'],
};

export const ROSTER = {
  'Serban Chiricescu': { hair: 'short', weapon: 'sword',   palette: { H: '#2b2118', A: '#4a5d74' } },
  'Calin Nicoara':     { hair: 'buzz',  weapon: 'hammer',  palette: { H: '#1d1813', A: '#5d5446' } },
  'Cristina Stanica':  { hair: 'long',  weapon: 'staff',   palette: { H: '#4a3220', A: '#5b4a6b' } },
  'Andrei Scheau':     { hair: 'spiky', weapon: 'bow',     palette: { H: '#332620', A: '#3d5c52' } },
  'Alex Preda':        { hair: 'short', weapon: 'daggers', palette: { H: '#16120e', A: '#444c63' } },
  'Corina Ivanov':     { hair: 'bun',   weapon: 'sword',   palette: { H: '#52341d', A: '#6b4a55' } },
  'Mihai Saru':        { hair: 'short', weapon: 'staff',   palette: { H: '#26201a', A: '#3f5a6b' } },
  '__recruit__':       { hair: 'buzz',  weapon: 'sword',   palette: { H: '#3a3a3a', A: '#4a4a52' } },
};

const personOf = (name) => ROSTER[name] || ROSTER.__recruit__;

export function paletteFor(name) {
  return { ...BASE_PALETTE, ...personOf(name).palette };
}

function build(name, headless) {
  const p = personOf(name);
  return RECIPES.map(([bi, ws, dx, dy]) => {
    let f = headless ? BODY_HEADLESS[bi] : compose(BODY_FRAMES[bi], HAIR[p.hair], 4, 0);
    const w = WEAPONS[p.weapon][ws];
    if (w) f = compose(f, w.grid, w.at[0], w.at[1]);
    f = up2(f);
    if (dx || dy) f = shift(f, dx * 2, dy * 2);
    return rimLight(outline(f));
  });
}

export const framesFor = (name) => build(name, false);
export const headlessFramesFor = (name) => build(name, true);

// Head-centre anchors per FRAME, in 28×40 pixel space.
export const HEAD_ANCHORS15 = RECIPES.map(([bi, , dx, dy]) => {
  const [cx, cy] = HEAD_ANCHORS[bi];
  return [cx * 2 + dx * 2, cy * 2 + dy * 2];
});
```

Note: the original 14×20 hair offset was `[4, 0]`? No — it was `compose(body, HAIR[p.hair], 4, 0)` in the old file too. Unchanged on purpose (hair composes BEFORE the upscale).

- [ ] **Step 5: Run sprite tests**

Run: `npx vitest run src/raid/__tests__/sprites.test.js`
Expected: PASS

- [ ] **Step 6: Replace `src/raid/FighterSprite.jsx`**

```jsx
// src/raid/FighterSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { headlessFramesFor, paletteFor, FRAME, HEAD_ANCHORS15 } from './sprites/roster';
import { avatarTexture } from './avatarTexture';
import { frozen } from './timeBus';

const PX = 0.05; // world units per sprite pixel -> 28x40 body ≈ 1.4 x 2.0
const HEAD_SIZE = 0.8; // avatar disc diameter — bobblehead proportions on purpose

// Head-centre anchor (28×40 pixel coords) -> local offset within the group.
// The body plane is centred at [0, PX*20], pixel (14, 20).
const headPos = (frame) => {
  const [cx, cy] = HEAD_ANCHORS15[frame];
  return [(cx - 14) * PX, (40 - cy) * PX];
};

// Attack timeline: [duration, frame, lunge]. Strike fires entering ATTACK_C.
const ATK = [
  [0.12, FRAME.ATTACK_A, -0.1],
  [0.1, FRAME.ATTACK_B, -0.18],
  [0.1, FRAME.ATTACK_C, 0.55],
  [0.12, FRAME.ATTACK_D, 0.5],
  [0.16, FRAME.ATTACK_E, 0.15],
];
const ATK_TOTAL = ATK.reduce((s, [d]) => s + d, 0);
const STRIKE_AT = ATK[0][0] + ATK[1][0];

const IDLE_CYCLE = [FRAME.IDLE_A, FRAME.IDLE_B, FRAME.IDLE_C, FRAME.IDLE_D];

// attack: latest {id, points} action for this fighter (or null).
// onStrike(points): fired once per attack at the moment of impact.
// aura: 0..1 afterglow of a recent kill; beaconHeat: 0..1 freshness of a block.
// tableau: 'victory' | 'defeat' | null (end-of-sprint poses).
export default function FighterSprite({ fighter, attack, onStrike, position, phase = 0, aura = 0, beaconHeat = 0, tableau = null }) {
  const entry = useMemo(
    () => sheetTexture(`fighter:${fighter.name}:headless:v2`, headlessFramesFor(fighter.name), paletteFor(fighter.name)),
    [fighter.name]
  );
  const headTex = useMemo(() => avatarTexture(fighter.name, fighter.avatar), [fighter.name, fighter.avatar]);
  const group = useRef();
  const mat = useRef();
  const head = useRef();
  const headMat = useRef();
  const auraMat = useRef();
  const anim = useRef({ id: null, t: 0, struck: false });

  useFrame((state, rawDt) => {
    const dt = frozen() ? 0 : rawDt; // hit-stop freezes the choreography
    const a = anim.current;
    if (attack && attack.id !== a.id) { a.id = attack.id; a.t = 0; a.struck = false; }
    const attacking = a.id !== null && a.t < ATK_TOTAL && fighter.status !== 'down';
    let frame;
    let lunge = 0;
    if (attacking) {
      a.t += dt;
      let acc = 0;
      let seg = ATK[ATK.length - 1];
      for (const s of ATK) { acc += s[0]; if (a.t < acc) { seg = s; break; } }
      frame = seg[1];
      lunge = seg[2];
      if (a.t >= STRIKE_AT && !a.struck) {
        a.struck = true;
        onStrike?.(attack.points);
      }
    } else if (tableau === 'victory') {
      frame = Math.floor(state.clock.elapsedTime / 0.35 + phase) % 2 ? FRAME.VICTORY_B : FRAME.VICTORY_A;
    } else if (fighter.status === 'down') {
      frame = FRAME.DOWN;
    } else if (tableau === 'defeat' || fighter.status === 'exhausted') {
      frame = Math.floor(state.clock.elapsedTime / 0.9 + phase) % 2 ? FRAME.KNEEL_B : FRAME.KNEEL_A;
    } else {
      frame = IDLE_CYCLE[Math.floor(state.clock.elapsedTime / 0.5 + phase) % 4];
    }
    setFrame(entry, frame);
    group.current.position.x = position[0] + lunge;
    // The avatar head follows the pose's head anchor (z forward of the body).
    const [hx, hy] = headPos(frame);
    head.current.position.set(hx, hy, 0.02);
    // Dim the weary.
    const dim = fighter.status === 'exhausted' ? 0.55 : fighter.status === 'resting' ? 0.8 : 1;
    mat.current.color.setScalar(dim);
    headMat.current.color.setScalar(dim);
    if (auraMat.current) {
      auraMat.current.opacity = aura * (0.32 + 0.1 * Math.sin(state.clock.elapsedTime * 2 + phase));
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh position={[0, PX * 20, 0]}>
        <planeGeometry args={[28 * PX, 40 * PX]} />
        <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      <mesh ref={head} position={[0, PX * 33.6, 0.02]}>
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
}

// Blinking red distress light over a downed fighter — fresher blocks burn brighter.
function Beacon({ heat = 0 }) {
  const m = useRef();
  useFrame((state) => {
    const amp = 0.45 + 0.55 * heat;
    m.current.material.opacity = amp * (0.35 + 0.65 * Math.abs(Math.sin(state.clock.elapsedTime * 3)));
    m.current.scale.setScalar(1 + heat * 0.6);
  });
  return (
    <mesh ref={m} position={[0, 2.5, 0]}>
      <sphereGeometry args={[0.09, 8, 8]} />
      <meshBasicMaterial color="#ff5d5d" transparent toneMapped={false} />
    </mesh>
  );
}
```

- [ ] **Step 7: Verify in preview** (`npm run mock`)

Expected: fighters are crisper (finer pixels, pale rim on the lit edge), idle cycles through 4 frames, `hit` chip plays the 5-step attack (pull back → wind-up → lunge strike → follow-through → recover, ~0.6s), exhausted fighters breathe while kneeling, blocked fighter lies down with beacon. Avatar heads still track every pose (incl. DOWN, lying).

- [ ] **Step 8: Full suite + commit**

Run: `npm test`

```bash
git add src/raid/timeBus.js src/raid/sprites/roster.js src/raid/FighterSprite.jsx src/raid/__tests__/sprites.test.js
git commit -m "feat: 28x40 fighter pipeline — 15 recipe frames, outline+rim, richer attack"
```

---

### Task 10: Boss — damage stages, knockback, scars, death

**Files:**
- Modify: `src/raid/sprites/boss.js` (append cracks + `bossFrames`, extend palette)
- Modify: `src/raid/BossSprite.jsx` (full replacement)
- Test: `src/raid/__tests__/sprites.test.js` (replace the boss describe)

- [ ] **Step 1: Update the boss describe in `src/raid/__tests__/sprites.test.js`** (failing first)

Add `bossFrames` to the boss import line:

```js
import { BOSS_FRAMES, BOSS_PALETTE, MINION_FRAMES, SLASH, bossFrames } from '../sprites/boss';
```

Replace the `it('boss frames are renderable and equal-sized', …)` test with:

```js
  it('staged boss frames are renderable, 56×52, and crack progressively', () => {
    for (const stage of [0, 1, 2, 3]) {
      const frames = bossFrames(stage);
      expect(frames).toHaveLength(BOSS_FRAMES.length); // idle A/B + cast
      for (const f of frames) {
        expect(f).toHaveLength(52);
        expect(f[0]).toHaveLength(56);
        expect(() => rasterize(f, BOSS_PALETTE)).not.toThrow();
      }
    }
    const core = (fs) => fs[0].join('').split('O').length;
    expect(core(bossFrames(1))).toBeGreaterThan(core(bossFrames(0)));
    expect(core(bossFrames(3))).toBeGreaterThan(core(bossFrames(1)));
  });
```

Run: `npx vitest run src/raid/__tests__/sprites.test.js` — FAIL (`bossFrames` missing)

- [ ] **Step 2: Extend `src/raid/sprites/boss.js`**

Add `O` (molten core) and `R` (rim) to `BOSS_PALETTE`:

```js
export const BOSS_PALETTE = {
  K: '#0d1016', M: '#5b6b7d', D: '#3a4654', E: '#ff5d5d',
  G: '#7fe7ff', C: '#e8eef4', W: '#6b5b4a', L: '#bfefff',
  O: '#ff9d3d', R: '#9fbdd4',
};
```

Append at the end of the file (after `SLASH`):

```js
/* Damage stages: crack overlays composed onto every frame as HP drops.
   Sparse overlays in 28×26 space — short rows are fine, compose clips.
   'O' is the molten core glowing through; 'K' the crack shadow. */
import { compose } from './bodies';
import { up2, outline, rimLight } from './ops';

const CRACK_1 = [
  '', '', '', '', '',
  '......KO',
  '.......KO',
  '', '', '', '',
  '..................OK',
  '.................OK',
];
const CRACK_2 = [
  '', '', '', '', '', '', '', '',
  '..........KOO',
  '...........KOO',
  '............KO',
  '', '', '', '', '',
  '.......OK',
  '........OK',
];
const CRACK_3 = [
  '', '',
  '.....KO',
  '......O',
  '', '', '', '', '', '', '', '',
  '...............OOK',
  '..............OOK',
  '.............OK',
  '', '', '',
  '....................OK',
  '.....................OK',
];
const CRACKS = [null, CRACK_1, CRACK_2, CRACK_3];

// Staged frames: cracks accumulate, then 2× upscale + outline + rim.
// stage 0..3 — stage 4 (dead) is a scene animation, not a sheet.
export function bossFrames(stage) {
  const s = Math.max(0, Math.min(3, stage));
  return BOSS_FRAMES.map((f) => {
    let out = f;
    for (let i = 1; i <= s; i++) out = compose(out, CRACKS[i], 0, 0);
    return rimLight(outline(up2(out)));
  });
}
```

(Move the two `import` lines to the top of the file with the others — ESM imports must be top-level.)

Run: `npx vitest run src/raid/__tests__/sprites.test.js` — PASS

- [ ] **Step 3: Replace `src/raid/BossSprite.jsx`**

```jsx
// src/raid/BossSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { bossFrames, BOSS_FRAME, BOSS_PALETTE } from './sprites/boss';
import { addShake } from './shakeBus';
import { frozen } from './timeBus';
import { hueOf } from '../lib';

const PX = 0.095; // 56x52 -> ≈ 5.3 x 4.9 world units
export const BOSS_X = 4.6;
const BODY_W = 56 * PX;
const BODY_H = 52 * PX;

// Deterministic scar spot on the torso, hashed from the issue key.
const scarPos = (key) => {
  const h = hueOf(key);
  return [
    ((h % 19) / 19 - 0.5) * BODY_W * 0.5,
    BODY_H * (0.35 + ((h % 7) / 7) * 0.3) - BODY_H / 2,
  ];
};

// hit/summon: latest pulse actions. stage: 0..3 crack level (raidState.bossStage).
// scars: [{key, ts, heat}] afterglow of recent hits. dead: tableau === 'victory'.
export default function BossSprite({ enraged, hit, summon, stage = 0, scars = [], dead = false }) {
  const palette = useMemo(
    () => (enraged ? { ...BOSS_PALETTE, E: '#ff2222', G: '#ff5d5d', C: '#ffd479' } : BOSS_PALETTE),
    [enraged]
  );
  const entry = useMemo(
    () => sheetTexture(`boss:v2:s${Math.min(stage, 3)}:${enraged ? 'enraged' : 'calm'}`, bossFrames(stage), palette),
    [palette, enraged, stage]
  );
  const group = useRef();
  const mat = useRef();
  const fx = useRef({ hitId: null, flash: 0, kick: 0, summonId: null, cast: 0, death: 0, rumbled: false });

  useFrame((state, rawDt) => {
    const dt = frozen() ? 0 : rawDt;
    const f = fx.current;
    if (hit && hit.id !== f.hitId) { f.hitId = hit.id; f.flash = 1; f.kick = 1; }
    if (summon && summon.id !== f.summonId) { f.summonId = summon.id; f.cast = 0.9; }
    f.flash = Math.max(0, f.flash - dt * 3.5);
    f.kick = Math.max(0, f.kick - dt * 2.2);
    f.cast = Math.max(0, f.cast - dt);

    // Death: one big rumble, then sink and fade (rawDt — the crumble ignores hit-stop).
    if (dead) {
      if (!f.rumbled) { f.rumbled = true; addShake(0.9); }
      f.death = Math.min(1.6, f.death + rawDt);
    }
    const sink = f.death / 1.6;
    group.current.position.y = BODY_H / 2 - sink * BODY_H * 0.9;
    mat.current.opacity = 1 - sink;

    const breathing = Math.floor(state.clock.elapsedTime / 1.1) % 2;
    setFrame(entry, f.cast > 0 ? BOSS_FRAME.CAST : breathing ? BOSS_FRAME.IDLE_B : BOSS_FRAME.IDLE_A);
    // White flash on hit; green wash while casting a summon.
    const w = 1 + f.flash * 3;
    mat.current.color.setRGB(w, w + (f.cast > 0 ? 1.2 : 0), w);
    // Knockback eases out; flash keeps the old jitter on top.
    group.current.position.x = BOSS_X + f.kick * f.kick * 0.45 + (f.flash > 0 ? (Math.random() - 0.5) * 0.12 : 0);
  });

  return (
    <group ref={group} position={[BOSS_X, BODY_H / 2, -0.4]}>
      <mesh>
        <planeGeometry args={[BODY_W, BODY_H]} />
        <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      {!dead && scars.map((s) => <Scar key={`${s.key}-${s.ts}`} scar={s} />)}
    </group>
  );
}

// Glowing impact mark; brightness = afterglow heat, cooling over the day.
function Scar({ scar }) {
  const [x, y] = scarPos(scar.key);
  return (
    <mesh position={[x, y, 0.01]}>
      <circleGeometry args={[0.11, 12]} />
      <meshBasicMaterial color="#ff9d3d" transparent opacity={scar.heat * 0.8} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
```

ArenaScene still passes only `enraged/hit/summon` — the new props default safely; they get wired in Task 11/12.

- [ ] **Step 4: Verify in preview**

Expected: boss noticeably larger and crisper with a pale rim; `hit` chip → flash + a kick-back that eases out. No cracks yet at full HP. Temporarily hard-code `stage={2}` on `<BossSprite>` in `ArenaScene.jsx` to see molten cracks, then revert.

- [ ] **Step 5: Full suite + commit**

Run: `npm test`

```bash
git add src/raid/sprites/boss.js src/raid/BossSprite.jsx src/raid/__tests__/sprites.test.js
git commit -m "feat: staged boss — 56x52 sheet, crack overlays, knockback, death sink, scar slots"
```

---

## Phase D — game feel + afterglow in the scene

### Task 11: FX components (ImpactFX, Debris) + minion glyph

**Files:**
- Create: `src/raid/ImpactFX.jsx`
- Create: `src/raid/Debris.jsx`
- Modify: `src/raid/MinionSprite.jsx` (full replacement: spawn glyph, exports `minionPos`)

- [ ] **Step 1: Create `src/raid/ImpactFX.jsx`**

```jsx
// src/raid/ImpactFX.jsx
// Sparks + expanding shockwave ring at an impact point, ~0.45s. The color makes
// it double as the boss-hit burst (gold) and the minion death poof (lime).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const LIFE = 0.45;
const N = 14;

export default function ImpactFX({ item, onDone }) {
  const ring = useRef();
  const sparks = useRef([]);
  const t = useRef(0);
  const seeds = useMemo(
    () => Array.from({ length: N }, (_, i) => ({
      a: (i / N) * Math.PI * 2 + (i % 3) * 0.21,
      v: 1.6 + (i % 5) * 0.35,
    })),
    []
  );
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current > LIFE) return onDone(item.id);
    const k = t.current / LIFE;
    if (ring.current) {
      ring.current.scale.setScalar(0.4 + k * 2.2);
      ring.current.material.opacity = 0.55 * (1 - k);
    }
    seeds.forEach((s, i) => {
      const m = sparks.current[i];
      if (!m) return;
      const d = s.v * t.current;
      m.position.set(Math.cos(s.a) * d, Math.sin(s.a) * d * 0.7 - 1.2 * t.current * t.current, 0);
      m.material.opacity = 1 - k;
    });
  });
  return (
    <group position={[item.x, item.y, 0.6]}>
      <mesh ref={ring}>
        <ringGeometry args={[0.3, 0.36, 24]} />
        <meshBasicMaterial color={item.color} transparent opacity={0.55} toneMapped={false} depthWrite={false} />
      </mesh>
      {seeds.map((s, i) => (
        <mesh key={i} ref={(el) => (sparks.current[i] = el)}>
          <planeGeometry args={[0.06, 0.06]} />
          <meshBasicMaterial color={item.color} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Create `src/raid/Debris.jsx`**

```jsx
// src/raid/Debris.jsx
// Afterglow on the battlefield: one planted sword per recent kill, fading over
// ~24h (heat from heat.js/debris). A glance separates a busy day from a quiet one.
import { useMemo } from 'react';
import { sheetTexture } from './sprites/textures';
import { hueOf } from '../lib';

const SWORD = ['..L', '.LL', '..L', '.WW', '..W'];
const PAL = { L: '#bfefff', W: '#6b5b4a' };
const PX = 0.06;
const CAP = 20; // newest kills only — a memento field, not a graveyard

export default function Debris({ kills }) {
  const entry = useMemo(() => sheetTexture('debris-sword', [SWORD], PAL), []);
  return (
    <group>
      {kills.slice(-CAP).map((k) => {
        const h = hueOf(k.key);
        const x = -3.6 + ((h % 23) / 23) * 5.4; // scattered between party and boss
        const z = 0.9 + ((h % 11) / 11) * 1.4;  // in front of the action line
        return (
          <mesh key={`${k.key}-${k.ts}`} position={[x, 0.16, z]} rotation={[0, 0, ((h % 5) - 2) * 0.07]}>
            <planeGeometry args={[3 * PX, 5 * PX]} />
            <meshBasicMaterial
              map={entry.tex} transparent alphaTest={0.1} toneMapped={false}
              opacity={0.25 + 0.6 * k.heat} depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
```

- [ ] **Step 3: Replace `src/raid/MinionSprite.jsx`**

```jsx
// src/raid/MinionSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { sheetTexture, setFrame } from './sprites/textures';
import { MINION_FRAMES, BOSS_PALETTE } from './sprites/boss';

const PX = 0.09;

// Slot -> world position. ArenaScene reuses this to place death poofs after
// a minion's ticket closes and it leaves the list.
export const minionPos = (index) => [2.6 + (index % 3) * 0.75, 0.36, 0.6 + Math.floor(index / 3) * 0.7];

export default function MinionSprite({ issue, index, horde = 0 }) {
  // Key by slot index mod MINION_CAP (6) so the cache stays bounded at ≤6 entries.
  const entry = useMemo(() => sheetTexture(`minion:${index % 6}`, MINION_FRAMES, BOSS_PALETTE), [index]);
  const mesh = useRef();
  const glyph = useRef();
  const born = useRef(null);
  useFrame((state) => {
    if (born.current == null) born.current = state.clock.elapsedTime;
    const age = state.clock.elapsedTime - born.current;
    const pop = Math.min(1, age * 3); // spawn bounce
    mesh.current.scale.setScalar(pop * (1 + Math.sin(age * 3 + index) * 0.04));
    setFrame(entry, Math.floor(state.clock.elapsedTime / 0.5 + index) % 2);
    if (glyph.current) {
      // Summon glyph: the green ring the minion rises out of, gone in ~0.7s.
      const k = Math.min(1, age / 0.7);
      glyph.current.scale.setScalar(0.6 + k * 0.7);
      glyph.current.material.opacity = 0.7 * (1 - k);
    }
  });
  const [x, y, z] = minionPos(index);
  return (
    <group position={[x, y, z]}>
      <mesh ref={glyph} rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + 0.02, 0]}>
        <ringGeometry args={[0.32, 0.4, 24]} />
        <meshBasicMaterial color="#a3e635" transparent opacity={0.7} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={mesh}>
        <planeGeometry args={[10 * PX, 8 * PX]} />
        <meshBasicMaterial map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      {horde > 0 && (
        <Text position={[0.55, 0.3, 0]} fontSize={0.28} color="#a3e635" anchorX="left">
          {`+${horde}`}
        </Text>
      )}
    </group>
  );
}
```

- [ ] **Step 4: Arc the damage numbers — replace `src/raid/FloatNum.jsx`**

The spec calls for arcing (not elevator) numbers: pop on impact, decelerating rise, sideways drift.

```jsx
// src/raid/FloatNum.jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

export default function FloatNum({ item, onDone }) {
  const ref = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current > 1.3) return onDone(item.id);
    const k = t.current / 1.3;
    ref.current.position.y = item.y + (1 - (1 - k) * (1 - k)) * 1.4; // ease-out rise
    ref.current.position.x = item.x + k * 0.6;                       // drift off the impact
    ref.current.fontSize = 0.42 * (1 + Math.max(0, 0.25 - k) * 2);   // impact pop
    ref.current.fillOpacity = Math.max(0, 1 - k * k * 1.4);
  });
  return (
    <Text ref={ref} position={[item.x, item.y, 1.2]} fontSize={0.42} color={item.color}
      anchorX="center" outlineWidth={0.02} outlineColor="#0d1016">
      {item.text}
    </Text>
  );
}
```

- [ ] **Step 5: Compile check + commit**

Run: `npx vite build --logLevel error` and `npm test`

```bash
git add src/raid/ImpactFX.jsx src/raid/Debris.jsx src/raid/MinionSprite.jsx src/raid/FloatNum.jsx
git commit -m "feat: impact sparks/ring FX, debris swords, minion summon glyph, arcing numbers"
```

---

### Task 12: ArenaScene wiring — hit-stop, afterglow, tableau, poofs, lite

**Files:**
- Modify: `src/raid/ArenaScene.jsx` (full replacement below)

- [ ] **Step 1: Replace `src/raid/ArenaScene.jsx`**

```jsx
// src/raid/ArenaScene.jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useMemo, useState, useEffect, useRef } from 'react';
import { cssVar } from './cssVar';
import { drainShake, addShake } from './shakeBus';
import { addFreeze, drainFreeze } from './timeBus';
import { bossStage, deriveTableau } from './raidState';
import { fighterAuras, fighterBlockHeat, bossScars, debris } from './heat';
import FighterSprite from './FighterSprite';
import BossSprite from './BossSprite';
import MinionSprite, { minionPos } from './MinionSprite';
import FloatNum from './FloatNum';
import SlashFX from './SlashFX';
import ImpactFX from './ImpactFX';
import Debris from './Debris';
import Effects from './Effects';

// ?lite — for TVs that can't hold 60fps: lower dpr, no post chain, fewer particles.
export const LITE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('lite');

// Drains the hit-stop accumulator exactly once per frame; everyone else
// just asks frozen()/freezeLeft().
function TimeKeeper() {
  useFrame((_, dt) => drainFreeze(dt));
  return null;
}

function CameraRig() {
  const { camera } = useThree();
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const shake = drainShake(dt);
    camera.position.x = Math.sin(t * 0.07) * 0.55 + (Math.random() - 0.5) * shake * 0.5;
    camera.position.y = 2.1 + Math.sin(t * 0.11) * 0.12 + (Math.random() - 0.5) * shake * 0.35;
    camera.position.z = 9.4;
    camera.lookAt(0, 1.5, 0);
  });
  return null;
}

function Floor() {
  const color = useMemo(() => cssVar('--panel', '#101822'), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 24]} />
      <MeshReflectorMaterial
        blur={[300, 80]} resolution={LITE ? 256 : 512} mixBlur={0.85} mixStrength={7}
        roughness={0.8} depthScale={1.1} color={color} metalness={0.3}
      />
    </mesh>
  );
}

const EMBERS = LITE ? 40 : 120;
function Embers({ enraged }) {
  const ref = useRef();
  const seeds = useMemo(() =>
    Array.from({ length: EMBERS }, () => ({
      x: (Math.random() - 0.5) * 16, y: Math.random() * 6, z: (Math.random() - 0.5) * 6,
      v: 0.15 + Math.random() * 0.4, w: Math.random() * 6.28,
    })), []);
  const positions = useMemo(() => new Float32Array(EMBERS * 3), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = enraged ? 2.2 : 1;
    seeds.forEach((s, i) => {
      positions[i * 3] = s.x + Math.sin(t * 0.4 + s.w) * 0.4;
      positions[i * 3 + 1] = (s.y + t * s.v * speed) % 6;
      positions[i * 3 + 2] = s.z;
    });
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={EMBERS} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color={enraged ? '#ff5d5d' : '#ff9d5c'} transparent opacity={0.7} toneMapped={false} />
    </points>
  );
}

export default function ArenaScene({ view, party = [], minions = [], horde = 0, actions = [] }) {
  const enraged = view.stats.enraged;
  const stage = bossStage(view.stats);
  const tableau = deriveTableau(view);

  // Afterglow inputs — pure functions of (events, issues, view.now): retro-safe.
  const auras = useMemo(() => fighterAuras(view.events, view.issues, view.now), [view]);
  const blockHeat = useMemo(() => fighterBlockHeat(view.events, view.issues, view.now), [view]);
  const scars = useMemo(() => bossScars(view.events, view.now), [view]);
  const kills = useMemo(() => debris(view.events, view.now), [view]);

  const [floats, setFloats] = useState([]);
  const nextFloat = useRef(0);
  const addFloat = (text, color, x, y) =>
    setFloats((fs) => [...fs, { id: nextFloat.current++, text, color, x, y }]);
  const removeFloat = (id) => setFloats((fs) => fs.filter((f) => f.id !== id));

  const [slashes, setSlashes] = useState([]);
  const nextSlash = useRef(0);
  const addSlash = (x) => setSlashes((ss) => [...ss, { id: nextSlash.current++, x }]);
  const removeSlash = (id) => setSlashes((ss) => ss.filter((s) => s.id !== id));

  const [impacts, setImpacts] = useState([]);
  const nextImpact = useRef(0);
  const addImpact = (x, y, color) =>
    setImpacts((xs) => [...xs, { id: nextImpact.current++, x, y, color }]);
  const removeImpact = (id) => setImpacts((xs) => xs.filter((i) => i.id !== id));

  // A minion whose ticket closed vanishes from the list — give it a death poof.
  const prevMinions = useRef([]);
  useEffect(() => {
    const gone = prevMinions.current.filter((p) => !minions.some((m) => m.key === p.key));
    prevMinions.current = minions.map((m, i) => ({ key: m.key, i }));
    for (const g of gone) {
      const [x] = minionPos(g.i);
      addImpact(x, 0.5, '#a3e635');
    }
  }, [minions]);

  const hit = actions.find((a) => a.kind === 'attack') || null;
  const summon = actions.find((a) => a.kind === 'summon') || null;
  const summonSeen = useRef(null);
  useEffect(() => {
    if (summon && summon.id !== summonSeen.current) {
      summonSeen.current = summon.id;
      addFloat(`+${summon.points}`, '#a3e635', 4.6, 4.4);
    }
  }, [summon]);

  const strike = (points) => {
    addFreeze(Math.min(0.14, 0.06 + points * 0.01)); // hit-stop scaled to points
    addShake(0.25 + Math.min(0.5, points * 0.08));
    addFloat(`−${points}`, '#7fe7ff', 4.2, 3.6);
    addSlash(3.4);
    addImpact(3.5, 2.2, '#ffd479');
  };

  // Unattributed hits (no owning fighter, e.g. unassigned tickets) still land:
  // no sprite swings, so trigger the impact suite directly.
  const orphanSeen = useRef(null);
  useEffect(() => {
    if (hit && hit.fighter === -1 && hit.id !== orphanSeen.current) {
      orphanSeen.current = hit.id;
      strike(hit.points);
    }
  }, [hit]);

  return (
    <Canvas
      dpr={LITE ? 1 : [1, 1.75]}
      camera={{ fov: 35, position: [0, 2.1, 9.4] }}
      gl={{ antialias: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[cssVar('--bg', '#0a0e13')]} />
      <fog attach="fog" args={[cssVar('--bg', '#0a0e13'), 9, 22]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[-4, 5, 4]} intensity={60} color="#7fe7ff" />
      <pointLight position={[4.5, 4, 2]} intensity={enraged ? 110 : 50} color={enraged ? '#ff5d5d' : '#ff9d5c'} />
      <TimeKeeper />
      <CameraRig />
      <Floor />
      <Debris kills={kills} />
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
          position={[-4.7 + (i % 5) * 1.1 + Math.floor(i / 5) * 0.4, 0, 0.2 - Math.floor(i / 5) * 0.85]}
        />
      ))}
      <BossSprite
        enraged={enraged} hit={hit} summon={summon}
        stage={stage} scars={scars} dead={tableau === 'victory'}
      />
      {tableau !== 'victory' && minions.map((m, i) => (
        <MinionSprite key={m.key} issue={m} index={i} horde={i === minions.length - 1 ? horde : 0} />
      ))}
      {floats.map((f) => <FloatNum key={f.id} item={f} onDone={removeFloat} />)}
      {slashes.map((s) => <SlashFX key={s.id} item={s} onDone={removeSlash} />)}
      {impacts.map((im) => <ImpactFX key={im.id} item={im} onDone={removeImpact} />)}
      <Embers enraged={enraged} />
      <Effects enraged={enraged} tableau={tableau} lite={LITE} />
    </Canvas>
  );
}
```

(`Effects` ignores the new props until Task 14 — harmless.)

- [ ] **Step 2: Verify in preview** (`npm run mock`)

- `hit` chip: brief hit-stop freeze, then shake + slash + gold sparks/ring + float; a planted sword appears on the floor; attacker gains an ember floor aura; a glowing scar dot shows on the boss.
- `heal` chip: glyph ring under the rising minion.
- Complete a scope-added ticket (`hit` until one of the minion tickets closes): lime poof where it stood.
- `block` chip: downed fighter, beacon bright (fresh).
- Retro mode: scrub to mid-sprint — debris/scars/auras reflect that moment.

- [ ] **Step 3: Full suite + commit**

Run: `npm test`

```bash
git add src/raid/ArenaScene.jsx
git commit -m "feat: scene wiring — hit-stop, impact FX, afterglow residue, tableau, lite flag"
```

---

## Phase E — environment & post

### Task 13: Environment (parallax ruins, shafts, fog, braziers, dust)

**Files:**
- Create: `src/raid/Environment.jsx`
- Modify: `src/raid/ArenaScene.jsx` (mount it)

- [ ] **Step 1: Create `src/raid/Environment.jsx`**

```jsx
// src/raid/Environment.jsx
// The diorama around the fight: parallax ruin silhouettes, light shafts,
// drifting ground fog, flickering braziers, dust motes. Purely decorative.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Seeded rand so the backdrop is identical on every mount (retro replays too).
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function silhouetteTexture(seed, color, minH) {
  const rnd = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color;
  let x = 0;
  while (x < 512) {
    const w = 14 + rnd() * 50;
    const h = minH + rnd() * 60;
    g.fillRect(x, 128 - h, w, h);                                // ruined pillar
    if (rnd() > 0.55) g.fillRect(x - 4, 128 - h - 6, w + 8, 6);  // broken cap
    x += w + 6 + rnd() * 30;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function Backdrop() {
  const far = useMemo(() => silhouetteTexture(7, '#0c1320', 30), []);
  const mid = useMemo(() => silhouetteTexture(19, '#101a2b', 50), []);
  return (
    <>
      <mesh position={[0, 2.6, -8]}>
        <planeGeometry args={[34, 6.5]} />
        <meshBasicMaterial map={far} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.2, -5.5]}>
        <planeGeometry args={[28, 5.5]} />
        <meshBasicMaterial map={mid} transparent toneMapped={false} />
      </mesh>
    </>
  );
}

function Shafts() {
  const g = useRef();
  useFrame((state) => {
    g.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.02;
  });
  return (
    <group ref={g}>
      {[-2.5, 0.5, 3.5].map((x, i) => (
        <mesh key={i} position={[x, 4.5, -3]} rotation={[0, 0, 0.28 - i * 0.06]}>
          <planeGeometry args={[0.9 + i * 0.3, 11]} />
          <meshBasicMaterial
            color="#9fc2ff" transparent opacity={0.045} toneMapped={false}
            blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function FogBands() {
  const a = useRef();
  const b = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    a.current.position.x = Math.sin(t * 0.05) * 1.2;
    b.current.position.x = Math.sin(t * 0.04 + 2) * 1.6;
  });
  return (
    <>
      <mesh ref={a} position={[0, 0.45, 1.6]}>
        <planeGeometry args={[24, 0.9]} />
        <meshBasicMaterial color="#8fa8d8" transparent opacity={0.05} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={b} position={[0, 0.8, -1.5]}>
        <planeGeometry args={[26, 1.3]} />
        <meshBasicMaterial color="#8fa8d8" transparent opacity={0.04} toneMapped={false} depthWrite={false} />
      </mesh>
    </>
  );
}

function Brazier({ x, enraged }) {
  const light = useRef();
  const flame = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker = 0.75 + Math.sin(t * 7 + x) * 0.15 + Math.sin(t * 13.7 + x * 2) * 0.1;
    light.current.intensity = (enraged ? 26 : 16) * flicker;
    flame.current.scale.y = 0.8 + flicker * 0.35;
    flame.current.material.opacity = 0.75 + flicker * 0.2;
  });
  return (
    <group position={[x, 0, 1.9]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshBasicMaterial color="#141a26" />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.2]} />
        <meshBasicMaterial color="#1c2433" />
      </mesh>
      <mesh ref={flame} position={[0, 1.18, 0]}>
        <coneGeometry args={[0.12, 0.42, 6]} />
        <meshBasicMaterial color={enraged ? '#ff5d5d' : '#ffb15c'} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.3, 0.3]} color={enraged ? '#ff5d5d' : '#ff9d5c'} intensity={16} distance={7} />
    </group>
  );
}

const MOTES = 50;
function Dust() {
  const ref = useRef();
  const seeds = useMemo(() => {
    const rnd = mulberry32(101);
    return Array.from({ length: MOTES }, () => ({
      x: (rnd() - 0.5) * 14, y: rnd() * 5, z: -3 + rnd() * 5,
      v: 0.02 + rnd() * 0.05, w: rnd() * 6.28,
    }));
  }, []);
  const positions = useMemo(() => new Float32Array(MOTES * 3), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    seeds.forEach((s, i) => {
      positions[i * 3] = s.x + Math.sin(t * 0.1 + s.w) * 0.6;
      positions[i * 3 + 1] = (s.y + t * s.v) % 5;
      positions[i * 3 + 2] = s.z;
    });
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={MOTES} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#cfe2ff" transparent opacity={0.35} toneMapped={false} />
    </points>
  );
}

export default function Environment({ enraged = false, lite = false }) {
  return (
    <>
      <Backdrop />
      {!lite && <Shafts />}
      <FogBands />
      <Brazier x={-6.4} enraged={enraged} />
      <Brazier x={-1.2} enraged={enraged} />
      {!lite && <Dust />}
    </>
  );
}
```

- [ ] **Step 2: Mount it in `src/raid/ArenaScene.jsx`**

Add the import:

```jsx
import Environment from './Environment';
```

And render it right after `<CameraRig />`:

```jsx
      <Environment enraged={enraged} lite={LITE} />
```

- [ ] **Step 3: Verify in preview**

Expected: layered ruin silhouettes behind the fight that parallax against the slow camera drift, faint blue shafts swaying, two flickering braziers casting warm light on the floor reflection, drifting fog bands, sparse dust. Calm overall — the base state should still read "ambient", not "busy". Enrage (let the mock sprint fall behind, or temporarily hard-code `enraged`) shifts braziers red and doubles ember speed (existing behavior).

- [ ] **Step 4: Full suite + commit**

```bash
git add src/raid/Environment.jsx src/raid/ArenaScene.jsx
git commit -m "feat: arena environment — parallax ruins, shafts, fog, braziers, dust"
```

---

### Task 14: Post chain (bloom, grain, grade, CA pulse)

**Files:**
- Modify: `src/raid/Effects.jsx` (full replacement)

- [ ] **Step 1: Replace `src/raid/Effects.jsx`**

```jsx
// src/raid/Effects.jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  EffectComposer, Bloom, Vignette, Noise, ChromaticAberration, HueSaturation,
} from '@react-three/postprocessing';
import { freezeLeft } from './timeBus';

// enraged: red-shifted grade. tableau 'defeat': desaturated. lite: no post at all.
export default function Effects({ enraged = false, tableau = null, lite = false }) {
  const ca = useRef();
  useFrame(() => {
    // One-beat chromatic pulse riding the hit-stop, decays with it.
    if (ca.current) {
      const k = Math.min(0.004, freezeLeft() * 0.03);
      ca.current.offset.set(k, k * 0.6);
    }
  });
  if (lite) return null;
  return (
    <EffectComposer>
      <Bloom luminanceThreshold={0.35} intensity={1.15} mipmapBlur />
      <Noise opacity={0.045} />
      <HueSaturation saturation={tableau === 'defeat' ? -0.55 : enraged ? 0.12 : 0} />
      <ChromaticAberration ref={ca} offset={[0, 0]} />
      <Vignette darkness={0.5} eskil={false} />
    </EffectComposer>
  );
}
```

- [ ] **Step 2: Verify in preview**

Expected: emissive pixels (boss eyes, molten cracks, embers, slash) bloom; subtle film grain; `hit` chip shows a one-beat chromatic fringe during the hit-stop; `?lite` URL → post chain off, dpr 1, fewer particles, still correct. Check both themes — scene colors come from CSS vars at mount.

- [ ] **Step 3: Full suite + commit**

```bash
git add src/raid/Effects.jsx
git commit -m "feat: full post chain — selective bloom, grain, grade shifts, CA hit pulse"
```

---

## Phase F — finish

### Task 15: Docs, CLAUDE.md, final verification sweep

**Files:**
- Modify: `CLAUDE.md` (the "two views" section + architecture rules)

- [ ] **Step 1: Update `CLAUDE.md`**

Replace the `## The two views` section with:

```markdown
## The two views (header toggle, persisted in `sb-view`)

- **Raid** (default; stored key `raid`, legacy `arena` migrates): the "command
  deck". Top band = per-ticket boss HP bar + scar timeline + enrage timer.
  Middle = HD-2D Three.js battle scene (`src/raid/`) — pure spectacle, no text;
  the damage log floats over it as a translucent combat log. Below = ticket
  dock (`Dock.jsx`): real tickets grouped by board column — first column is a
  key-only queue, working columns are full cards that degrade density instead
  of scrolling (`dockDensity`), blocked is always full cards + reason. Bottom =
  truth ticker. Completing a ticket = the owning fighter attacks (hit-stop,
  sparks, HP drains); scope creep = boss summons minions (cap 6 + horde);
  blocked = fighter downed with beacon; boss cracks at 75/50/25% HP
  (`bossStage`) and crumbles on a cleared sprint; sprint overrun = defeat grade.
  **Afterglow** (`src/raid/heat.js`): events leave residue that cools over
  hours — gold HP segments (~2h), boss scars + debris swords (~24h), ember
  auras, fresher-burns-brighter beacons — all pure functions of
  `view.now − event.ts`, so retro reconstructs them. `?lite` query flag drops
  post-processing/dpr for weak TV hardware.
- **Factory** (legacy): conveyor-belt line (`FactoryLine.jsx`) + boss panel
  (`BossPanel.jsx`).
```

In `## Architecture rules`, update the second bullet to include the new pure modules:

```markdown
- Pure logic lives in `src/raid/raidState.js` (party/minions/actions/dock/stage
  selectors), `src/raid/heat.js` (afterglow decay), and `src/raid/sprites/`
  (14×20 pixel matrices + `ops.js` upscale/outline/rim pipeline + rasterizer) —
  all vitest-tested (`npm test`). R3F components are verified in the browser
  preview.
```

- [ ] **Step 2: Final verification sweep**

1. `npm test` — entire suite green.
2. `npm run mock` + preview:
   - Calm base: scene ambient, dock readable, ticker scrolling truth.
   - `hit` → full impact suite; HP segment gold; sword planted; scar + aura.
   - `heal` → summon cast, glyph, minion, lime HP segment, timeline scar.
   - `block` → fighter down, bright beacon, dock blocked card + reason, ticker entry.
   - Retro: scrub the sprint — afterglow matches each moment; no live pulses.
   - Standup overlay + TicketModal still work; theme toggle; factory view unchanged.
   - `?lite` → post off, still correct.
3. `npm run dev` against the live board — sanity-check with real data (column names, real avatars on heads, dock grouping).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md reflects the raid command deck as default view"
```

**Exit criteria:** all spec sections implemented (layout, state mapping, afterglow, dock behavior, graphics workstreams 1–5, perf flag, testing) — Bogdan's sprite art-direction pass remains an explicitly separate follow-up before any wider rollout.
