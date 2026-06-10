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
