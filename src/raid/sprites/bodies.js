// src/raid/sprites/bodies.js
// Base humanoid, 14x20. Frame order must match FRAME in roster.js.
// Drafts: art-directed in preview later. Keep dimensions stable.
import sword from './classes/sword';

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

/* Avatar-headed fighters: the pixel head is erased and the profile picture
   rides where it was. One erase-box + head-centre anchor per frame, in
   pixel coords (same order as BODY_FRAMES). */

const HEAD_BOXES = [
  { x0: 2, y0: 0, x1: 9, y1: 6 },   // IDLE_A
  { x0: 2, y0: 0, x1: 9, y1: 6 },   // IDLE_B
  { x0: 2, y0: 0, x1: 9, y1: 6 },   // ATTACK_A (raised arm at cols 10+ survives)
  { x0: 0, y0: 0, x1: 7, y1: 6 },   // ATTACK_B (head leads the lunge)
  { x0: 2, y0: 3, x1: 9, y1: 8 },   // KNEEL (head bowed lower)
  { x0: 1, y0: 14, x1: 6, y1: 18 }, // DOWN (lying, head at the left)
];

// [cx, cy] pixel-space centre of where the head was, per frame.
export const HEAD_ANCHORS = [
  [5.8, 3.2],
  [5.8, 3.2],
  [5.8, 3.2],
  [3.8, 3.2],
  [5.8, 5.8],
  [4, 16.2],
];

export const BODY_HEADLESS = BODY_FRAMES.map((frame, fi) => {
  const b = HEAD_BOXES[fi];
  return frame.map((row, y) =>
    y < b.y0 || y > b.y1
      ? row
      : [...row].map((ch, x) => (x >= b.x0 && x <= b.x1 ? '.' : ch)).join('')
  );
});

/* --- 20×28 per-class bodies (hi-res redraw) ------------------------------- */

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
