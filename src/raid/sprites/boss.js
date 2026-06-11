// src/raid/sprites/boss.js
// The factory golem, pixel edition. 28x26, 3 frames: idle A/B (breathing), cast (summon).
// Enrage = palette swap in textures (E and G go red); hit flash = material tint.

import { compose } from './bodies';
import { up2 } from './ops';

// Slate golem matched to the close-up mockup — flat un-outlined blocks in a
// three-tone neutral slate ramp (D dark recess, M body, T lit edge/sternum),
// twin ember eyes with a darker-orange socket glow ('e'). No center crevice,
// no ghost fringe: clean solid silhouette.
export const BOSS_PALETTE = {
  K: '#0d1016', M: '#4e5468', T: '#727b91', D: '#33384a', E: '#ff6033',
  e: '#c23d1c',
  G: '#7fe7ff', C: '#e8eef4', W: '#6b5b4a', L: '#bfefff',
  O: '#ff9d3d', m: '#4e546866',
};

// Scope-creep minions are their own creature — mockup green, not boss slate.
export const MINION_PALETTE = {
  K: '#0d1016', M: '#69b35e', D: '#2e6b2a', E: '#ffd75e',
};

// The golem, matched to the close-up mockup: rounded slate head with twin
// ember eyes (socket glow below), the head flowing straight into wide
// shoulders, chunky arms hanging at the sides, a lighter sternum down the
// upper torso, tapering to a column base. Solid edges, no crevice.
const B_IDLE_A = [
  '..........TTTTTTTT..........',  // 0  head top (rounded)
  '.........TMMMMMMMMT.........',  // 1
  '........MMMMMMMMMMMM........',  // 2  brow
  '........MMMEEMMEEMMM........',  // 3  eyes
  '........MMMEEMMEEMMM........',  // 4
  '........MMMeeMMeeMMM........',  // 5  socket glow
  '........MMMMMMMMMMMM........',  // 6  lower face
  '.....TTTTTTTTTTTTTTTTTT.....',  // 7  lit shoulder top
  '....TMMMMMMMMMMMMMMMMMMT....',  // 8  shoulders
  '....MMMMMMMMMMMMMMMMMMMM....',  // 9
  '....DDDKMMMMMTTMMMMMKDDD....',  // 10 armpit notch + sternum
  '....DDDDMMMMMTTMMMMMDDDD....',  // 11 arms hang at the sides
  '....DDDDMMMMMTTMMMMMDDDD....',  // 12
  '....DDDDMMMMMTTMMMMMDDDD....',  // 13
  '....DDDDMMMMMMMMMMMMDDDD....',  // 14
  '....DDDDMMMMMMMMMMMMDDDD....',  // 15
  '......DDMMMMMMMMMMMMDD......',  // 16 arms taper
  '......DDMMMMMMMMMMMMDD......',  // 17
  '.......DMMMMMMMMMMMMD.......',  // 18 hips
  '........MMMMMMMMMMMM........',  // 19 column
  '........MMMMMMMMMMMM........',  // 20
  '........MMMMMMMMMMMM........',  // 21
  '........MMMMMDDMMMMM........',  // 22 leg split begins
  '........MMMMMDDMMMMM........',  // 23
  '........DMMMMDDMMMMD........',  // 24 base
  '........DDDDDDDDDDDD........',  // 25 base shadow
];

// Breathing: the head bobs down a pixel.
const B_IDLE_B = B_IDLE_A.map((row, y) =>
  y === 0 ? '.'.repeat(28) : y <= 6 ? B_IDLE_A[y - 1] : row
);

// Summon cast: arms wrenched up beside the head. Rows 8-10 keep the arm roots
// (and the cracks that compose there); 11-17 drop the side arms.
const B_CAST = B_IDLE_A.map((row, y) => {
  if (y === 0) return '..DDD.....TTTTTTTT.....DDD..';
  if (y === 1) return '..DDD....TMMMMMMMMT....DDD..';
  if (y === 2) return '..DDD...MMMMMMMMMMMM...DDD..';
  if (y === 3) return '..DDD...MMMEEMMEEMMM...DDD..';
  if (y === 4) return '..DDD...MMMEEMMEEMMM...DDD..';
  if (y === 5) return '..DDD...MMMeeMMeeMMM...DDD..';
  if (y === 6) return '..DDD...MMMMMMMMMMMM...DDD..';
  if (y === 7) return '...DDDMMMMMMMMMMMMMMMMDDD...';
  if (y >= 11 && y <= 13) return '........MMMMMTTMMMMM........';
  if (y >= 14 && y <= 17) return '........MMMMMMMMMMMM........';
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
