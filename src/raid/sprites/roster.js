// src/raid/sprites/roster.js
// Hand-made look per teammate: palette + hair overlay + weapon.
// Names must match Jira display names. '__recruit__' is the unknown-assignee fallback.
import { BODY_FRAMES, BODY_HEADLESS, compose } from './bodies';
import { WEAPONS } from './weapons';

export const FRAME = { IDLE_A: 0, IDLE_B: 1, ATTACK_A: 2, ATTACK_B: 3, KNEEL: 4, DOWN: 5 };

const BASE_PALETTE = {
  K: '#0d1016', S: '#c9935f', H: '#3a2f26', A: '#46566b',
  B: '#2a3340', P: '#232a35', W: '#6b5b4a', L: '#bfefff', G: '#7fe7ff',
};

// Hair overlays sit at [2, 0] over the head rows (drafts — art-directed later).
const HAIR = {
  short:  ['.KHHK.', 'KHHHHK'],
  buzz:   ['......', 'KHHHHK'],
  long:   ['.KHHK.', 'KHHHHK', 'KH..HK', 'KH..HK'],
  bun:    ['KK.KHK', '.KHHHK'],
  spiky:  ['KH.HK.', 'KHHHHK'],
};

export const ROSTER = {
  'Serban Chiricescu': { hair: 'short', weapon: 'sword',   palette: { H: '#2b2118', A: '#4a5d74' } },
  'Calin Nicoara':     { hair: 'buzz',  weapon: 'hammer',  palette: { H: '#1d1813', A: '#5d5446' } },
  'Cristina Stanica':  { hair: 'long',  weapon: 'staff',   palette: { H: '#4a3220', A: '#5b4a6b' } },
  'Andrei Scheau':     { hair: 'spiky', weapon: 'bow',     palette: { H: '#332620', A: '#3d5c52' } },
  'Alex Preda':        { hair: 'short', weapon: 'daggers', palette: { H: '#16120e', A: '#444c63' } },
  'Corina Ivanov':     { hair: 'bun',   weapon: 'sword',   palette: { H: '#52341d', A: '#6b4a55' } },
  'Mihai Saru':        { hair: 'short', weapon: 'staff',   palette: { H: '#26201a', A: '#3f5a6b' } },
  '__recruit__':       { hair: 'buzz',  weapon: 'sword',   palette: { H: '#3a3a3a', A: '#4a4a52' } },
};

const personOf = (name) => ROSTER[name] || ROSTER.__recruit__;

export function paletteFor(name) {
  return { ...BASE_PALETTE, ...personOf(name).palette };
}

export function framesFor(name) {
  const p = personOf(name);
  return BODY_FRAMES.map((body, fi) => {
    let frame = compose(body, HAIR[p.hair], 4, 0);
    const w = WEAPONS[p.weapon][fi];
    if (w) frame = compose(frame, w.grid, w.at[0], w.at[1]);
    return frame;
  });
}

// Avatar-headed variant: no pixel head, no hair — the profile picture is the
// head (positioned via HEAD_ANCHORS). Weapons still ride along.
export function headlessFramesFor(name) {
  const p = personOf(name);
  return BODY_HEADLESS.map((body, fi) => {
    const w = WEAPONS[p.weapon][fi];
    return w ? compose(body, w.grid, w.at[0], w.at[1]) : body;
  });
}
