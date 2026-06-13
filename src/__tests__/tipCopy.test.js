import { describe, it, expect } from 'vitest';
import { fmtDate } from '../lib';
import {
  ageTip, carryTip, scopeTip, hpSegTip, bossHpTip, scarStripTip, scarTip,
  creepTip, logTagTip, LOG_TAG_TIPS, storyMeterTip, statusTip, STATUS_TIPS,
  chipTip, staleCountTip, beaconTip, unestimatedTip,
} from '../tipCopy';

const AGING = { freshDays: 1, warmDays: 3 };

describe('ageTip', () => {
  it('is null when aging is off or band is off', () => {
    expect(ageTip(5, 'stale', null)).toBeNull();
    expect(ageTip(5, 'off', AGING)).toBeNull();
  });
  it('fresh names the fresh threshold', () => {
    expect(ageTip(0.5, 'fresh', AGING)).toBe('12h in this column — fresh (≤1d).');
  });
  it('warm names the stale threshold', () => {
    expect(ageTip(2, 'warm', AGING)).toBe('2d in this column — warm; stale past 3d.');
  });
  it('stale explains the threshold it crossed', () => {
    expect(ageTip(12, 'stale', AGING)).toBe('12d in this column — stale (past 3d without moving).');
  });
});

describe('carryTip', () => {
  it('is null for first-sprint tickets', () => {
    expect(carryTip([])).toBeNull();
    expect(carryTip(undefined)).toBeNull();
  });
  it('2nd sprint: ordinal + carry count, no amber clause', () => {
    expect(carryTip([{ id: 41 }])).toBe('2nd sprint for this ticket — carried over 1×.');
  });
  it('3rd+ sprint adds the amber clause', () => {
    expect(carryTip([{ id: 40 }, { id: 41 }]))
      .toBe('3rd sprint for this ticket — carried over 2×. Amber from ×3.');
  });
});

describe('hpSegTip', () => {
  const base = { key: 'MT-1', points: 3, done: false, blocked: false, addedMidSprint: false };
  it('base segment: key + size', () => {
    expect(hpSegTip(base, 'pts')).toBe('MT-1 · 3 pts');
  });
  it('appends done, blocked, and scope flags', () => {
    expect(hpSegTip({ ...base, done: true }, 'pts')).toBe('MT-1 · 3 pts · done');
    expect(hpSegTip({ ...base, blocked: true }, 'tickets')).toBe('MT-1 · 3 tickets · blocked');
    expect(hpSegTip({ ...base, done: true, addedMidSprint: true }, 'pts'))
      .toBe('MT-1 · 3 pts · done · joined mid-sprint (scope)');
  });
  it('singularizes a 1-ticket segment', () => {
    expect(hpSegTip({ ...base, points: 1 }, 'tickets')).toBe('MT-1 · 1 ticket');
  });
});

describe('scarTip', () => {
  it('lists up to 6 keys then counts the rest', () => {
    const g = { ts: 1750000000000, pts: 9, keys: ['A', 'B'] };
    expect(scarTip(g, 'pts')).toBe(`${fmtDate(g.ts)} · +9 pts joined mid-sprint: A, B`);
    const big = { ts: g.ts, pts: 9, keys: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] };
    expect(scarTip(big, 'pts'))
      .toBe(`${fmtDate(g.ts)} · +9 pts joined mid-sprint: A, B, C, D, E, F +2 more`);
  });
});

describe('creepTip', () => {
  it('interpolates count and unit', () => {
    expect(creepTip(48, 'tickets')).toBe('48 tickets joined after sprint start — the boss healed.');
  });
});

describe('logTagTip', () => {
  it('covers exactly the five damage-log event types', () => {
    expect(Object.keys(LOG_TAG_TIPS).sort())
      .toEqual(['blocked', 'done', 'reopened', 'scope-added', 'unblocked']);
  });
  it('HEAL explains the counterintuitive direction', () => {
    expect(logTagTip('scope-added')).toBe('Scope added — the boss regains HP.');
  });
  it('unknown type is null', () => {
    expect(logTagTip('nope')).toBeNull();
  });
});

describe('statusTip', () => {
  it('covers exactly the four fighter statuses', () => {
    expect(Object.keys(STATUS_TIPS).sort()).toEqual(['down', 'exhausted', 'fighting', 'resting']);
  });
  it('exhausted explains the all-stale derivation', () => {
    expect(statusTip('exhausted')).toBe('Exhausted — every open ticket has gone stale.');
  });
  it('unknown status falls back to fighting', () => {
    expect(statusTip('???')).toBe(STATUS_TIPS.fighting);
  });
});

describe('chipTip', () => {
  it('idle chip invites focus, using the first name', () => {
    expect(chipTip('ada lovelace', false)).toBe('Ada — click to focus the deck on their tickets.');
  });
  it('active chip explains the clear toggle', () => {
    expect(chipTip('Ada Lovelace', true)).toBe('Ada — click again to clear focus.');
  });
});

describe('storyMeterTip', () => {
  it('is null without progress', () => {
    expect(storyMeterTip(null)).toBeNull();
  });
  it('explains the all-columns count', () => {
    expect(storyMeterTip({ done: 4, total: 9 }))
      .toBe("4/9 of this story's sprint tickets done — counts every column.");
  });
});

describe('staleCountTip', () => {
  it('names the threshold; null when aging off', () => {
    expect(staleCountTip(AGING)).toBe('Parked past the stale threshold (3d).');
    expect(staleCountTip(null)).toBeNull();
  });
});

describe('unestimatedTip', () => {
  it('pts mode: assumed value', () => {
    expect(unestimatedTip(3, 'pts')).toBe('No estimate — assumed 3 pts.');
  });
  it('tickets mode: counted, singular/plural', () => {
    expect(unestimatedTip(1, 'tickets')).toBe('No estimate — counted as 1 ticket.');
    expect(unestimatedTip(2, 'tickets')).toBe('No estimate — counted as 2 tickets.');
  });
});

describe('static tips', () => {
  it('exist and are non-empty', () => {
    for (const t of [scopeTip(), bossHpTip(), scarStripTip(), beaconTip()]) {
      expect(typeof t).toBe('string');
      expect(t.length).toBeGreaterThan(10);
    }
  });
});
