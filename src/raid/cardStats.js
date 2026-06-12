// src/raid/cardStats.js
// Pure presentation logic for the standup FighterCard: the stat grid and the
// weapon→role label. Kept separate from the R3F component so it's unit-tested
// (the component itself is verified in the browser preview).
import { weaponFor } from './sprites/roster';

// The five numeric cells, in display order. The sixth fact (status) is shown as
// the badge over the art, not as a grid cell.
export function cardStats(fighter, movedCount) {
  return [
    { key: 'done',    label: 'Completed', value: fighter.done,    tone: 'done' },
    { key: 'moved',   label: 'Moved 24h', value: movedCount,      tone: null },
    { key: 'open',    label: 'In flight', value: fighter.open,    tone: null },
    { key: 'stale',   label: 'Stale',     value: fighter.stale,   tone: 'stale' },
    { key: 'blocked', label: 'Blocked',   value: fighter.blocked, tone: 'blocked' },
  ];
}

const WEAPON_ROLE = {
  sword:   'Swordfighter',
  daggers: 'Rogue',
  bow:     'Archer',
  staff:   'Mage',
  hammer:  'Breaker',
};

// Draft wording — Bogdan's art-direction pass owns the final names.
export function weaponClassLabel(name) {
  return WEAPON_ROLE[weaponFor(name)] || 'Swordfighter';
}
