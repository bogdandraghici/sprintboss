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
  [2, 0, 0],   // VICTORY_A weapon raised
  [2, 0, 1],   // VICTORY_B settle-bounce (down, like IDLE_C — an up-shift would clip the raised weapon tip)
];

const BASE_PALETTE = {
  K: '#0d1016', S: '#e8b48c', H: '#3a2f26', A: '#46566b',
  B: '#2a3340', P: '#232a35', W: '#6b5b4a', L: '#dce8ff', G: '#7fe7ff',
};

// Hair overlays (9-wide) composed at the class's per-pose hairAt anchor.
// compose() is additive-only — these can cover the baked-in hair cap but never
// erase it, so low-profile styles read mostly through palette (drafts —
// art-directed later).
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
  'Serban Chiricescu': { hair: 'short', weapon: 'sword',   palette: { H: '#2b2118', A: '#5d8fd6' }, art: 'serban' },
  'Calin Nicoara':     { hair: 'buzz',  weapon: 'hammer',  palette: { H: '#1d1813', A: '#d87a5a' }, art: 'calin' },
  // Gabi's Jira display name is the raw account id WITH a zero-width space
  // (U+200B) after the dot — written as an escape so the invisible char
  // can't be lost by an editor; exact-match key.
  'gabriel.\u200bmuscalu': { hair: 'buzz', weapon: 'hammer', palette: { H: '#1d1813', A: '#c9a23f' }, art: 'paladin' },
  'Cristina Stanica':  { hair: 'long',  weapon: 'staff',   palette: { H: '#4a3220', A: '#8d7fd6' }, art: 'cristinas' },
  'Andrei Scheau':     { hair: 'spiky', weapon: 'bow',     palette: { H: '#332620', A: '#3fbf9a' }, art: 'andreis', flip: true },
  'Andrei Dumitrescu': { hair: 'short', weapon: 'sword',   palette: { H: '#2e2018', A: '#b5413a' }, art: 'andreid' },
  'Alex Preda':        { hair: 'short', weapon: 'daggers', palette: { H: '#16120e', A: '#7a8aa8' }, art: 'alexpreda' },
  'Corina Ivanov':     { hair: 'bun',   weapon: 'sword',   palette: { H: '#52341d', A: '#e0a93f' }, art: 'corina' },
  'Mihai Saru':        { hair: 'short', weapon: 'staff',   palette: { H: '#26201a', A: '#36c8a0' }, art: 'mihai', artScale: 0.85 },
  'Andra Popazu':      { hair: 'long',  weapon: 'staff',   palette: { H: '#3a2a1a', A: '#6fae3a' }, art: 'andra' },
  'Tiberiu Birloiu':   { hair: 'short', weapon: 'hammer',  palette: { H: '#2e2118', A: '#e0852a' }, art: 'tibi' },
  'Ana Spataru':       { hair: 'long',  weapon: 'staff',   palette: { H: '#2f5a8c', A: '#f0d878' }, art: 'ana' },
  'Gregor Buza':       { hair: 'short', weapon: 'sword',   palette: { H: '#3a2a1a', A: '#9c7a4a' }, art: 'gregor' },
  'Sebastian Raduta':  { hair: 'long',  weapon: 'staff',   palette: { H: '#2e2018', A: '#5fa84a' }, art: 'sebi' },
  'Darius Suditu':     { hair: 'short', weapon: 'staff',   palette: { H: '#2e2117', A: '#2bb6c8' }, art: 'darius' },
  '__recruit__':       { hair: 'buzz',  weapon: 'sword',   palette: { H: '#3a3a3a', A: '#6b7280' } },
};

const personOf = (name) => ROSTER[name] || ROSTER.__recruit__;

export function paletteFor(name) {
  return { ...BASE_PALETTE, ...personOf(name).palette };
}

// Painted-art slug for a person, or null → the pixel-matrix path renders.
// Unknown assignees resolve through __recruit__, which has no art.
export const artSlugFor = (name) => personOf(name).art || null;

// Per-fighter painted-art height multiplier (1 = default ART_FIGHTER_H).
// Lets a wide/seated pose read at the right size next to standing fighters.
export const artScaleFor = (name) => personOf(name).artScale || 1;

// Weapon class for a person ('sword' | 'hammer' | 'bow' | 'staff' | 'daggers').
// Unknown assignees resolve through __recruit__ (which is 'sword').
export const weaponFor = (name) => personOf(name).weapon;

// Horizontal-facing multiplier for a person's sprite: -1 mirrors the figure
// (for art drawn facing the opposite way from the rest of the party), else 1.
// Applied as scale.x on the rig's outer group in both FighterArtRig/Sprite.
export const flipFor = (name) => (personOf(name).flip ? -1 : 1);

// Per-fighter vertical framing nudge (world units, +up/−down) for the standup
// FighterCard only — compensates for art PNGs whose figure sits high/low in
// frame so the head/feet aren't cropped. 0 = the card's default drop.
export const cardYFor = (name) => personOf(name).cardY || 0;

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
