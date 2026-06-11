// src/raid/sprites/boss.js
// The factory golem, pixel edition. 28x26, 3 frames: idle A/B (breathing), cast (summon).
// Enrage = palette swap in textures (E and G go red); hit flash = material tint.

import { compose } from './bodies';
import { up2 } from './ops';

// Dark slate per the approved mockup — the boss reads as a looming mass with
// burning eyes, not a light-gray robot.
export const BOSS_PALETTE = {
  K: '#0d1016', M: '#4a5168', T: '#6e7896', D: '#2b3044', E: '#ff6a3d',
  G: '#7fe7ff', C: '#e8eef4', W: '#6b5b4a', L: '#bfefff',
  O: '#ff9d3d',
};

// Scope-creep minions are their own creature — mockup green, not boss slate.
export const MINION_PALETTE = {
  K: '#0d1016', M: '#69b35e', D: '#2e6b2a', E: '#ffd75e',
};

// The golem, redrawn to the approved mockup silhouette: small head with 2×2
// ember eyes, massive shoulders, heavy dark arms ending in fists, narrow
// waist, sturdy legs. No machinery — it's a creature, not a robot.
const B_IDLE_A = [
  '.........KKKKKKKKKK.........',  // 0  head top
  '.........KTTTTTTTTK.........',  // 1  lit crown
  '.........KMMMMMMMMK.........',  // 2
  '.........KMEEMMEEMK.........',  // 3  eyes
  '.........KMEEMMEEMK.........',  // 4
  '.........KMMMMMMMMK.........',  // 5  jaw
  '..........KMMMMMMK..........',  // 6  neck
  '...KKKKKKKKMMMMMMKKKKKKKK...',  // 7  shoulder line
  '..KTTTTTTTMMMMMMMMTTTTTTTK..',  // 8  lit shoulder tops
  '.KTMMMMMMMMMMMMMMMMMMMMMMTK.',  // 9
  '.KMMMMMMMMMMMMMMMMMMMMMMMMK.',  // 10
  '.KDDDDKKMMMMMMMMMMMMKKDDDDK.',  // 11 arms split from torso
  '.KDDDDK.KMMMMMMMMMMK.KDDDDK.',  // 12
  '.KDDDDK.KMMMMMMMMMMK.KDDDDK.',  // 13
  '.KDDDDK.KMMMMMMMMMMK.KDDDDK.',  // 14
  '.KDDDDK.KMMMMMMMMMMK.KDDDDK.',  // 15
  'KKDDDDKK.KMMMMMMMMK.KKDDDDKK',  // 16 fists
  'KDDDDDDK.KMMMMMMMMK.KDDDDDDK',  // 17
  'KKKKKKKK.KMMMMMMMMK.KKKKKKKK',  // 18
  '.........KMMMMMMMMK.........',  // 19 hips
  '........KMMMK..KMMMK........',  // 20 legs
  '........KMMMK..KMMMK........',  // 21
  '........KMMMK..KMMMK........',  // 22
  '.......KDMMMK..KMMMDK.......',  // 23 feet flare
  '......KDDMMMK..KMMMDDK......',  // 24
  '......KKKKKKK..KKKKKKK......',  // 25
];

// Breathing: the head bobs down a pixel.
const B_IDLE_B = B_IDLE_A.map((row, y) =>
  y === 0 ? '.'.repeat(28) : y <= 6 ? B_IDLE_A[y - 1] : row
);

// Summon cast: arms wrenched up beside the head, fists to the sky.
const B_CAST = B_IDLE_A.map((row, y) => {
  if (y === 1) return '.KDDK....KTTTTTTTTK....KDDK.';
  if (y === 2) return '.KDDK....KMMMMMMMMK....KDDK.';
  if (y === 3) return '.KDDK....KMEEMMEEMK....KDDK.';
  if (y === 4) return '.KDDK....KMEEMMEEMK....KDDK.';
  if (y === 5) return '.KDDK....KMMMMMMMMK....KDDK.';
  if (y === 6) return '.KDDDK....KMMMMMMK....KDDDK.';
  if (y === 7) return '..KKDDDKKKKMMMMMMKKKKDDDKK..';
  if (y === 11) return '........KMMMMMMMMMMMMK......';
  if (y >= 12 && y <= 15) return '.........KMMMMMMMMMMK.......';
  if (y >= 16 && y <= 18) return '.........KMMMMMMMMK.........';
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

/* Damage stages: crack overlays composed onto every frame as HP drops.
   Sparse overlays in 28×26 space — short rows are fine, compose clips.
   'O' is the molten core glowing through; 'K' the crack shadow. */

const CRACK_1 = [
  '', '', '', '', '', '', '', '', '',
  '....KO',
  '.....KO',
  '', '',
  '.................OK',
  '................OK',
];
const CRACK_2 = [
  '', '', '', '', '', '', '', '', '', '', '',
  '...........KOO',
  '............KOO',
  '.............KO',
  '', '',
  '...........OK',
  '..........OK',
];
const CRACK_3 = [
  '', '',
  '............KO',
  '.............O',
  '', '', '', '', '', '', '', '', '', '',
  '..............OOK',
  '.............OOK',
  '............OK',
  '', '', '', '',
  '.........OK',
  '..........OK',
];
const CRACKS = [null, CRACK_1, CRACK_2, CRACK_3];

// Staged frames: cracks accumulate, then 2× upscale. Flat pixels — the
// hand-drawn K outline is the outline (mockup look).
// stage 0..3 — stage 4 (dead) is a scene animation, not a sheet.
export function bossFrames(stage) {
  const s = Math.max(0, Math.min(3, stage));
  return BOSS_FRAMES.map((f) => {
    let out = f;
    for (let i = 1; i <= s; i++) out = compose(out, CRACKS[i], 0, 0);
    return up2(out);
  });
}
