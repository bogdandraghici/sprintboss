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
