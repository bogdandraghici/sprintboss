// src/raid/sprites/roster.js
// Hand-made look per teammate: palette + hair overlay + weapon.
// Names must match Jira display names. '__recruit__' is the unknown-assignee fallback.
//
// Frames are assembled from the 14×20 base bodies via RECIPES, then upscaled
// 2× (28×40). Flat chunky pixels on purpose — the approved mockup look; the
// hand-drawn K outlines in the matrices are the only outlines. Editing art
// still means editing the 14×20 matrices in bodies.js / weapons.js.
import { BODY_FRAMES, BODY_HEADLESS, HEAD_ANCHORS, compose } from './bodies';
import { WEAPONS } from './weapons';
import { up2, shift } from './ops';

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
  K: '#0d1016', S: '#e8b48c', H: '#3a2f26', A: '#46566b',
  B: '#2a3340', P: '#232a35', W: '#6b5b4a', L: '#dce8ff', G: '#7fe7ff',
};

// Hair overlays sit at [4, 0] over the head rows (drafts — art-directed later).
const HAIR = {
  short:  ['.KHHK.', 'KHHHHK'],
  buzz:   ['......', 'KHHHHK'],
  long:   ['.KHHK.', 'KHHHHK', 'KH..HK', 'KH..HK'],
  bun:    ['KK.KHK', '.KHHHK'],
  spiky:  ['KH.HK.', 'KHHHHK'],
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
  return RECIPES.map(([bi, ws, dx, dy]) => {
    let f = headless ? BODY_HEADLESS[bi] : compose(BODY_FRAMES[bi], HAIR[p.hair], 4, 0);
    const w = WEAPONS[p.weapon][ws];
    if (w) f = compose(f, w.grid, w.at[0], w.at[1]);
    f = up2(f);
    return dx || dy ? shift(f, dx * 2, dy * 2) : f;
  });
}

export const framesFor = (name) => build(name, false);
export const headlessFramesFor = (name) => build(name, true);

// Head-centre anchors per FRAME, in 28×40 pixel space.
export const HEAD_ANCHORS15 = RECIPES.map(([bi, , dx, dy]) => {
  const [cx, cy] = HEAD_ANCHORS[bi];
  return [cx * 2 + dx * 2, cy * 2 + dy * 2];
});
