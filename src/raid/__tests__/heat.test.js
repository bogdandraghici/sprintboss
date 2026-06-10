import { describe, it, expect } from 'vitest';
import {
  heat, segmentHeat, recentKills, bossScars, fighterAuras, fighterBlockHeat,
  SEGMENT_LIFE, SCAR_LIFE, AURA_LIFE, DEBRIS_LIFE, BEACON_LIFE, SCAR_MAX,
} from '../heat';

const HOUR = 3_600_000;
const NOW = 1_000 * HOUR;

describe('heat', () => {
  it('is 1 at the event, 0 after life, linear between, clamped', () => {
    expect(heat(NOW, NOW, 2 * HOUR)).toBe(1);
    expect(heat(NOW - HOUR, NOW, 2 * HOUR)).toBeCloseTo(0.5);
    expect(heat(NOW - 3 * HOUR, NOW, 2 * HOUR)).toBe(0);
    expect(heat(NOW + HOUR, NOW, 2 * HOUR)).toBe(1); // future-safe clamp
    expect(heat(null, NOW, 2 * HOUR)).toBe(0);
  });
});

describe('segmentHeat', () => {
  it('maps done issues to cooling heat keyed by issue key', () => {
    const issues = [
      { key: 'A-1', done: true, doneAt: NOW - SEGMENT_LIFE / 2 },
      { key: 'A-2', done: false, doneAt: null },
      { key: 'A-3', done: true, doneAt: NOW - SEGMENT_LIFE * 2 },
    ];
    const m = segmentHeat(issues, NOW);
    expect(m.get('A-1')).toBeCloseTo(0.5);
    expect(m.has('A-2')).toBe(false);
    expect(m.get('A-3')).toBe(0);
  });
});

describe('recentKills / bossScars', () => {
  const events = [
    { type: 'done', key: 'A-1', ts: NOW - DEBRIS_LIFE * 2 },
    { type: 'scope-added', key: 'X-1', ts: NOW },
    { type: 'done', key: 'A-2', ts: NOW - HOUR },
  ];
  it('keeps only done events still warm, with heat', () => {
    const kills = recentKills(events, NOW, DEBRIS_LIFE);
    expect(kills.map((k) => k.key)).toEqual(['A-2']);
    expect(kills[0].heat).toBeGreaterThan(0.9);
  });
  it('dedupes to the latest done event per issue (reopened-then-redone)', () => {
    const evs = [
      { type: 'done', key: 'A-1', ts: NOW - 3 * HOUR },
      { type: 'reopened', key: 'A-1', ts: NOW - 2 * HOUR },
      { type: 'done', key: 'A-1', ts: NOW - HOUR },
    ];
    const kills = recentKills(evs, NOW, DEBRIS_LIFE);
    expect(kills).toHaveLength(1);
    expect(kills[0].ts).toBe(NOW - HOUR);
  });
  it('bossScars caps at SCAR_MAX newest', () => {
    const many = Array.from({ length: SCAR_MAX + 4 }, (_, i) =>
      ({ type: 'done', key: `K-${i}`, ts: NOW - (SCAR_MAX + 4 - i) * 1000 }));
    const scars = bossScars(many, NOW);
    expect(scars).toHaveLength(SCAR_MAX);
    expect(scars.map((s) => s.key)).toEqual(
      Array.from({ length: SCAR_MAX }, (_, i) => `K-${i + 4}`));
  });
});

describe('fighterAuras', () => {
  it('routes by issue owner (not event actor) and keeps the hottest', () => {
    const issues = [{ key: 'A-1', assignee: 'Ana' }, { key: 'A-2', assignee: 'Ana' }];
    const events = [
      { type: 'done', key: 'A-1', ts: NOW - AURA_LIFE * 9, actor: 'Reviewer' },
      { type: 'done', key: 'A-2', ts: NOW - AURA_LIFE / 4, actor: 'Bot' },
      { type: 'done', key: 'Z-9', ts: NOW, actor: 'Ghost' }, // unknown issue: ignored
    ];
    const m = fighterAuras(events, issues, NOW);
    expect(m.get('Ana')).toBeCloseTo(0.75);
    expect(m.size).toBe(1);
  });
});

describe('fighterBlockHeat', () => {
  it('fresher blocks burn brighter; unblocked issues drop out', () => {
    const issues = [
      { key: 'B-1', assignee: 'Bo', blocked: true, done: false },
      { key: 'B-2', assignee: 'Bo', blocked: false, done: false },
    ];
    const events = [
      { type: 'blocked', key: 'B-1', ts: NOW - HOUR },
      { type: 'blocked', key: 'B-2', ts: NOW },
    ];
    const m = fighterBlockHeat(events, issues, NOW);
    expect(m.get('Bo')).toBeCloseTo(1 - HOUR / BEACON_LIFE);
  });
  it('a blocked issue with no blocked event still appears at heat 0', () => {
    const issues = [{ key: 'B-3', assignee: 'Cy', blocked: true, done: false }];
    expect(fighterBlockHeat([], issues, NOW).get('Cy')).toBe(0);
  });
});
