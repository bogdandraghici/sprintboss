// src/raid/sprites/boss.js
// The factory golem, pixel edition. 28x26, 3 frames: idle A/B (breathing), cast (summon).
// Enrage = palette swap in textures (E and G go red); hit flash = material tint.

import { compose } from './bodies';
import { up2 } from './ops';

// Slate golem per the approved mockup — flat un-outlined blocks, a head fused
// into the shoulders, ember eyes, and a translucent fringe ('m') dissolving
// off the silhouette.
export const BOSS_PALETTE = {
  K: '#0d1016', M: '#6e7790', T: '#9aa3b5', D: '#4d5570', E: '#ff5a2d',
  G: '#7fe7ff', C: '#e8eef4', W: '#6b5b4a', L: '#bfefff',
  O: '#ff9d3d', m: '#6e779066',
};

// Scope-creep minions are their own creature — mockup green, not boss slate.
export const MINION_PALETTE = {
  K: '#0d1016', M: '#69b35e', D: '#2e6b2a', E: '#ffd75e',
};

// The golem, redrawn to the approved mockup: a looming slate mass. Wide
// rounded head with big 2×2 ember eyes, shoulders flowing straight out of the
// jaw, a dark crevice splitting the torso, stubby legs. No hard outline —
// flat dithered blocks; 'm' is the ghost-fringe dissolving off the edges.
const B_IDLE_A = [
  '........mTTTTTTTTTTm........',  // 0  head top
  '........TMMMMMMMMMMT........',  // 1
  '......m.MMMMMMMMMMMM.m......',  // 2
  '........MMEEMMMMEEMM........',  // 3  eyes
  '........MMEEMMMMEEMM........',  // 4
  '........MMMMMMMMMMMM........',  // 5  jaw
  '.........DMMMMMMMMD.........',  // 6  chin
  '...mTTTTMMMMMMMMMMMMTTTTm...',  // 7  shoulder line
  '..mTMMMMMMMMMMMMMMMMMMMMTm..',  // 8  lit shoulder tops
  '...DDDDMMMMMMKKMMMMMMDDDD...',  // 9  crevice opens
  '.m.DDDDMMTMMMKKMMMTMMDDDD.m.',  // 10
  '...DDDDMMMMMMKKMMMMMMDDDD...',  // 11
  '...DDDDMMMMMMKKMMMMMMDDDD...',  // 12
  '...DDDDMMMTMMKKMMMMMMDDDD...',  // 13
  'm..DDDDMMMMMMKKMMTMMMDDDD..m',  // 14
  '...DDDDMMMMMMKKMMMMMMDDDD...',  // 15
  '......DDMMMMMKKMMMMMDD.m....',  // 16 taper
  '....m.DDMMMMMKKMMMMMDD......',  // 17
  '.......DMMMMMKKMMMMMD.......',  // 18 hips
  '........MMMMM..MMMMM........',  // 19 legs
  '........MMMMD..DMMMM........',  // 20
  '........MMMMM..MMMMM........',  // 21
  '........MMMMD..DMMMM........',  // 22
  '........MMMMM..MMMMM........',  // 23
  '.......MMMMMM..MMMMMM.......',  // 24 feet flare
  '.......DDDDDD..DDDDDD.......',  // 25
];

// Breathing: the head bobs down a pixel.
const B_IDLE_B = B_IDLE_A.map((row, y) =>
  y === 0 ? '.'.repeat(28) : y <= 6 ? B_IDLE_A[y - 1] : row
);

// Summon cast: arms wrenched up beside the head; torso narrows below.
const B_CAST = B_IDLE_A.map((row, y) => {
  if (y === 0) return '..DDD...mTTTTTTTTTTm...DDD..';
  if (y === 1) return '..DDD...TMMMMMMMMMMT...DDD..';
  if (y === 2) return '..DDD...MMMMMMMMMMMM...DDD..';
  if (y === 3) return '..DDD...MMEEMMMMEEMM...DDD..';
  if (y === 4) return '..DDD...MMEEMMMMEEMM...DDD..';
  if (y === 5) return '..DDD...MMMMMMMMMMMM...DDD..';
  if (y === 6) return '...DDD...DMMMMMMMMD...DDD...';
  if (y === 7) return '...DDDTTMMMMMMMMMMMMMMTTDDD.';
  if (y >= 11 && y <= 15) return '.......DMMMMMKKMMMMMD.......';
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

// Staged frames: cracks accumulate, then 2× upscale. Flat pixels, no
// outline pass — the mockup boss is an un-outlined mass.
// stage 0..3 — stage 4 (dead) is a scene animation, not a sheet.
export function bossFrames(stage) {
  const s = Math.max(0, Math.min(3, stage));
  return BOSS_FRAMES.map((f) => {
    let out = f;
    for (let i = 1; i <= s; i++) out = compose(out, CRACKS[i], 0, 0);
    return up2(out);
  });
}
