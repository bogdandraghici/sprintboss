# Raid Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the conveyor-belt FactoryLine with an HD-2D Three.js battle arena where hand-made pixel sprites of each teammate fight the pixel golem boss, per the approved spec `docs/superpowers/specs/2026-06-10-raid-arena-design.md`.

**Architecture:** A pure selector layer (`raidState.js`) maps the existing `view` snapshot + live pulses to fighters/minions/actions; a zero-pipeline sprite system rasterizes in-code pixel matrices to `THREE.CanvasTexture` sprite sheets; react-three-fiber renders the diorama (reflective floor, fog, embers, bloom, camera shake); existing HUD widgets (HP bar, enrage timer, scar timeline, damage log) are extracted and overlaid, plus new party frames and a truth ticker. Data layer (`useSnapshot`, `timeMachine`, `derive.js`) is untouched.

**Tech Stack:** React 18 (so react-three-fiber **v8**, drei **v9**, @react-three/postprocessing **v2**), three ~0.169, vitest for pure-logic tests. No TypeScript (repo is JSX). Theming continues via CSS variables read with a `cssVar()` helper.

**Build/verify loop:** dev server is `npm run dev` (Vite on 5173, already running via preview tooling). During Tasks 6–10 the arena renders only with the `?raid` URL flag; Task 11 flips the default and deletes the old view. `npm run mock` (MOCK=1) serves synthetic data with events for animation testing.

---

## File structure

```
src/raid/
  raidState.js            pure: deriveParty / deriveMinions / pulseActions  [TESTED]
  shakeBus.js             module-level camera-trauma accumulator
  cssVar.js               read CSS custom property with fallback
  RaidView.jsx            composition: arena + HUD + ticker
  ArenaScene.jsx          R3F Canvas: floor, lights, fog, camera rig, embers, effects
  FighterSprite.jsx       one billboarded teammate, state machine + attack timeline
  BossSprite.jsx          golem sprite: hit flash, summon cast, enrage palette swap
  MinionSprite.jsx        scope-creep minion + horde stack
  FloatNum.jsx            rising/fading damage / heal numbers (drei Text)
  Effects.jsx             EffectComposer: Bloom + Vignette
  sprites/
    rasterize.js          pixel-matrix strings -> RGBA, sheet layout      [TESTED]
    bodies.js             base humanoid frames + compose() overlay merge  [TESTED]
    weapons.js            sword/staff/bow/daggers/hammer overlays + anchors
    boss.js               golem + minion + slash matrices and palettes
    roster.js             per-teammate palette/hair/weapon + framesFor()  [TESTED]
    textures.js           canvas + THREE.CanvasTexture cache (runtime only)
src/components/
  hud.jsx                 EnrageTimer/HpBar/ScarTimeline/DamageLog moved out of BossPanel
  RaidHud.jsx             overlay layout + PartyFrames
  TruthTicker.jsx         per-column stale counts + blocked list strip
src/raid/__tests__/
  raidState.test.js, rasterize.test.js, sprites.test.js
DELETED at the end: FactoryLine.jsx, BossPanel.jsx, BossFigure.jsx (+ their CSS blocks)
```

Sprite-frame contract used everywhere (defined in Task 4, consumed by Tasks 5, 7, 8):

```js
export const FRAME = { IDLE_A: 0, IDLE_B: 1, ATTACK_A: 2, ATTACK_B: 3, KNEEL: 4, DOWN: 5 };
// framesFor(name) -> array of 6 frames (each frame = array of 20 strings, 14 chars wide)
// paletteFor(name) -> { K,S,H,A,B,P,W,L,G } hex map; '.' always transparent
```

**Art note:** matrices below are *drafts* — structurally complete and renderable, but Bogdan art-directs the final look in the preview before ship. Improving art = editing string rows; never change frame dimensions or FRAME order without updating tests.

---

### Task 1: Dependencies + test runner

**Files:**
- Modify: `package.json`
- Create: `src/raid/__tests__/smoke.test.js`

- [ ] **Step 1: Install runtime deps (React-18-compatible majors)**

```bash
npm install three@0.169.0 @react-three/fiber@8.17.10 @react-three/drei@9.114.3 @react-three/postprocessing@2.16.3
```

- [ ] **Step 2: Install vitest**

```bash
npm install -D vitest@2.1.8
```

- [ ] **Step 3: Add test scripts to package.json** (in `"scripts"`)

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write smoke test**

```js
// src/raid/__tests__/smoke.test.js
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs', () => expect(1 + 1).toBe(2));
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: 1 passed. (Vitest picks up vite.config.js automatically; pure-node env is fine — no DOM needed in any test.)

- [ ] **Step 6: Verify the app still boots** — reload http://localhost:5173, no console errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/raid/__tests__/smoke.test.js
git commit -m "chore: add three/R3F stack and vitest"
```

---

### Task 2: raidState — pure Jira→fight selectors

**Files:**
- Create: `src/raid/raidState.js`
- Test: `src/raid/__tests__/raidState.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/raid/__tests__/raidState.test.js
import { describe, it, expect } from 'vitest';
import { deriveParty, deriveMinions, pulseActions, MINION_CAP } from '../raidState';

const aging = { freshDays: 2, warmDays: 5 }; // ageBand: >5d = stale
const mkIssue = (over) => ({
  key: 'MT-1', assignee: 'Ana', assigneeAvatar: null, points: 1,
  done: false, blocked: false, daysInColumn: 1, addedMidSprint: false, ...over,
});
const mkView = (issues, flags = {}) => ({ issues, aging, flags });

describe('deriveParty', () => {
  it('groups issues by assignee and skips unassigned', () => {
    const party = deriveParty(mkView([
      mkIssue({ key: 'A-1' }), mkIssue({ key: 'A-2' }), mkIssue({ key: 'X-1', assignee: null }),
    ]));
    expect(party).toHaveLength(1);
    expect(party[0]).toMatchObject({ name: 'Ana', open: 2, done: 0 });
  });
  it('status=fighting when any open work is moving', () => {
    const [f] = deriveParty(mkView([mkIssue({ daysInColumn: 1 }), mkIssue({ key: 'A-2', daysInColumn: 9 })]));
    expect(f.status).toBe('fighting');
    expect(f.stale).toBe(1);
  });
  it('status=exhausted when ALL open work is stale', () => {
    const [f] = deriveParty(mkView([mkIssue({ daysInColumn: 9 })]));
    expect(f.status).toBe('exhausted');
  });
  it('status=down when any ticket is blocked (beats exhausted)', () => {
    const [f] = deriveParty(mkView([mkIssue({ blocked: true, daysInColumn: 9 })]));
    expect(f.status).toBe('down');
  });
  it('status=resting when everything is done', () => {
    const [f] = deriveParty(mkView([mkIssue({ done: true })]));
    expect(f.status).toBe('resting');
  });
  it('no staleness when changelog is off', () => {
    const [f] = deriveParty(mkView([mkIssue({ daysInColumn: 9 })], { noChangelog: true }));
    expect(f.status).toBe('fighting');
  });
  it('orders by open count desc then name', () => {
    const party = deriveParty(mkView([
      mkIssue({ assignee: 'Zoe' }),
      mkIssue({ key: 'B-1', assignee: 'Bo' }), mkIssue({ key: 'B-2', assignee: 'Bo' }),
    ]));
    expect(party.map((f) => f.name)).toEqual(['Bo', 'Zoe']);
  });
});

describe('deriveMinions', () => {
  it('one minion per open mid-sprint addition, capped with horde overflow', () => {
    const adds = Array.from({ length: MINION_CAP + 3 }, (_, i) =>
      mkIssue({ key: `C-${i}`, addedMidSprint: true }));
    const { minions, horde } = deriveMinions(mkView([...adds, mkIssue({ key: 'D-1', addedMidSprint: true, done: true })]));
    expect(minions).toHaveLength(MINION_CAP);
    expect(horde).toBe(3); // the done one never counts
  });
});

describe('pulseActions', () => {
  const party = [{ name: 'Ana' }, { name: 'Bo' }];
  it('routes done pulses to the actor fighter', () => {
    const [a] = pulseActions([{ id: 'p1', type: 'done', actor: 'Bo', points: 3 }], party);
    expect(a).toMatchObject({ kind: 'attack', fighter: 1, points: 3 });
  });
  it('unknown actor still lands a hit (fighter -1)', () => {
    const [a] = pulseActions([{ id: 'p2', type: 'done', actor: 'Ghost' }], party);
    expect(a).toMatchObject({ kind: 'attack', fighter: -1, points: 1 });
  });
  it('scope-added becomes a summon', () => {
    const [a] = pulseActions([{ id: 'p3', type: 'scope-added', points: 2 }], party);
    expect(a).toMatchObject({ kind: 'summon', points: 2 });
  });
  it('ignores other event types', () => {
    expect(pulseActions([{ id: 'p4', type: 'blocked' }], party)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `../raidState`.

- [ ] **Step 3: Implement**

```js
// src/raid/raidState.js
import { ageBand } from '../lib';

// One fighter per assignee with issues in the sprint.
// Status priority: down (any blocked) > exhausted (open work, all stale)
// > fighting (open work) > resting (all done).
export function deriveParty(view) {
  const agingOn = !view.flags?.noChangelog;
  const byName = new Map();
  for (const issue of view.issues) {
    const name = issue.assignee;
    if (!name) continue;
    const f = byName.get(name) || {
      name, avatar: issue.assigneeAvatar || null,
      open: 0, done: 0, stale: 0, blocked: 0, issues: [],
    };
    f.issues.push(issue);
    if (!f.avatar && issue.assigneeAvatar) f.avatar = issue.assigneeAvatar;
    if (issue.done) f.done += 1;
    else {
      f.open += 1;
      if (issue.blocked) f.blocked += 1;
      else if (agingOn && ageBand(issue.daysInColumn, view.aging) === 'stale') f.stale += 1;
    }
    byName.set(name, f);
  }
  const party = [...byName.values()].map((f) => ({
    ...f,
    status:
      f.blocked > 0 ? 'down'
      : f.open === 0 ? 'resting'
      : f.stale === f.open ? 'exhausted'
      : 'fighting',
  }));
  // Stable order so the battle row doesn't reshuffle every poll.
  party.sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
  return party;
}

export const MINION_CAP = 6;

// Open mid-sprint additions stand beside the boss; overflow clusters as a horde.
export function deriveMinions(view) {
  const adds = view.issues.filter((i) => i.addedMidSprint && !i.done);
  return { minions: adds.slice(0, MINION_CAP), horde: Math.max(0, adds.length - MINION_CAP) };
}

// Live pulses -> scene actions. Fighter index -1 = hit lands with no visible attacker.
export function pulseActions(pulses, party) {
  const actions = [];
  for (const p of pulses) {
    if (p.type === 'done') {
      actions.push({
        id: p.id, kind: 'attack',
        fighter: party.findIndex((f) => f.name === p.actor),
        points: p.points || 1,
      });
    } else if (p.type === 'scope-added') {
      actions.push({ id: p.id, kind: 'summon', points: p.points || 1 });
    }
  }
  return actions;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all raidState tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/raid/raidState.js src/raid/__tests__/raidState.test.js
git commit -m "feat: raidState selectors map sprint view to party/minions/actions"
```

---

### Task 3: rasterize — pixel matrices to RGBA sheets

**Files:**
- Create: `src/raid/sprites/rasterize.js`
- Test: `src/raid/__tests__/rasterize.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/raid/__tests__/rasterize.test.js
import { describe, it, expect } from 'vitest';
import { rasterize, buildSheet } from '../sprites/rasterize';

const palette = { X: '#ff0000', O: '#00ff00' };

describe('rasterize', () => {
  it('maps chars to RGBA and "." to transparent', () => {
    const { width, height, data } = rasterize(['X.', '.O'], palette);
    expect([width, height]).toEqual([2, 2]);
    expect([...data.slice(0, 4)]).toEqual([255, 0, 0, 255]); // X
    expect(data[7]).toBe(0);                                  // '.' alpha
    expect([...data.slice(12, 16)]).toEqual([0, 255, 0, 255]); // O
  });
  it('throws on ragged rows and unknown chars', () => {
    expect(() => rasterize(['XX', 'X'], palette)).toThrow(/width/);
    expect(() => rasterize(['Z'], palette)).toThrow(/palette/);
  });
});

describe('buildSheet', () => {
  it('lays frames out horizontally', () => {
    const sheet = buildSheet([['X'], ['O']], palette);
    expect(sheet).toMatchObject({ width: 2, height: 1, frameWidth: 1, frames: 2 });
    expect([...sheet.data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...sheet.data.slice(4, 8)]).toEqual([0, 255, 0, 255]);
  });
  it('rejects mismatched frame sizes', () => {
    expect(() => buildSheet([['X'], ['OO']], palette)).toThrow(/mismatch/);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test`, FAIL on missing module.

- [ ] **Step 3: Implement**

```js
// src/raid/sprites/rasterize.js
// A frame is an array of equal-length strings; each char indexes the palette.
// '.' is always transparent. Returns plain typed arrays so this stays testable in node.

export function rasterize(frame, palette) {
  const h = frame.length;
  const w = frame[0].length;
  const data = new Uint8ClampedArray(w * h * 4);
  frame.forEach((row, y) => {
    if (row.length !== w) throw new Error(`row ${y} width ${row.length} != ${w}`);
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const hex = palette[ch];
      if (!hex) throw new Error(`no palette entry for '${ch}'`);
      const i = (y * w + x) * 4;
      data[i] = parseInt(hex.slice(1, 3), 16);
      data[i + 1] = parseInt(hex.slice(3, 5), 16);
      data[i + 2] = parseInt(hex.slice(5, 7), 16);
      data[i + 3] = 255;
    });
  });
  return { width: w, height: h, data };
}

export function buildSheet(frames, palette) {
  const rasters = frames.map((f) => rasterize(f, palette));
  const fw = rasters[0].width;
  const fh = rasters[0].height;
  const data = new Uint8ClampedArray(fw * frames.length * fh * 4);
  rasters.forEach((r, fi) => {
    if (r.width !== fw || r.height !== fh) throw new Error(`frame ${fi} size mismatch`);
    for (let y = 0; y < fh; y++) {
      const src = y * fw * 4;
      data.set(r.data.subarray(src, src + fw * 4), (y * fw * frames.length + fi * fw) * 4);
    }
  });
  return { width: fw * frames.length, height: fh, frameWidth: fw, frames: frames.length, data };
}
```

- [ ] **Step 4: Run tests** — `npm test`, all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/raid/sprites/rasterize.js src/raid/__tests__/rasterize.test.js
git commit -m "feat: rasterize pixel matrices into RGBA sprite sheets"
```

---

### Task 4: Sprite data — bodies, weapons, boss, roster

This is data-heavy but mechanical. **Draft art** — renderable and structurally final; rows get polished later in preview with Bogdan.

**Files:**
- Create: `src/raid/sprites/bodies.js`
- Create: `src/raid/sprites/weapons.js`
- Create: `src/raid/sprites/boss.js`
- Create: `src/raid/sprites/roster.js`
- Test: `src/raid/__tests__/sprites.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/raid/__tests__/sprites.test.js
import { describe, it, expect } from 'vitest';
import { compose, BODY_FRAMES } from '../sprites/bodies';
import { framesFor, paletteFor, ROSTER, FRAME } from '../sprites/roster';
import { BOSS_FRAMES, BOSS_PALETTE, MINION_FRAMES, SLASH } from '../sprites/boss';
import { rasterize } from '../sprites/rasterize';

describe('compose', () => {
  it('overlays non-transparent chars at an offset, clipping out-of-bounds', () => {
    const out = compose(['....', '....'], ['HH', 'HH'], 3, 0);
    expect(out).toEqual(['...H', '...H']); // right column clipped
  });
});

describe('body + roster frames', () => {
  it('every roster member yields 6 equal-sized renderable frames', () => {
    for (const name of [...Object.keys(ROSTER), 'Unknown Person']) {
      const frames = framesFor(name);
      expect(frames).toHaveLength(6);
      for (const f of frames) {
        expect(f).toHaveLength(BODY_FRAMES[FRAME.IDLE_A].length);
        expect(() => rasterize(f, paletteFor(name))).not.toThrow();
      }
    }
  });
  it('unknown names fall back to the recruit look', () => {
    expect(paletteFor('Unknown Person')).toEqual(paletteFor('__recruit__'));
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

- [ ] **Step 2: Run to verify failure** — `npm test`, FAIL on missing modules.

- [ ] **Step 3: Implement bodies.js** — base humanoid, 14 wide × 20 tall, 6 frames. Palette keys: `K` outline, `S` skin, `H` hair, `A` armor, `B` armor-dark, `P` legs, `G` chest light.

```js
// src/raid/sprites/bodies.js
// Base humanoid, 14x20. Frame order must match FRAME in roster.js.
// Drafts: art-directed in preview later. Keep dimensions stable.

export function compose(base, overlay, ox, oy) {
  const rows = base.map((r) => [...r]);
  overlay.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const ty = y + oy;
      const tx = x + ox;
      if (ty < 0 || ty >= rows.length || tx < 0 || tx >= rows[0].length) return;
      rows[ty][tx] = ch;
    });
  });
  return rows.map((r) => r.join(''));
}

const IDLE_A = [
  '....KKKK......',
  '...KHHHHK.....',
  '..KHHHHHHK....',
  '..KHSSSSHK....',
  '..KSSKSSSK....',
  '...KSSSSK.....',
  '....KSSK......',
  '...KAAAAK.....',
  '..KAAAAAAK....',
  '.KAAGAAAAAK...',
  '.KBAAAAAABK...',
  'KSKAAAAAAKSK..',
  '.K.KBBBBK.K...',
  '...KBBBBK.....',
  '...KPPPPK.....',
  '...KPKKPK.....',
  '..KPP..PPK....',
  '..KP....PK....',
  '.KKK....KKK...',
  '.KK......KK...',
];

// Breathing: chest light pulses, shoulders settle 1px.
const IDLE_B = IDLE_A.map((row, y) =>
  y === 9 ? '.KAAAAAAAAK...' : y === 10 ? '.KBAGAAAABK...' : row
);

// Wind-up: weapon arm raised behind the head (weapon overlay anchors there).
const ATTACK_A = [
  '....KKKK..KS..',
  '...KHHHHK.KK..',
  '..KHHHHHHK....',
  '..KHSSSSHK....',
  '..KSSKSSSK....',
  '...KSSSSK.....',
  '....KSSK......',
  '...KAAAAKK....',
  '..KAAAAAAK....',
  '.KAAGAAAAK....',
  '.KBAAAAAABK...',
  'KSKAAAAAAK....',
  '.K.KBBBBK.....',
  '...KBBBBK.....',
  '...KPPPPK.....',
  '...KPKKPK.....',
  '..KPP..PPK....',
  '..KP....PK....',
  '.KKK....KKK...',
  '.KK......KK...',
];

// Strike: lunging right, arm fully extended.
const ATTACK_B = [
  '..KKKK........',
  '.KHHHHK.......',
  'KHHHHHHK......',
  'KHSSSSHK......',
  'KSSKSSSK......',
  '.KSSSSK.......',
  '..KSSK........',
  '.KAAAAK.......',
  'KAAAAAAKKKSK..',
  'KAGAAAAAAKSK..',
  'KBAAAAAABK....',
  'KSKAAAAAK.....',
  '.K.KBBBK......',
  '..KBBBBK......',
  '..KPPPPKK.....',
  '..KPKKPPPK....',
  '.KPP...KPPK...',
  '.KP......KPK..',
  'KKK........KK.',
  'KK............',
];

// Exhausted: on one knee, head bowed.
const KNEEL = [
  '..............',
  '..............',
  '..............',
  '....KKKK......',
  '...KHHHHK.....',
  '..KHHHHHHK....',
  '..KHSSSSHK....',
  '..KSSKSSSK....',
  '...KSSSSK.....',
  '...KAAAAK.....',
  '..KAAAAAAK....',
  '.KAAGAAAAAK...',
  '.KSAAAAAAASK..',
  '..KBBBBBBK....',
  '...KPPPPK.....',
  '..KPPKKPPK....',
  '..KPK..KPPK...',
  '.KPK....KPK...',
  '.KKK...KKKK...',
  '..............',
];

// Knocked down: flat on the ground.
const DOWN = [
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '...KKKK.......',
  '..KHHHHKKKKKK.',
  '.KHSSSHAAAAPPK',
  '.KSSKSHAAAAPPK',
  '..KKKKKKKKKKK.',
  '..............',
];

export const BODY_FRAMES = [IDLE_A, IDLE_B, ATTACK_A, ATTACK_B, KNEEL, DOWN];
```

- [ ] **Step 4: Implement weapons.js** — overlays use palette keys `W` (handle/wood) and `L` (blade/glow). Each weapon: one overlay per body frame, with anchor `[x, y]`. `null` = weapon hidden that frame (kneel/down keep hands empty).

```js
// src/raid/sprites/weapons.js
// One overlay (grid + anchor) per FRAME index; null hides the weapon.
// Anchors place the overlay's top-left within the 14x20 body grid.

const SWORD = [
  { at: [11, 5], grid: ['..L', '..L', '..L', '..L', '.WW'] },            // IDLE_A: at side
  { at: [11, 5], grid: ['..L', '..L', '..L', '..L', '.WW'] },            // IDLE_B
  { at: [10, 0], grid: ['L...', 'L...', 'L...', 'WW..'] },               // ATTACK_A: raised behind
  { at: [9, 8], grid: ['..WLLLL', '..W....'] },                          // ATTACK_B: thrust forward
  null,
  null,
];

const STAFF = [
  { at: [11, 3], grid: ['.L.', 'LWL', '.W.', '.W.', '.W.', '.W.', '.W.'] },
  { at: [11, 3], grid: ['.L.', 'LWL', '.W.', '.W.', '.W.', '.W.', '.W.'] },
  { at: [10, 0], grid: ['.LL.', 'LWWL', '.W..', '.W..'] },
  { at: [9, 7], grid: ['...LLL.', 'WWWWLLL', '...LLL.'] },
  null,
  null,
];

const BOW = [
  { at: [11, 4], grid: ['L..', '.W.', '.W.', '.W.', 'L..'] },
  { at: [11, 4], grid: ['L..', '.W.', '.W.', '.W.', 'L..'] },
  { at: [10, 2], grid: ['L...', '.W..', '.WLL', '.W..', 'L...'] },
  { at: [9, 8], grid: ['L......', '.WLLLLL', 'L......'] },
  null,
  null,
];

const DAGGERS = [
  { at: [11, 7], grid: ['.L', '.L', 'WW'] },
  { at: [11, 7], grid: ['.L', '.L', 'WW'] },
  { at: [10, 1], grid: ['L..', 'L..', 'WW.'] },
  { at: [9, 8], grid: ['..WLL..', '..WLL..'] },
  null,
  null,
];

const HAMMER = [
  { at: [10, 5], grid: ['.LL', '.LL', '..W', '..W', '..W'] },
  { at: [10, 5], grid: ['.LL', '.LL', '..W', '..W', '..W'] },
  { at: [9, 0], grid: ['LLL..', 'LLL..', '..W..', '..W..'] },
  { at: [9, 7], grid: ['...WLLL', '...WLLL', '.......'] },
  null,
  null,
];

export const WEAPONS = { sword: SWORD, staff: STAFF, bow: BOW, daggers: DAGGERS, hammer: HAMMER };
```

- [ ] **Step 5: Implement boss.js** — golem 28 wide × 26 tall, 3 matrices (`IDLE_A`, `IDLE_B`, `CAST`); enrage is a palette swap, hit flash is a material tint (both code, Task 8). Keys: `K` outline, `M` steel, `D` steel-dark, `E` eye, `G` gauge, `C` gauge-needle. Plus minion (10×8 ×2) and slash effect (10×10).

```js
// src/raid/sprites/boss.js
// The factory golem, pixel edition. 28x26, 3 frames: idle A/B (breathing), cast (summon).
// Enrage = palette swap in textures (E and G go red); hit flash = material tint.

export const BOSS_PALETTE = {
  K: '#0d1016', M: '#5b6b7d', D: '#3a4654', E: '#ff5d5d',
  G: '#7fe7ff', C: '#e8eef4', W: '#6b5b4a', L: '#bfefff',
};

const B_IDLE_A = [
  '....KKK..............KKK...',
  '...KDDDK............KDDDK..',
  '...KDDDK............KDDDK..',
  '....KMK..............KMK...',
  '..KKKMMKKKKKKKKKKKKKKMMKKK.',
  '.KMMMMMMMMMMMMMMMMMMMMMMMK.',
  '.KMEEMMMMMMMMMMMMMMMMEEMMK.',
  '.KMEEMMMMMMMMMMMMMMMMEEMMK.',
  '.KMMMMMMMDDDDDDDDMMMMMMMMK.',
  '.KMMMMMMDKKKKKKKKDMMMMMMMK.',
  '..KKMMMMMMMMMMMMMMMMMMKK...',
  '...KMMMMMMMMMMMMMMMMMMK....',
  '..KMMMMMMDDDDDDDDMMMMMMK...',
  '..KMMMMMDGGGGGGGGDMMMMMK...',
  '.KMMMMMMDGGCCGGGGDMMMMMMK..',
  '.KDMMMMMDGGGCCGGGDMMMMMDK..',
  '.KDMMMMMDGGGGGGGGDMMMMMDK..',
  '.KMMMMMMMDDDDDDDDMMMMMMMK..',
  '..KMMMMMMMMMMMMMMMMMMMMK...',
  '..KMMMMKKMMMMMMMMKKMMMMK...',
  '...KKKK..KMMMMMMK..KKKK....',
  '.........KMMMMMMK..........',
  '........KDDDKKDDDK.........',
  '........KDDDKKDDDK.........',
  '.......KKDDDKKDDDKK........',
  '.......KKKKKKKKKKKK........',
];

// Breathing: stacks puff, body lifts a hair (eyes drop one row).
const B_IDLE_B = B_IDLE_A.map((row, y) => {
  if (y === 6) return '.KMMMMMMMMMMMMMMMMMMMMMMMK.';
  if (y === 7) return '.KMEEMMMMMMMMMMMMMMMMEEMMK.';
  return row;
});

// Summon cast: arms raised high, gauge flares.
const B_CAST = B_IDLE_A.map((row, y) => {
  if (y === 4) return 'KMKKKMMKKKKKKKKKKKKKKMMKKKMK';
  if (y === 5) return 'KMKMMMMMMMMMMMMMMMMMMMMMKMK.'.slice(0, 28);
  if (y === 13) return '..KMMMMMDGLLLLLLGDMMMMMK...';
  if (y === 19) return '..KMMMMMMMMMMMMMMMMMMMMK...';
  if (y === 20) return '...KKKKKKMMMMMMKKKKKKK.....';
  return row;
});

export const BOSS_FRAMES = [B_IDLE_A, B_IDLE_B, B_CAST];
export const BOSS_FRAME = { IDLE_A: 0, IDLE_B: 1, CAST: 2 };

// Scope-creep minion: a grumpy little slag-blob. 10x8, 2 frames.
const M_A = [
  '..KKKKKK..',
  '.KMMMMMMK.',
  'KMEMMMMEMK',
  'KMMMMMMMMK',
  'KMMDDDDMMK',
  'KMMMMMMMMK',
  '.KMMMMMMK.',
  '..KKKKKK..',
];
const M_B = [
  '..........',
  '..KKKKKK..',
  '.KMMMMMMK.',
  'KMEMMMMEMK',
  'KMMMMMMMMK',
  'KMMDDDDMMK',
  '.KMMMMMMK.',
  '..KKKKKK..',
];
export const MINION_FRAMES = [M_A, M_B];

// Slash arc shown at the impact point (rotated/faded in code).
export const SLASH = [
  '......LL..',
  '....LLLL..',
  '...LLL....',
  '..LLL.....',
  '..LL......',
  '..LL......',
  '..LLL.....',
  '...LLL....',
  '....LLLL..',
  '......LL..',
];
```

- [ ] **Step 6: Implement roster.js** — the hand-made part: per-teammate palette, hair overlay, weapon. Names must match Jira display names exactly.

```js
// src/raid/sprites/roster.js
// Hand-made look per teammate: palette + hair overlay + weapon.
// Names must match Jira display names. '__recruit__' is the unknown-assignee fallback.
import { BODY_FRAMES, compose } from './bodies';
import { WEAPONS } from './weapons';

export const FRAME = { IDLE_A: 0, IDLE_B: 1, ATTACK_A: 2, ATTACK_B: 3, KNEEL: 4, DOWN: 5 };

const BASE_PALETTE = {
  K: '#0d1016', S: '#c9935f', H: '#3a2f26', A: '#46566b',
  B: '#2a3340', P: '#232a35', W: '#6b5b4a', L: '#bfefff', G: '#7fe7ff',
};

// Hair overlays sit at [2, 0] over the head rows (drafts — art-directed later).
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

export function framesFor(name) {
  const p = personOf(name);
  return BODY_FRAMES.map((body, fi) => {
    let frame = compose(body, HAIR[p.hair], 4, 0);
    const w = WEAPONS[p.weapon][fi];
    if (w) frame = compose(frame, w.grid, w.at[0], w.at[1]);
    return frame;
  });
}
```

- [ ] **Step 7: Run tests** — `npm test`. Expected: all sprite tests PASS. If a compose/anchor clips badly, the renderable-frames test still passes (clipping is legal); eyeballing happens in Task 7's preview step.

- [ ] **Step 8: Commit**

```bash
git add src/raid/sprites/bodies.js src/raid/sprites/weapons.js src/raid/sprites/boss.js src/raid/sprites/roster.js src/raid/__tests__/sprites.test.js
git commit -m "feat: draft pixel sprite data — bodies, weapons, golem boss, roster"
```

---

### Task 5: textures.js + cssVar + shakeBus (runtime glue, no tests)

**Files:**
- Create: `src/raid/sprites/textures.js`
- Create: `src/raid/cssVar.js`
- Create: `src/raid/shakeBus.js`

- [ ] **Step 1: textures.js**

```js
// src/raid/sprites/textures.js
import * as THREE from 'three';
import { buildSheet } from './rasterize';

const cache = new Map();

// key must uniquely identify (frames, palette) — include theme/enrage variants in it.
export function sheetTexture(key, frames, palette) {
  if (cache.has(key)) return cache.get(key);
  const sheet = buildSheet(frames, palette);
  const canvas = document.createElement('canvas');
  canvas.width = sheet.width;
  canvas.height = sheet.height;
  canvas.getContext('2d').putImageData(new ImageData(sheet.data, sheet.width, sheet.height), 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1 / sheet.frames, 1);
  const entry = { tex, frames: sheet.frames, frameWidth: sheet.frameWidth, frameHeight: sheet.height };
  cache.set(key, entry);
  return entry;
}

export const setFrame = (entry, frame) => { entry.tex.offset.x = frame / entry.frames; };
```

Note: one texture entry per *mounted sprite* would share UV offsets across users of the same key. That's wrong for fighters with the same look — so the cache key includes the fighter's name (`fighter:${name}`), and names are unique per party. Boss/minions get distinct keys per instance (`minion:${issue.key}`).

- [ ] **Step 2: cssVar.js**

```js
// src/raid/cssVar.js
export const cssVar = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
```

- [ ] **Step 3: shakeBus.js**

```js
// src/raid/shakeBus.js
// Module-level "trauma" accumulator: writers add, the camera rig drains per-frame.
let trauma = 0;
export const addShake = (amt) => { trauma = Math.min(1, trauma + amt); };
export const drainShake = (dt) => {
  const t = trauma;
  trauma = Math.max(0, trauma - dt * 1.4);
  return t * t; // squared: small hits whisper, big hits thump
};
```

- [ ] **Step 4: Commit**

```bash
git add src/raid/sprites/textures.js src/raid/cssVar.js src/raid/shakeBus.js
git commit -m "feat: runtime texture cache, cssVar helper, camera shake bus"
```

---

### Task 6: ArenaScene scaffold behind ?raid flag

**Files:**
- Create: `src/raid/ArenaScene.jsx`
- Create: `src/raid/RaidView.jsx` (minimal for now)
- Modify: `src/App.jsx` (temporary flag)
- Modify: `src/index.css` (raidview/arena layout classes)

- [ ] **Step 1: ArenaScene with floor, lights, fog, camera rig**

```jsx
// src/raid/ArenaScene.jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { cssVar } from './cssVar';
import { drainShake } from './shakeBus';

function CameraRig({ enraged }) {
  const { camera } = useThree();
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const shake = drainShake(dt);
    camera.position.x = Math.sin(t * 0.07) * 0.55 + (Math.random() - 0.5) * shake * 0.5;
    camera.position.y = 2.1 + Math.sin(t * 0.11) * 0.12 + (Math.random() - 0.5) * shake * 0.35;
    camera.position.z = 8.6;
    camera.lookAt(0, 1.5, 0);
  });
  return null;
}

function Floor() {
  const color = useMemo(() => cssVar('--panel', '#11151c'), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 24]} />
      <MeshReflectorMaterial
        blur={[300, 80]} resolution={512} mixBlur={0.9} mixStrength={6}
        roughness={0.85} depthScale={1.1} color={color} metalness={0.25}
      />
    </mesh>
  );
}

export default function ArenaScene({ view, party = [], minions = [], horde = 0, actions = [] }) {
  const enraged = view.stats.enraged;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 35, position: [0, 2.1, 8.6] }}
      gl={{ antialias: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[cssVar('--bg', '#0b0d11')]} />
      <fog attach="fog" args={[cssVar('--bg', '#0b0d11'), 9, 22]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[-4, 5, 4]} intensity={60} color="#7fe7ff" />
      <pointLight position={[4.5, 4, 2]} intensity={enraged ? 110 : 50} color={enraged ? '#ff5d5d' : '#ff9d5c'} />
      <CameraRig enraged={enraged} />
      <Floor />
      {/* fighters, boss, minions, effects arrive in Tasks 7-9 */}
    </Canvas>
  );
}
```

- [ ] **Step 2: Minimal RaidView**

```jsx
// src/raid/RaidView.jsx
import { useMemo } from 'react';
import ArenaScene from './ArenaScene';
import { deriveParty, deriveMinions, pulseActions } from './raidState';

export default function RaidView({ view, pulses, onSelect }) {
  const party = useMemo(() => deriveParty(view), [view]);
  const { minions, horde } = useMemo(() => deriveMinions(view), [view]);
  const actions = pulseActions(pulses, party);
  return (
    <section className="raidview">
      <div className="arena">
        <ArenaScene view={view} party={party} minions={minions} horde={horde} actions={actions} />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Temporary flag in App.jsx** — replace the `<main>` block:

```jsx
const RAID = new URLSearchParams(window.location.search).has('raid'); // module scope, top of file
```

```jsx
<main className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: RAID ? '1fr' : '3fr 2fr' }}>
  {RAID ? (
    <RaidView view={view} pulses={mode === 'retro' ? [] : pulses} onSelect={setSelected} />
  ) : (
    <>
      <FactoryLine view={view} onSelect={setSelected} />
      <BossPanel view={view} pulses={mode === 'retro' ? [] : pulses} onSelect={setSelected} />
    </>
  )}
</main>
```

with `import RaidView from './raid/RaidView';` added.

- [ ] **Step 4: Layout CSS** — append to `src/index.css`:

```css
/* ── raid arena ─────────────────────────────────────────────── */
.raidview { display: flex; flex-direction: column; min-height: 0; gap: 0.6rem; }
.arena { position: relative; flex: 1; min-height: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--bg); }
```

(If `--line`/`--panel`/`--bg` names differ in `index.css`, use the actual token names — check the `:root` block.)

- [ ] **Step 5: Verify in preview** — open `http://localhost:5173/?raid`. Expected: dark arena, reflective floor catching two light pools, gentle camera drift, no console errors. Then open without the flag: old view intact.

- [ ] **Step 6: Commit**

```bash
git add src/raid/ArenaScene.jsx src/raid/RaidView.jsx src/App.jsx src/index.css
git commit -m "feat: arena scaffold (floor, lights, camera rig) behind ?raid flag"
```

---

### Task 7: FighterSprite + party row

**Files:**
- Create: `src/raid/FighterSprite.jsx`
- Modify: `src/raid/ArenaScene.jsx` (render party)

- [ ] **Step 1: FighterSprite**

```jsx
// src/raid/FighterSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sheetTexture, setFrame } from './sprites/textures';
import { framesFor, paletteFor, FRAME } from './sprites/roster';

const PX = 0.1; // world units per sprite pixel -> 14x20 body ≈ 1.4 x 2.0

// attack: latest {id, points} action for this fighter (or null).
// onStrike(points, worldX): fired once per attack at the moment of impact.
export default function FighterSprite({ fighter, attack, onStrike, position, phase = 0 }) {
  const entry = useMemo(
    () => sheetTexture(`fighter:${fighter.name}`, framesFor(fighter.name), paletteFor(fighter.name)),
    [fighter.name]
  );
  const group = useRef();
  const mat = useRef();
  const anim = useRef({ id: null, t: 0, struck: false });

  useFrame((state, dt) => {
    const a = anim.current;
    if (attack && attack.id !== a.id) { a.id = attack.id; a.t = 0; a.struck = false; }
    const attacking = a.id !== null && a.t < 0.7 && fighter.status !== 'down';
    let frame;
    let lunge = 0;
    if (attacking) {
      a.t += dt;
      frame = a.t < 0.28 ? FRAME.ATTACK_A : FRAME.ATTACK_B;
      lunge = a.t < 0.28 ? -0.15 : 0.5;
      if (a.t >= 0.28 && !a.struck) {
        a.struck = true;
        onStrike?.(attack.points, position[0] + 1.2);
      }
    } else {
      frame =
        fighter.status === 'down' ? FRAME.DOWN
        : fighter.status === 'exhausted' ? FRAME.KNEEL
        : Math.floor(state.clock.elapsedTime / 0.8 + phase) % 2 ? FRAME.IDLE_B : FRAME.IDLE_A;
    }
    setFrame(entry, frame);
    group.current.position.x = position[0] + lunge;
    // Dim the weary; beacon handled below.
    const dim = fighter.status === 'exhausted' ? 0.55 : fighter.status === 'resting' ? 0.8 : 1;
    mat.current.color.setScalar(dim);
  });

  return (
    <group ref={group} position={position}>
      <mesh position={[0, PX * 10, 0]}>
        <planeGeometry args={[14 * PX, 20 * PX]} />
        <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      {fighter.status === 'down' && <Beacon />}
    </group>
  );
}

// Blinking red distress light over a downed fighter.
function Beacon() {
  const m = useRef();
  useFrame((state) => {
    m.current.material.opacity = 0.35 + 0.65 * Math.abs(Math.sin(state.clock.elapsedTime * 3));
  });
  return (
    <mesh ref={m} position={[0, 2.5, 0]}>
      <sphereGeometry args={[0.09, 8, 8]} />
      <meshBasicMaterial color="#ff5d5d" transparent toneMapped={false} />
    </mesh>
  );
}
```

- [ ] **Step 2: Render the party in ArenaScene** — add inside `<Canvas>` (after `<Floor />`):

```jsx
{party.map((f, i) => (
  <FighterSprite
    key={f.name}
    fighter={f}
    phase={i * 0.7}
    attack={actions.find((a) => a.kind === 'attack' && a.fighter === i) || null}
    onStrike={onStrike}
    position={[-5.6 + (i % 5) * 1.25, 0, i % 2 ? -0.7 : 0.2]}
  />
))}
```

with `import FighterSprite from './FighterSprite';` and a new prop `onStrike` threaded through `ArenaScene({ ..., onStrike })` (RaidView passes a no-op for now: `onStrike={() => {}}`). Two staggered ranks of ≤5 handle up to 10 fighters; row position is stable because `deriveParty` sorts deterministically.

- [ ] **Step 3: Verify in preview** — `http://localhost:5173/?raid`: pixel teammates in two ranks, breathing idle alternation, any blocked person lying down under a blinking beacon, exhausted ones kneeling dim. Screenshot for art direction notes (expected: drafts look rough — collect feedback, don't block).

- [ ] **Step 4: Commit**

```bash
git add src/raid/FighterSprite.jsx src/raid/ArenaScene.jsx src/raid/RaidView.jsx
git commit -m "feat: fighter sprites with status poses and attack timeline"
```

---

### Task 8: BossSprite, minions, damage numbers

**Files:**
- Create: `src/raid/BossSprite.jsx`
- Create: `src/raid/MinionSprite.jsx`
- Create: `src/raid/FloatNum.jsx`
- Modify: `src/raid/ArenaScene.jsx`

- [ ] **Step 1: BossSprite**

```jsx
// src/raid/BossSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { BOSS_FRAMES, BOSS_FRAME, BOSS_PALETTE } from './sprites/boss';

const PX = 0.16; // 28x26 -> ≈ 4.5 x 4.2 world units

// hit: {id} latest landed strike; summon: {id} latest scope-add.
export default function BossSprite({ enraged, hit, summon }) {
  const palette = useMemo(
    () => (enraged ? { ...BOSS_PALETTE, E: '#ff2222', G: '#ff5d5d', C: '#ffd479' } : BOSS_PALETTE),
    [enraged]
  );
  const entry = useMemo(
    () => sheetTexture(`boss:${enraged ? 'enraged' : 'calm'}`, BOSS_FRAMES, palette),
    [palette, enraged]
  );
  const mat = useRef();
  const mesh = useRef();
  const fx = useRef({ hitId: null, flash: 0, summonId: null, cast: 0 });

  useFrame((state, dt) => {
    const f = fx.current;
    if (hit && hit.id !== f.hitId) { f.hitId = hit.id; f.flash = 1; }
    if (summon && summon.id !== f.summonId) { f.summonId = summon.id; f.cast = 0.9; }
    f.flash = Math.max(0, f.flash - dt * 3.5);
    f.cast = Math.max(0, f.cast - dt);
    const breathing = Math.floor(state.clock.elapsedTime / 1.1) % 2;
    setFrame(entry, f.cast > 0 ? BOSS_FRAME.CAST : breathing ? BOSS_FRAME.IDLE_B : BOSS_FRAME.IDLE_A);
    // White flash on hit; green wash while casting a summon.
    const w = 1 + f.flash * 3;
    mat.current.color.setRGB(w, w + (f.cast > 0 ? 1.2 : 0), w);
    mesh.current.position.x = 4.6 + (f.flash > 0 ? (Math.random() - 0.5) * 0.12 : 0);
  });

  return (
    <mesh ref={mesh} position={[4.6, PX * 13, -0.4]}>
      <planeGeometry args={[28 * PX, 26 * PX]} />
      <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
    </mesh>
  );
}
```

- [ ] **Step 2: MinionSprite**

```jsx
// src/raid/MinionSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { sheetTexture, setFrame } from './sprites/textures';
import { MINION_FRAMES, BOSS_PALETTE } from './sprites/boss';

const PX = 0.09;

export default function MinionSprite({ issue, index, horde = 0 }) {
  const entry = useMemo(
    () => sheetTexture(`minion:${issue.key}`, MINION_FRAMES, BOSS_PALETTE),
    [issue.key]
  );
  const mesh = useRef();
  const born = useRef(null);
  useFrame((state, dt) => {
    if (born.current == null) born.current = state.clock.elapsedTime;
    const age = state.clock.elapsedTime - born.current;
    const pop = Math.min(1, age * 3); // spawn bounce
    mesh.current.scale.setScalar(pop * (1 + Math.sin(age * 3 + index) * 0.04));
    setFrame(entry, Math.floor(state.clock.elapsedTime / 0.5 + index) % 2);
  });
  const x = 2.6 + (index % 3) * 0.75;
  const z = 0.6 + Math.floor(index / 3) * 0.7;
  return (
    <group position={[x, 0.36, z]}>
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

(`horde` is passed only on the last minion. Minions disappear when their issue completes because `deriveMinions` filters `!done` — React unmounts them; no death animation in v1.)

- [ ] **Step 3: FloatNum**

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
    ref.current.position.y = item.y + t.current * 1.1;
    ref.current.fillOpacity = Math.max(0, 1 - t.current / 1.3);
  });
  return (
    <Text ref={ref} position={[item.x, item.y, 1.2]} fontSize={0.42} color={item.color}
      font={undefined} anchorX="center" outlineWidth={0.02} outlineColor="#0d1016">
      {item.text}
    </Text>
  );
}
```

- [ ] **Step 4: Wire into ArenaScene** — add state + handlers in `ArenaScene` (it becomes the owner of floating numbers; `onStrike` moves here from RaidView):

```jsx
// inside ArenaScene component body, before return:
const [floats, setFloats] = useState([]);
const nextFloat = useRef(0);
const addFloat = (text, color, x, y) =>
  setFloats((fs) => [...fs, { id: nextFloat.current++, text, color, x, y }]);
const removeFloat = (id) => setFloats((fs) => fs.filter((f) => f.id !== id));

const hit = actions.find((a) => a.kind === 'attack') || null;
const summon = actions.find((a) => a.kind === 'summon') || null;
const summonSeen = useRef(null);
useEffect(() => {
  if (summon && summon.id !== summonSeen.current) {
    summonSeen.current = summon.id;
    addFloat(`+${summon.points}`, '#a3e635', 4.6, 4.4);
  }
}, [summon]);

const onStrike = (points, x) => {
  addShake(0.25 + Math.min(0.5, points * 0.08));
  addFloat(`−${points}`, '#7fe7ff', 4.2, 3.6);
};
```

and inside `<Canvas>`:

```jsx
<BossSprite enraged={enraged} hit={hit} summon={summon} />
{minions.map((m, i) => (
  <MinionSprite key={m.key} issue={m} index={i} horde={i === minions.length - 1 ? horde : 0} />
))}
{floats.map((f) => <FloatNum key={f.id} item={f} onDone={removeFloat} />)}
```

Imports to add: `useState`, `useEffect` from react; `addShake` from `./shakeBus`; the three new components. Remove the `onStrike` prop from RaidView (ArenaScene owns it now) and pass fighters `onStrike={onStrike}`.

- [ ] **Step 5: Verify with mock events** — run `npm run mock` (or rely on the live board if events flow). In preview `?raid`: boss breathes; on a `done` event the actor's fighter lunges, boss flashes white and judders, `−N` floats up teal, camera shakes; on `scope-added` the boss raises arms green-washed, `+N` floats lime, a minion pops in. Verify minion count equals open mid-sprint additions.

- [ ] **Step 6: Commit**

```bash
git add src/raid/BossSprite.jsx src/raid/MinionSprite.jsx src/raid/FloatNum.jsx src/raid/ArenaScene.jsx src/raid/RaidView.jsx
git commit -m "feat: boss with hit/summon reactions, scope-creep minions, damage numbers"
```

---

### Task 9: Atmosphere — embers + bloom + vignette

**Files:**
- Create: `src/raid/Effects.jsx`
- Modify: `src/raid/ArenaScene.jsx` (Embers + Effects)

- [ ] **Step 1: Effects.jsx**

```jsx
// src/raid/Effects.jsx
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export default function Effects() {
  return (
    <EffectComposer>
      <Bloom luminanceThreshold={0.35} intensity={1.05} mipmapBlur />
      <Vignette darkness={0.45} eskil={false} />
    </EffectComposer>
  );
}
```

- [ ] **Step 2: Embers** — add to ArenaScene:

```jsx
const EMBERS = 120;
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
```

and render `<Embers enraged={enraged} />` + `<Effects />` inside the Canvas (Effects last).

- [ ] **Step 3: Verify in preview** — embers drift up and glow under bloom; blade `L` pixels and the chest gauge bloom subtly; vignette frames the scene; check FPS stays smooth at fullscreen (dpr [1,2], antialias off — if it chugs, drop reflector `resolution` to 256).

- [ ] **Step 4: Commit**

```bash
git add src/raid/Effects.jsx src/raid/ArenaScene.jsx
git commit -m "feat: embers, bloom, vignette — the HD in HD-2D"
```

---

### Task 10: HUD — extract widgets, party frames, truth ticker

**Files:**
- Create: `src/components/hud.jsx` (move code out of BossPanel.jsx — cut & paste, keep logic identical)
- Create: `src/components/RaidHud.jsx`
- Create: `src/components/TruthTicker.jsx`
- Modify: `src/components/BossPanel.jsx` (import from hud.jsx so old view still works until Task 11)
- Modify: `src/raid/RaidView.jsx`, `src/index.css`

- [ ] **Step 1: Extract HUD widgets.** Cut `EnrageTimer` (BossPanel.jsx:42-93), `HpBar` (95-142), `ScarTimeline` (144-195), `DamageLog` + `LOG_TYPES` (197-233) into `src/components/hud.jsx`, changing each `function X` to `export function X`. Header of the new file:

```jsx
// src/components/hud.jsx
// Raid-frame widgets shared by the arena HUD (and formerly BossPanel).
import { useEffect, useMemo, useReducer, useState } from 'react';
import { fmtCountdown, fmtDate, fmtDays, timeAgo, cls, DAY } from '../lib';
```

In `BossPanel.jsx`, delete the moved code and add
`import { EnrageTimer, HpBar, ScarTimeline, DamageLog } from './hud';`.
Verify: old view (no `?raid`) renders identically; `npm test` still green.

- [ ] **Step 2: RaidHud with party frames**

```jsx
// src/components/RaidHud.jsx
import { useState } from 'react';
import Avatar from './Avatar';
import { EnrageTimer, HpBar, ScarTimeline, DamageLog } from './hud';
import { fmtDays } from '../lib';

export default function RaidHud({ view, party, onSelect }) {
  return (
    <div className="raid-hud">
      <div className="hud-top">
        <div className="hud-hp">
          <HpBar view={view} onSelect={onSelect} />
          <ScarTimeline view={view} />
        </div>
        <EnrageTimer view={view} />
      </div>
      <div className="hud-bottom">
        <div className="party">
          {party.map((f) => <PartyFrame key={f.name} fighter={f} onSelect={onSelect} />)}
        </div>
        <DamageLog view={view} />
      </div>
    </div>
  );
}

const STATUS_ICON = { fighting: '⚔', exhausted: '💤', down: '⚑', resting: '✓' };

function PartyFrame({ fighter, onSelect }) {
  const [open, setOpen] = useState(false);
  const openIssues = fighter.issues.filter((i) => !i.done);
  return (
    <div className="pframe" data-status={fighter.status}>
      <button className="pframe-head" onClick={() => setOpen((o) => !o)}>
        <Avatar name={fighter.name} src={fighter.avatar} />
        <span className="pframe-name">{fighter.name.split(' ')[0]}</span>
        <span className="pframe-status">{STATUS_ICON[fighter.status]}</span>
        <span className="pframe-counts mono">
          {fighter.open}<i> open</i>
          {fighter.stale > 0 && <b className="warn"> {fighter.stale} stale</b>}
        </span>
      </button>
      {open && (
        <div className="pframe-list">
          {openIssues.map((i) => (
            <button key={i.key} className="pframe-row mono" onClick={() => onSelect(i)}>
              {i.blocked ? '⚑ ' : ''}{i.key} · {fmtDays(i.daysInColumn)} · {i.colName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: TruthTicker**

```jsx
// src/components/TruthTicker.jsx
import { ageBand } from '../lib';

// The no-metaphor strip: per-column counts + stale, then every blocker with its reason.
export default function TruthTicker({ view, onSelect }) {
  const agingOn = !view.flags?.noChangelog;
  const lanes = view.columns
    .map((c, idx) => ({ ...c, idx }))
    .slice(0, -1)
    .filter((c) => !c.isBlockedZone);
  const blocked = view.issues.filter((i) => i.blocked && !i.done);
  return (
    <div className="ticker mono">
      {lanes.map((c) => {
        const stale = agingOn
          ? view.issues.filter((i) => i.col === c.idx && !i.blocked && !i.done &&
              ageBand(i.daysInColumn, view.aging) === 'stale').length
          : 0;
        return (
          <span key={c.name} className="ticker-col">
            {c.name.toLowerCase()} <b>{c.count}</b>
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

- [ ] **Step 4: Compose in RaidView**

```jsx
// src/raid/RaidView.jsx (full file)
import { useMemo } from 'react';
import ArenaScene from './ArenaScene';
import RaidHud from '../components/RaidHud';
import TruthTicker from '../components/TruthTicker';
import { deriveParty, deriveMinions, pulseActions } from './raidState';

export default function RaidView({ view, pulses, onSelect }) {
  const party = useMemo(() => deriveParty(view), [view]);
  const { minions, horde } = useMemo(() => deriveMinions(view), [view]);
  const actions = pulseActions(pulses, party);
  return (
    <section className="raidview">
      <div className="arena">
        <ArenaScene view={view} party={party} minions={minions} horde={horde} actions={actions} />
        <RaidHud view={view} party={party} onSelect={onSelect} />
      </div>
      <TruthTicker view={view} onSelect={onSelect} />
    </section>
  );
}
```

- [ ] **Step 5: HUD CSS** — append to `src/index.css` (adjust token names to the actual `:root`):

```css
.raid-hud { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 0.7rem; pointer-events: none; }
.raid-hud button, .raid-hud .hpbar, .raid-hud .enrage { pointer-events: auto; }
.hud-top { display: flex; gap: 0.8rem; align-items: flex-start; }
.hud-hp { flex: 1; min-width: 0; }
.hud-bottom { display: flex; gap: 0.8rem; align-items: flex-end; }
.party { flex: 1; display: flex; flex-wrap: wrap; gap: 0.4rem; }
.pframe { background: color-mix(in srgb, var(--panel) 82%, transparent); border: 1px solid var(--line); border-radius: 8px; backdrop-filter: blur(4px); }
.pframe[data-status='down'] { border-color: var(--red); }
.pframe[data-status='exhausted'] { opacity: 0.75; }
.pframe-head { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.5rem; }
.pframe-name { font-size: 0.72rem; font-weight: 700; }
.pframe-status { font-size: 0.72rem; }
.pframe-counts { font-size: 0.62rem; color: var(--faint); }
.pframe-counts .warn { color: var(--amber, #ffd479); }
.pframe-list { display: flex; flex-direction: column; padding: 0 0.4rem 0.4rem; }
.pframe-row { font-size: 0.62rem; text-align: left; padding: 0.15rem 0.2rem; color: var(--dim); }
.pframe-row:hover { color: var(--ink); }
.ticker { display: flex; align-items: center; gap: 0.9rem; overflow-x: auto; white-space: nowrap; font-size: 0.68rem; color: var(--faint); border: 1px solid var(--line); border-radius: 8px; padding: 0.4rem 0.7rem; }
.ticker b { color: var(--ink); }
.ticker-stale { color: var(--amber, #ffd479); font-style: normal; }
.ticker-block { color: var(--red); }
.ticker-ok { color: var(--teal); }
```

- [ ] **Step 6: Verify in preview** — `?raid`: HP bar + scars top-left, enrage timer top-right, party frames bottom (click expands ticket list; clicking a row opens TicketModal), damage log bottom-right, ticker strip under the arena listing per-column counts + blockers. HP segments still clickable.

- [ ] **Step 7: Commit**

```bash
git add src/components/hud.jsx src/components/RaidHud.jsx src/components/TruthTicker.jsx src/components/BossPanel.jsx src/raid/RaidView.jsx src/index.css
git commit -m "feat: raid HUD (party frames, hp/enrage/log) and truth ticker"
```

---

### Task 11: Flip the default, retire the conveyor belt

**Files:**
- Modify: `src/App.jsx`
- Delete: `src/components/FactoryLine.jsx`, `src/components/BossPanel.jsx`, `src/components/BossFigure.jsx`
- Modify: `src/index.css` (remove dead styles)

- [ ] **Step 1: App.jsx** — remove the `RAID` flag and old imports; the `<main>` becomes:

```jsx
<main className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: '1fr' }}>
  <RaidView view={view} pulses={mode === 'retro' ? [] : pulses} onSelect={setSelected} />
</main>
```

- [ ] **Step 2: Delete dead components**

```bash
git rm src/components/FactoryLine.jsx src/components/BossPanel.jsx src/components/BossFigure.jsx
```

(Check first that nothing else imports them: `grep -rn "FactoryLine\|BossPanel\|BossFigure" src/` should only hit App.jsx history/none. `Modes.jsx` (standup/retro) and `Screens.jsx` must NOT import them — if StandupOverlay reuses `Ticket`, that stays; `Ticket.jsx` survives for standup mode.)

- [ ] **Step 3: Purge dead CSS** — remove from `src/index.css` the blocks for `.factory`, `.stations`, `.station*`, `.belt*`, `.bay*`, `.boss-stage`, `.boss-wrap`, `.boss` SVG anims, `.steam*`, `.crack`, `.flash`, `.eye`, `.brow`, `.floatnum`, `.statline`. KEEP `.hpbar`, `.hpseg`, `.enrage*`, `.scar*`, `.dlog*` (used by hud.jsx) and `.ticket*` (standup). Grep each class before deleting.

- [ ] **Step 4: Verify everything**

Run: `npm test` → green. Preview without any flag: arena is the app. Standup mode opens over it; retro mode scrubs — party poses, HP bar, minions all follow the time machine (pulses correctly suppressed). Light theme: flip with the ☀ button — scene colors come from cssVar reads at mount; full-page reload after theme flip is acceptable for v1 (note as known limitation if observed).

Run: `npm run build`
Expected: builds clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat!: raid arena replaces conveyor belt as the ambient view"
```

---

### Task 12: Final review + push

- [ ] **Step 1:** Full pass: `npm test`, `npm run build`, preview check of ambient/standup/retro in dark + light, console clean.
- [ ] **Step 2:** Screenshot the arena for Bogdan's art-direction round (sprites are drafts by design).
- [ ] **Step 3:** Ask Bogdan before pushing (permission guard requires explicit approval per push to main).

---

## Self-review (done at plan time)

- **Spec coverage:** concept/HD-2D (T6, T9), layout+HUD (T10), all 7 state-mapping rows (T2 party status, T7 poses/attack, T8 boss+minions+floats, T9 enrage atmosphere; enrage timer reused in T10), tech/no-pipeline sprites (T3-T5), roster+recruit fallback (T4), survives-unchanged (T10-T11 keep data layer, standup, retro, modal), FactoryLine retirement (T11). Open questions from spec: party >10 → two-rank layout in T7; DOF → omitted (spec default-off; YAGNI); minion cap → MINION_CAP=6 in T2.
- **Placeholder scan:** sprite matrices are complete and renderable; flagged honestly as *draft art* pending Bogdan's direction — structural completeness, not deferred work.
- **Type consistency:** `FRAME` order = `BODY_FRAMES` order (roster.js imports both); `sheetTexture` entry shape `{tex, frames, frameWidth, frameHeight}` used by `setFrame` and components; `deriveParty` fighter shape `{name, avatar, open, done, stale, blocked, issues, status}` consumed by FighterSprite/PartyFrame/pulseActions; `actions` shape `{id, kind, fighter, points}` consumed in ArenaScene/FighterSprite.
