# Fighter Hi-Res Redraw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redraw the raid-view fighters at 20×28 native (40×56 upscaled) with a distinct body per weapon class, flat-chunky 8-bit style, weapons drawn into the bodies.

**Architecture:** Each class lives in its own dependency-free data file under `src/raid/sprites/classes/` exporting `{ poses, headBoxes, headAnchors, hairAt }`. `bodies.js` aggregates them into `CLASSES` and derives `HEADLESS` (avatar-headed) variants. `roster.js` picks the class by the person's existing `weapon` field; `weapons.js` and the weapon-compose step are deleted. `FighterSprite.jsx` switches to the exported sprite dimensions and a per-class head-anchor table.

**Tech Stack:** Plain JS pixel matrices, vitest, R3F (verified in browser preview).

**Spec:** `docs/superpowers/specs/2026-06-11-fighter-hires-redraw-design.md`

---

## Convention for art tasks (read first)

Pixel art cannot be finalized in a markdown plan — it is iterated visually with
Bogdan (designer; sprite art is draft until his art-direction pass — see
CLAUDE.md). Therefore:

- **Task 1 embeds the complete, validated sword class** — the reference for
  structure, proportions, and choreography. Copy its conventions exactly.
- **Tasks 2–5** author the other four classes *at execution time* against the
  choreography specs below. "Done" for an art task = the parameterized vitest
  suite passes (dimensions, palette, head-box erasure, anchor bounds) **and**
  the ASCII render reads correctly when eyeballed.
- All matrices: **20 wide × 28 tall**, chars from `.KSHABPWLG` only
  (`.` transparent, `K` outline, `S` skin, `H` hair, `A` armor hue, `B` dark
  armor/belt/boots, `P` pants, `W` wood/grip, `L` metal light, `G` gem glow).
  Fighters face **right**. Feet end on row 27 for standing poses. Flat color —
  no shading ramps, no `R` char.

## File structure

- Create: `src/raid/sprites/classes/sword.js` (Task 1), `hammer.js` (2), `bow.js` (3), `staff.js` (4), `daggers.js` (5) — pure data, **zero imports** (so node can load them directly for ASCII proofing)
- Create: `scripts/render-class.mjs` — ASCII proof tool (Task 1)
- Modify: `src/raid/sprites/bodies.js` — add `CLASSES`/`HEADLESS`; legacy exports stay until Task 6
- Modify: `src/raid/sprites/roster.js` — class-indexed build, 40×56, new hair (Task 6)
- Delete: `src/raid/sprites/weapons.js` (Task 6)
- Modify: `src/raid/__tests__/sprites.test.js` — class-body suite (Task 1), legacy-test rewrite (Task 6)
- Modify: `src/raid/FighterSprite.jsx` — dimension constants, anchors, cache key v4 (Task 7)

---

### Task 1: Class infrastructure + sword reference class

**Files:**
- Create: `src/raid/sprites/classes/sword.js`
- Create: `scripts/render-class.mjs`
- Modify: `src/raid/sprites/bodies.js` (append; keep all existing exports)
- Test: `src/raid/__tests__/sprites.test.js` (append a describe block)

- [ ] **Step 1: Write the failing test** — append to `src/raid/__tests__/sprites.test.js`:

```js
import { CLASSES, HEADLESS } from '../sprites/bodies';

describe('class bodies (20×28)', () => {
  const CHARS = '.KSHABPWLG';
  for (const [cls, c] of Object.entries(CLASSES)) {
    it(`${cls}: 6 poses, 20×28, palette-clean`, () => {
      expect(c.poses).toHaveLength(6);
      for (const f of c.poses) {
        expect(f).toHaveLength(28);
        for (const row of f) {
          expect(row).toHaveLength(20);
          for (const ch of row) expect(CHARS).toContain(ch);
        }
      }
    });
    it(`${cls}: head boxes erase cleanly, anchors in bounds, hairAt per pose`, () => {
      expect(c.headBoxes).toHaveLength(6);
      expect(c.headAnchors).toHaveLength(6);
      expect(c.hairAt).toHaveLength(6);
      c.headBoxes.forEach((b, i) => {
        const hf = HEADLESS[cls][i];
        for (let y = b.y0; y <= b.y1; y++) {
          expect(hf[y].slice(b.x0, b.x1 + 1)).toBe('.'.repeat(b.x1 - b.x0 + 1));
        }
      });
      for (const [cx, cy] of c.headAnchors) {
        expect(cx).toBeGreaterThanOrEqual(0);
        expect(cx).toBeLessThanOrEqual(20);
        expect(cy).toBeGreaterThanOrEqual(0);
        expect(cy).toBeLessThanOrEqual(28);
      }
    });
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/raid/__tests__/sprites.test.js`
Expected: FAIL — `CLASSES` is not exported from `../sprites/bodies`.

- [ ] **Step 3: Create `src/raid/sprites/classes/sword.js`** (complete, validated content — 6 poses: IDLE_A, IDLE_B, ATTACK_A wind-up, ATTACK_B strike, KNEEL, DOWN):

```js
// src/raid/sprites/classes/sword.js
// Balanced knight, 20×28, sword drawn in. Pure data — no imports (node-loadable).
// Chars: K outline, S skin, H hair, A armor, B dark, P pants, W grip, L blade, G gem.

const IDLE_A = [
  '....................',
  '.......KKKKK....L...',
  '......KHHHHHK..KLK..',
  '.....KHHHHHHHK.KLK..',
  '.....KHHHHHHHK.KLK..',
  '.....KHSSSSSHK.KLK..',
  '.....KSSKSSKSK.KLK..',
  '.....KSSSSSSSK.KLK..',
  '......KSSSSSK..KLK..',
  '.......KSSSK...KLK..',
  '.....KKAAAAAKK.KWK..',
  '....KAAAAAAAAAKKWK..',
  '...KAAKAAGAAKAAKSK..',
  '...KAAKAAAAAAKASSK..',
  '...KSSKAAAAAAKKSK...',
  '...KKKKBAAAABKKK....',
  '......KBBBBBBK......',
  '......KAAAAAAK......',
  '......KAAAAAAK......',
  '......KPPKKPPK......',
  '.....KPPK..KPPK.....',
  '.....KPPK..KPPK.....',
  '.....KPPK..KPPK.....',
  '.....KPPK..KPPK.....',
  '.....KPPK..KPPK.....',
  '....KKPPK..KPPKK....',
  '....KBBBK..KBBBK....',
  '...KKBBBK..KBBBKK...',
];

// Breathing: shoulders settle, chest gem glints a row higher.
const IDLE_B_EDITS = {
  11: '....KAAAAGAAAAKKWK..',
  12: '...KAAKAAAAAKAAKSK..',
};
const IDLE_B = IDLE_A.map((r, y) => IDLE_B_EDITS[y] ?? r);

// Wind-up: sword raised high behind the head, torso coiled.
const ATTACK_A = [
  '............KLK.....',
  '...........KLK......',
  '...........KLK......',
  '......KKKKK.KLK.....',
  '.....KHHHHHKKLK.....',
  '....KHHHHHHHKLK.....',
  '....KHHHHHHHKWK.....',
  '....KHSSSSSHKWK.....',
  '....KSSKSSKSKSK.....',
  '....KSSSSSSSKSK.....',
  '.....KSSSSSKKSK.....',
  '......KSSSKKASK.....',
  '....KKAAAAAKAAK.....',
  '...KAAAAAAAAAAK.....',
  '...KAAKAAGAAAAK.....',
  '...KSSKAAAAAAK......',
  '...KKKKBAAAABK......',
  '......KBBBBBBK......',
  '......KAAAAAAK......',
  '......KAAAAAAK......',
  '......KPPKKPPK......',
  '.....KPPK..KPPK.....',
  '.....KPPK..KPPK.....',
  '.....KPPK..KPPK.....',
  '.....KPPK..KPPK.....',
  '....KKPPK..KPPKK....',
  '....KBBBK..KBBBK....',
  '...KKBBBK..KBBBKK...',
];

// Strike: lunge right, sword thrust horizontal to the grid edge.
const ATTACK_B = [
  '....................',
  '....................',
  '....................',
  '....KKKKK...........',
  '...KHHHHHK..........',
  '..KHHHHHHHK.........',
  '..KHHHHHHHK.........',
  '..KHSSSSSHK.........',
  '..KSSKSSKSK.........',
  '..KSSSSSSSK.........',
  '...KSSSSSK..........',
  '....KSSSK...........',
  '..KKAAAAAKK.........',
  '.KAAAAAAAAAKKKKKK...',
  '.KAAKAAGAAASSWLLLLLL',
  '.KAAKAAAAAAKKKKKK...',
  '.KSSKAAAAAAK........',
  '.KKKKBAAAABK........',
  '....KBBBBBBK........',
  '....KAAAAAAK........',
  '....KAAAAKKK........',
  '....KPPKKPPK........',
  '...KPPK..KPPKK......',
  '...KPPK...KPPPK.....',
  '..KPPK.....KPPPK....',
  '..KPPK......KPPK....',
  '.KKBBBK.....KBBBKK..',
  '.KBBBBK.....KBBBBK..',
];

// Exhausted: on one knee, sword planted as a cane.
const KNEEL = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '.......KKKKK........',
  '......KHHHHHK..KLK..',
  '.....KHHHHHHHK.KLK..',
  '.....KHHHHHHHK.KLK..',
  '.....KHSSSSSHK.KLK..',
  '.....KSSKSSKSK.KLK..',
  '......KSSSSSK..KLK..',
  '.......KSSSK...KLK..',
  '.....KKAAAAAKK.KWK..',
  '....KAAAAAAAAAKKWK..',
  '...KAAKAAGAAAAKSSK..',
  '...KSSKAAAAAAAKSK...',
  '...KKKKBAAAAABKK....',
  '......KBBBBBBK......',
  '.....KAAAAAAAK......',
  '....KPPKAAAAPPK.....',
  '...KPPK.KPPPPPK.....',
  '...KPPK.KPPKPPK.....',
  '..KPPK..KPPKKPPK....',
  '..KPPK..KPPK.KPPK...',
  '.KKBBBKKKPPK..KBBK..',
  '.KBBBBKKBBBK..KBBK..',
  '....................',
];

// Knocked down: flat on the back, sword dropped above.
const DOWN = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '..LLLLLLW...........',
  '....................',
  '....KKKKK...........',
  '...KHHHHHKKKKKKKKK..',
  '..KHHHHHHKAAAAAAABK.',
  '..KHSSSSHKAAGAAAABPK',
  '..KSSKSSHKAAAAAABPPK',
  '..KHSSSSHKAAAAAABPK.',
  '...KKKKKKKKKKKKKKK..',
  '....................',
];

export default {
  poses: [IDLE_A, IDLE_B, ATTACK_A, ATTACK_B, KNEEL, DOWN],
  // Erase-box per pose for the avatar-headed variant (pixel coords, inclusive).
  headBoxes: [
    { x0: 4, y0: 0, x1: 14, y1: 9 },
    { x0: 4, y0: 0, x1: 14, y1: 9 },
    { x0: 3, y0: 3, x1: 11, y1: 12 },
    { x0: 1, y0: 3, x1: 10, y1: 11 },
    { x0: 4, y0: 5, x1: 13, y1: 12 },
    { x0: 1, y0: 20, x1: 8, y1: 26 },
  ],
  // [cx, cy] head-centre per pose, 20×28 pixel space.
  headAnchors: [
    [9, 4.5], [9, 4.5], [8, 7.5], [6, 7.5], [9, 9], [5, 23.5],
  ],
  // Hair overlay top-left per pose; null = no hair on this pose (e.g. lying down).
  hairAt: [[5, 0], [5, 0], [4, 2], [2, 2], [5, 4], null],
};
```

- [ ] **Step 4: Append to `src/raid/sprites/bodies.js`** (do not remove anything yet):

```js
/* --- 20×28 per-class bodies (hi-res redraw) ------------------------------- */
import sword from './classes/sword';

export const CLASSES = { sword };

const eraseHead = (frame, b) =>
  frame.map((row, y) =>
    y < b.y0 || y > b.y1
      ? row
      : [...row].map((ch, x) => (x >= b.x0 && x <= b.x1 ? '.' : ch)).join('')
  );

export const HEADLESS = Object.fromEntries(
  Object.entries(CLASSES).map(([k, c]) => [
    k,
    c.poses.map((f, i) => eraseHead(f, c.headBoxes[i])),
  ])
);
```

(`import` lines go at the top of the file, with the existing header comment.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/raid/__tests__/sprites.test.js`
Expected: PASS — including the two new `sword:` cases. The legacy describe blocks must still pass (nothing removed).

- [ ] **Step 6: Create `scripts/render-class.mjs`** (ASCII proof tool):

```js
// Usage: node scripts/render-class.mjs sword [poseIndex]
// Renders a class file's poses as ASCII for eyeballing proportions.
const cls = process.argv[2] ?? 'sword';
const only = process.argv[3] != null ? Number(process.argv[3]) : null;
const { default: c } = await import(`../src/raid/sprites/classes/${cls}.js`);
const NAMES = ['IDLE_A', 'IDLE_B', 'ATTACK_A', 'ATTACK_B', 'KNEEL', 'DOWN'];
c.poses.forEach((f, i) => {
  if (only != null && i !== only) return;
  console.log(`\n=== ${cls} / ${NAMES[i]} ===`);
  f.forEach((r) => console.log(r.replace(/\./g, ' ')));
});
```

- [ ] **Step 7: Proof it**

Run: `node scripts/render-class.mjs sword`
Expected: 6 readable poses; knight facing right, sword at side / raised / thrust / planted / dropped.

- [ ] **Step 8: Commit**

```bash
git add src/raid/sprites/classes/sword.js src/raid/sprites/bodies.js src/raid/__tests__/sprites.test.js scripts/render-class.mjs
git commit -m "feat(sprites): 20x28 class-body infrastructure + sword reference class"
```

---

### Task 2: Hammer class (Calin — broad, squat bruiser)

**Files:**
- Create: `src/raid/sprites/classes/hammer.js`
- Modify: `src/raid/sprites/bodies.js` (add to `CLASSES`)

**Choreography spec** (author the matrices against this, sword file as structural template):
- Silhouette: shoulders ~16px wide, head sits low (no visible neck), torso a wide slab, legs short and thick. Standing height ~24 rows (head starts ~row 4).
- `IDLE_A`: hammer (W handle, L head ~4×3px) resting head-down at his side like a sledge. `IDLE_B`: shoulders rise 1px (edit-map off IDLE_A like sword's `IDLE_B_EDITS`).
- `ATTACK_A` (wind-up): hammer raised overhead two-handed, both arms up, back arched.
- `ATTACK_B` (strike): hammer slammed down-forward, body bent forward, hammer head at ~row 20 in front of him.
- `KNEEL`: on one knee leaning on the upright hammer.
- `DOWN`: flat on his back, hammer beside him (like sword's DOWN with the weapon above the body).
- Hood/hair: normal hair (Calin is `buzz`), standard head rules.

- [ ] **Step 1: Create `hammer.js`** with `export default { poses, headBoxes, headAnchors, hairAt }` exactly like `sword.js`. Head boxes must cover head+hair area per pose; anchors at head centre; `hairAt` null for DOWN.
- [ ] **Step 2: Register it** — in `bodies.js`: `import hammer from './classes/hammer';` and `CLASSES = { sword, hammer }`.
- [ ] **Step 3: Run tests** — `npx vitest run src/raid/__tests__/sprites.test.js`. The parameterized suite now covers `hammer:` automatically. Expected: PASS. If a width/erase assertion fails, fix the named row.
- [ ] **Step 4: Proof** — `node scripts/render-class.mjs hammer`; eyeball all 6 poses against the spec above.
- [ ] **Step 5: Commit** — `git add -A src/raid/sprites scripts && git commit -m "feat(sprites): hammer class bodies"`

---

### Task 3: Bow class (Andrei — lean, tall archer)

**Files:**
- Create: `src/raid/sprites/classes/bow.js`
- Modify: `src/raid/sprites/bodies.js` (add to `CLASSES`)

**Choreography spec:**
- Silhouette: narrow shoulders (~10px), long thin legs, full 28-row height. Quiver strap pixel-line across the torso (B over A).
- `IDLE_A`: bow (W limbs, L string) held vertical in the right hand. `IDLE_B`: edit-map breathing.
- `ATTACK_A` (wind-up): bow raised toward the boss, string drawn back, nocked arrow (L) — arms spread.
- `ATTACK_B` (strike): arrow loosed — bow arm fully extended right, string straight, arrow gone (the scene's SlashFX sells the hit).
- `KNEEL`: kneeling, bow planted like a staff.
- `DOWN`: flat, bow beside.

- [ ] **Step 1: Create `bow.js`** (same export shape as `sword.js`).
- [ ] **Step 2: Register** in `bodies.js` `CLASSES`.
- [ ] **Step 3: Run tests** — `npx vitest run src/raid/__tests__/sprites.test.js`. Expected: PASS.
- [ ] **Step 4: Proof** — `node scripts/render-class.mjs bow`.
- [ ] **Step 5: Commit** — `git commit -am "feat(sprites): bow class bodies"`

---

### Task 4: Staff class (Cristina, Mihai — robed caster)

**Files:**
- Create: `src/raid/sprites/classes/staff.js`
- Modify: `src/raid/sprites/bodies.js` (add to `CLASSES`)

**Choreography spec:**
- Silhouette: no separate legs — robe (A with B hem) widens from waist to a flat base at row 27. Slim shoulders.
- `IDLE_A`: staff vertical at side, gem (G, 2×2) on top. `IDLE_B`: gem glint edit (swap one G row up, like sword's gem move).
- `ATTACK_A` (wind-up): staff raised overhead, gem flaring (G pixels widen by 1 each side).
- `ATTACK_B` (strike): staff thrust forward horizontally, gem leading, robe trailing back.
- `KNEEL`: slumped forward, staff planted, head bowed (robe pools — wider base).
- `DOWN`: flat, staff beside.

- [ ] **Step 1: Create `staff.js`** (same export shape).
- [ ] **Step 2: Register** in `CLASSES`.
- [ ] **Step 3: Run tests** — expected PASS.
- [ ] **Step 4: Proof** — `node scripts/render-class.mjs staff`.
- [ ] **Step 5: Commit** — `git commit -am "feat(sprites): staff class bodies"`

---

### Task 5: Daggers class (Alex — small, hooded rogue)

**Files:**
- Create: `src/raid/sprites/classes/daggers.js`
- Modify: `src/raid/sprites/bodies.js` (add to `CLASSES`)

**Choreography spec:**
- Silhouette: shortest of the five (~22 rows standing, head starts ~row 6), permanent crouch, hood (B over the head — pointed top) instead of visible hair. `hairAt` is `null` for **all** poses; the hood erases with the head box for avatar mode.
- `IDLE_A`: both daggers (L blades, W grips, 3px) held low at his sides, knees bent. `IDLE_B`: bounce 1px edit.
- `ATTACK_A` (wind-up): coiled lower, daggers crossed in front.
- `ATTACK_B` (strike): lunging right, both daggers thrust forward parallel.
- `KNEEL`: standard one-knee pose, daggers sheathed (not drawn).
- `DOWN`: flat, one dagger beside.

- [ ] **Step 1: Create `daggers.js`** (same export shape; all-`null` `hairAt`).
- [ ] **Step 2: Register** in `CLASSES`.
- [ ] **Step 3: Run tests** — expected PASS.
- [ ] **Step 4: Proof** — `node scripts/render-class.mjs daggers`.
- [ ] **Step 5: Commit** — `git commit -am "feat(sprites): daggers class bodies"`

---

### Task 6: Rewire roster, delete weapons.js, retire the 14×20 pipeline

**Files:**
- Modify: `src/raid/sprites/roster.js` (rewrite)
- Modify: `src/raid/sprites/bodies.js` (delete legacy 14×20 exports)
- Delete: `src/raid/sprites/weapons.js`
- Test: `src/raid/__tests__/sprites.test.js` (rewrite legacy blocks)

- [ ] **Step 1: Update the legacy tests first** — in `sprites.test.js`:
  - Change the bodies import line to `import { compose, CLASSES, HEADLESS } from '../sprites/bodies';`
  - Change the roster import to `import { framesFor, headlessFramesFor, paletteFor, ROSTER, FRAME, headAnchors40For, SPRITE_W, SPRITE_H } from '../sprites/roster';`
  - Rename describe `'body + roster frames (28×40 pipeline)'` → `'body + roster frames (40×56 pipeline)'` (assertions already use `SPRITE_W`/`SPRITE_H`).
  - Replace the `'headless (avatar-headed) frames'` describe's last two cases with:

```js
  it('erases the head box on every class pose', () => {
    for (const [cls, c] of Object.entries(CLASSES)) {
      c.headBoxes.forEach((b, i) => {
        const hf = HEADLESS[cls][i];
        for (let y = b.y0; y <= b.y1; y++) {
          expect(hf[y].slice(b.x0, b.x1 + 1)).toBe('.'.repeat(b.x1 - b.x0 + 1));
        }
      });
    }
  });
  it('every roster member has 15 head anchors inside the 40×56 grid', () => {
    for (const name of [...Object.keys(ROSTER), 'Unknown Person']) {
      const anchors = headAnchors40For(name);
      expect(anchors).toHaveLength(FRAME_COUNT);
      for (const [cx, cy] of anchors) {
        expect(cx).toBeGreaterThanOrEqual(0);
        expect(cx).toBeLessThanOrEqual(SPRITE_W);
        expect(cy).toBeGreaterThanOrEqual(0);
        expect(cy).toBeLessThanOrEqual(SPRITE_H);
      }
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail** — `npx vitest run src/raid/__tests__/sprites.test.js`. Expected: FAIL (`headAnchors40For` not exported; `SPRITE_W` still 28).

- [ ] **Step 3: Rewrite `src/raid/sprites/roster.js`:**

```js
// src/raid/sprites/roster.js
// Hand-made look per teammate: palette + hair overlay + weapon class.
// Names must match Jira display names. '__recruit__' is the unknown-assignee fallback.
//
// Frames are assembled from the 20×28 class bodies (sprites/classes/) via
// RECIPES, then upscaled 2× (40×56). Flat chunky pixels on purpose — the
// approved mockup look; the hand-drawn K outlines in the matrices are the only
// outlines. Weapons are drawn into the class bodies; per-person identity is
// palette + hair + avatar head.
import { CLASSES, HEADLESS, compose } from './bodies';
import { up2, shift } from './ops';

export const FRAME = {
  IDLE_A: 0, IDLE_B: 1, IDLE_C: 2, IDLE_D: 3,
  ATTACK_A: 4, ATTACK_B: 5, ATTACK_C: 6, ATTACK_D: 7, ATTACK_E: 8,
  HIT: 9, KNEEL_A: 10, KNEEL_B: 11, DOWN: 12, VICTORY_A: 13, VICTORY_B: 14,
};
export const SPRITE_W = 40;
export const SPRITE_H = 56;

// [basePoseIdx (classes/ pose order: idleA, idleB, attackA, attackB, kneel,
//  down), dx, dy]. dx/dy are 20×28 pixels applied to the assembled frame,
//  doubled by the upscale.
const RECIPES = [
  [0, 0, 0],   // IDLE_A
  [1, 0, 0],   // IDLE_B
  [0, 0, 1],   // IDLE_C settle
  [1, 0, 1],   // IDLE_D
  [2, -1, 0],  // ATTACK_A anticipation (pull back)
  [2, 0, 0],   // ATTACK_B wind-up
  [3, 0, 0],   // ATTACK_C strike
  [3, 1, 0],   // ATTACK_D follow-through
  [0, 0, 0],   // ATTACK_E recover
  [0, -1, 1],  // HIT react (lean back, drop)
  [4, 0, 0],   // KNEEL_A
  [4, 0, 1],   // KNEEL_B breathe
  [5, 0, 0],   // DOWN
  [2, 0, 0],   // VICTORY_A weapon pumped overhead
  [2, 0, -1],  // VICTORY_B hop
];

const BASE_PALETTE = {
  K: '#0d1016', S: '#e8b48c', H: '#3a2f26', A: '#46566b',
  B: '#2a3340', P: '#232a35', W: '#6b5b4a', L: '#dce8ff', G: '#7fe7ff',
};

// Hair overlays (9-wide) composed at the class's per-pose hairAt anchor
// (drafts — art-directed later).
const HAIR = {
  short:  ['.KHHHHHK.', 'KHHHHHHHK'],
  buzz:   ['.........', '.KHHHHHK.'],
  long:   ['.KHHHHHK.', 'KHHHHHHHK', 'KHH...HHK', 'KHH...HHK'],
  bun:    ['.KHKHHHK.', 'KHHHHHHHK'],
  spiky:  ['KH.HH.HK.', 'KHHHHHHHK'],
};

// Armor colors follow the approved mockup: vivid, one hue per fighter, so the
// party reads as distinct silhouettes from across the room.
export const ROSTER = {
  'Serban Chiricescu': { hair: 'short', weapon: 'sword',   palette: { H: '#2b2118', A: '#5d8fd6' } },
  'Calin Nicoara':     { hair: 'buzz',  weapon: 'hammer',  palette: { H: '#1d1813', A: '#d87a5a' } },
  'Cristina Stanica':  { hair: 'long',  weapon: 'staff',   palette: { H: '#4a3220', A: '#8d7fd6' } },
  'Andrei Scheau':     { hair: 'spiky', weapon: 'bow',     palette: { H: '#332620', A: '#3fbf9a' } },
  'Alex Preda':        { hair: 'short', weapon: 'daggers', palette: { H: '#16120e', A: '#7a8aa8' } },
  'Corina Ivanov':     { hair: 'bun',   weapon: 'sword',   palette: { H: '#52341d', A: '#e0a93f' } },
  'Mihai Saru':        { hair: 'short', weapon: 'staff',   palette: { H: '#26201a', A: '#36c8a0' } },
  '__recruit__':       { hair: 'buzz',  weapon: 'sword',   palette: { H: '#3a3a3a', A: '#6b7280' } },
};

const personOf = (name) => ROSTER[name] || ROSTER.__recruit__;

export function paletteFor(name) {
  return { ...BASE_PALETTE, ...personOf(name).palette };
}

function build(name, headless) {
  const p = personOf(name);
  const cls = CLASSES[p.weapon];
  const headlessPoses = HEADLESS[p.weapon];
  return RECIPES.map(([bi, dx, dy]) => {
    let f;
    if (headless) {
      f = headlessPoses[bi];
    } else {
      const at = cls.hairAt[bi];
      f = at ? compose(cls.poses[bi], HAIR[p.hair], at[0], at[1]) : cls.poses[bi];
    }
    f = up2(f);
    return dx || dy ? shift(f, dx * 2, dy * 2) : f;
  });
}

export const framesFor = (name) => build(name, false);
export const headlessFramesFor = (name) => build(name, true);

// Head-centre anchors per FRAME, in 40×56 pixel space, for a given person
// (anchors are per-class now).
export function headAnchors40For(name) {
  const cls = CLASSES[personOf(name).weapon];
  return RECIPES.map(([bi, dx, dy]) => {
    const [cx, cy] = cls.headAnchors[bi];
    return [cx * 2 + dx * 2, cy * 2 + dy * 2];
  });
}
```

- [ ] **Step 4: Trim `src/raid/sprites/bodies.js`** down to: the header comment, `compose`, the `CLASSES` imports/aggregate, `eraseHead`, and `HEADLESS`. Delete `IDLE_A/IDLE_B/ATTACK_A/ATTACK_B/KNEEL/DOWN` (14×20), `BODY_FRAMES`, `HEAD_BOXES`, `HEAD_ANCHORS`, `BODY_HEADLESS`.

- [ ] **Step 5: Delete the weapons module**

```bash
git rm src/raid/sprites/weapons.js
```

- [ ] **Step 6: Run the full suite** — `npm test`. Expected: PASS (sprites suite green; `smoke.test.js` and others untouched). `FighterSprite.jsx` still imports `HEAD_ANCHORS15`, which no longer exists — vitest doesn't render it, but verify nothing else fails. (The app is broken until Task 7 — that's the next commit, minutes away.)

- [ ] **Step 7: Commit**

```bash
git add -A src/raid/sprites src/raid/__tests__/sprites.test.js
git commit -m "feat(sprites): roster on 20x28 class bodies, weapons merged, 14x20 pipeline retired"
```

---

### Task 7: FighterSprite on the 40×56 sheet

**Files:**
- Modify: `src/raid/FighterSprite.jsx`

- [ ] **Step 1: Apply these changes:**

Imports + constants (replace lines 5 and 9, and delete the module-level `headPos`):

```js
import { headlessFramesFor, paletteFor, FRAME, headAnchors40For, SPRITE_W, SPRITE_H } from './sprites/roster';

const PX = 0.024; // world units per sprite pixel -> 40x56 body ≈ 0.96 x 1.34 (same footprint as the old 28×40)
```

Inside the component, after the `entry` memo (cache key bumps v3 → v4):

```js
  const entry = useMemo(
    () => sheetTexture(`fighter:${fighter.name}:headless:v4`, headlessFramesFor(fighter.name), paletteFor(fighter.name)),
    [fighter.name]
  );
  const anchors = useMemo(() => headAnchors40For(fighter.name), [fighter.name]);
  const headPos = (frame) => {
    const [cx, cy] = anchors[frame];
    return [(cx - SPRITE_W / 2) * PX, (SPRITE_H - cy) * PX];
  };
```

Meshes (body plane centred at half height; head initial y ≈ anchor height):

```jsx
      <mesh position={[0, PX * (SPRITE_H / 2), 0]}>
        <planeGeometry args={[SPRITE_W * PX, SPRITE_H * PX]} />
        <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      <mesh ref={head} position={[0, PX * 47, 0.02]}>
```

- [ ] **Step 2: Run the full suite** — `npm test`. Expected: PASS.

- [ ] **Step 3: Browser verification** — start the mock server (`preview_start` with `sprint-boss-mock`), open the Raid view, and check: all seven fighters + a recruit render at the same world size as before; idle cycle breathes; completing a mock ticket plays wind-up → strike with the avatar head tracking the lunge; blocked fighter lies DOWN with beacon; exhausted kneels. Screenshot for the record.

- [ ] **Step 4: Commit**

```bash
git add src/raid/FighterSprite.jsx
git commit -m "feat(raid): fighters on the 40x56 class-body sheets"
```

---

### Task 8: Final verification + art-direction pass

- [ ] **Step 1: Full suite** — `npm test`. Expected: all green.
- [ ] **Step 2: Mock-mode sweep** — with `npm run mock` in the preview: trigger attack/block/scope events; verify each of the five classes' attack choreography reads correctly at TV distance (zoom the browser out); check `?lite` mode renders identically (sprites are unaffected by post-processing, but confirm).
- [ ] **Step 3: Bogdan's art-direction review** — walk through each class in the preview. This is the acceptance gate (mockups-are-contracts). Expect matrix touch-ups; iterate with `render-class.mjs` + vitest + preview until approved.
- [ ] **Step 4: Update CLAUDE.md** — sprite bullet: 14×20 → "20×28 per-class matrices in `sprites/classes/` (weapons drawn in; `weapons.js` is gone)". Commit docs + any touch-ups:

```bash
git add -A && git commit -m "docs: CLAUDE.md sprite pipeline update + art pass touch-ups"
```
