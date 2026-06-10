// src/raid/sprites/boss.js
// The factory golem, pixel edition. 28x26, 3 frames: idle A/B (breathing), cast (summon).
// Enrage = palette swap in textures (E and G go red); hit flash = material tint.

export const BOSS_PALETTE = {
  K: '#0d1016', M: '#5b6b7d', D: '#3a4654', E: '#ff5d5d',
  G: '#7fe7ff', C: '#e8eef4', W: '#6b5b4a', L: '#bfefff',
};

// Correction: plan had all rows at 27 chars; padded each with trailing '.' to reach 28.
const B_IDLE_A = [
  '....KKK..............KKK....',  // 0
  '...KDDDK............KDDDK...',  // 1
  '...KDDDK............KDDDK...',  // 2
  '....KMK..............KMK....',  // 3
  '..KKKMMKKKKKKKKKKKKKKMMKKK..',  // 4
  '.KMMMMMMMMMMMMMMMMMMMMMMMK..',  // 5
  '.KMEEMMMMMMMMMMMMMMMMEEMMK..',  // 6
  '.KMEEMMMMMMMMMMMMMMMMEEMMK..',  // 7
  '.KMMMMMMMDDDDDDDDMMMMMMMMK..',  // 8
  '.KMMMMMMDKKKKKKKKDMMMMMMMK..',  // 9
  '..KKMMMMMMMMMMMMMMMMMMKK....',  // 10
  '...KMMMMMMMMMMMMMMMMMMK.....',  // 11
  '..KMMMMMMDDDDDDDDMMMMMMK....',  // 12
  '..KMMMMMDGGGGGGGGDMMMMMK....',  // 13
  '.KMMMMMMDGGCCGGGGDMMMMMMK...',  // 14
  '.KDMMMMMDGGGCCGGGDMMMMMDK...',  // 15
  '.KDMMMMMDGGGGGGGGDMMMMMDK...',  // 16
  '.KMMMMMMMDDDDDDDDMMMMMMMK...',  // 17
  '..KMMMMMMMMMMMMMMMMMMMMK....',  // 18
  '..KMMMMKKMMMMMMMMKKMMMMK....',  // 19
  '...KKKK..KMMMMMMK..KKKK.....',  // 20
  '.........KMMMMMMK...........',  // 21
  '........KDDDKKDDDK..........',  // 22
  '........KDDDKKDDDK..........',  // 23
  '.......KKDDDKKDDDKK.........',  // 24
  '.......KKKKKKKKKKKK.........',  // 25
];

// Breathing: eyes drop one row (rows 6/7 swap); the plan says rows 6 and 7.
// Plan rows were also 27-wide; pad to 28.
const B_IDLE_B = B_IDLE_A.map((row, y) => {
  if (y === 6) return '.KMMMMMMMMMMMMMMMMMMMMMMMK..';  // eyes gone (27+1=28)
  if (y === 7) return '.KMEEMMMMMMMMMMMMMMMMEEMMK..';  // eyes shifted (27+1=28)
  return row;
});

// Summon cast: arms raised high, gauge flares.
// r4, r5 are 28; r13, r19, r20 were 27 in the plan — padded with '.' to reach 28.
const B_CAST = B_IDLE_A.map((row, y) => {
  if (y === 4) return 'KMKKKMMKKKKKKKKKKKKKKMMKKKMK';          // 28 (plan correct)
  if (y === 5) return 'KMKMMMMMMMMMMMMMMMMMMMMMKMK.'.slice(0, 28); // 28 (plan correct)
  if (y === 13) return '..KMMMMMDGLLLLLLGDMMMMMK....';        // 27+1=28
  if (y === 19) return '..KMMMMMMMMMMMMMMMMMMMMK....';        // 27+1=28
  if (y === 20) return '...KKKKKKMMMMMMKKKKKKK......';        // 27+1=28
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
