// src/raid/__tests__/raidState.test.js
import { describe, it, expect } from 'vitest';
import { deriveParty, deriveMinions, pulseActions, MINION_CAP } from '../raidState';

const aging = { freshDays: 2, warmDays: 5 }; // ageBand: >5d = stale
const mkIssue = (over) => ({
  key: 'MT-1', assignee: 'Ana', assigneeAvatar: null, points: 1,
  done: false, blocked: false, daysInColumn: 1, addedMidSprint: false, ...over,
});
const mkView = (issues, flags = {}) => ({ issues, aging, flags });

describe('deriveParty', () => {
  it('groups issues by assignee and skips unassigned', () => {
    const party = deriveParty(mkView([
      mkIssue({ key: 'A-1' }), mkIssue({ key: 'A-2' }), mkIssue({ key: 'X-1', assignee: null }),
    ]));
    expect(party).toHaveLength(1);
    expect(party[0]).toMatchObject({ name: 'Ana', open: 2, done: 0 });
  });
  it('status=fighting when any open work is moving', () => {
    const [f] = deriveParty(mkView([mkIssue({ daysInColumn: 1 }), mkIssue({ key: 'A-2', daysInColumn: 9 })]));
    expect(f.status).toBe('fighting');
    expect(f.stale).toBe(1);
  });
  it('status=exhausted when ALL open work is stale', () => {
    const [f] = deriveParty(mkView([mkIssue({ daysInColumn: 9 })]));
    expect(f.status).toBe('exhausted');
  });
  it('status=down when any ticket is blocked (beats exhausted)', () => {
    const [f] = deriveParty(mkView([mkIssue({ blocked: true, daysInColumn: 9 })]));
    expect(f.status).toBe('down');
  });
  it('status=resting when everything is done', () => {
    const [f] = deriveParty(mkView([mkIssue({ done: true })]));
    expect(f.status).toBe('resting');
  });
  it('no staleness when changelog is off', () => {
    const [f] = deriveParty(mkView([mkIssue({ daysInColumn: 9 })], { noChangelog: true }));
    expect(f.status).toBe('fighting');
  });
  it('orders by open count desc then name', () => {
    const party = deriveParty(mkView([
      mkIssue({ assignee: 'Zoe' }),
      mkIssue({ key: 'B-1', assignee: 'Bo' }), mkIssue({ key: 'B-2', assignee: 'Bo' }),
    ]));
    expect(party.map((f) => f.name)).toEqual(['Bo', 'Zoe']);
  });
});

describe('deriveMinions', () => {
  it('one minion per open mid-sprint addition, capped with horde overflow', () => {
    const adds = Array.from({ length: MINION_CAP + 3 }, (_, i) =>
      mkIssue({ key: `C-${i}`, addedMidSprint: true }));
    const { minions, horde } = deriveMinions(mkView([...adds, mkIssue({ key: 'D-1', addedMidSprint: true, done: true })]));
    expect(minions).toHaveLength(MINION_CAP);
    expect(horde).toBe(3); // the done one never counts
  });
});

describe('pulseActions', () => {
  const party = [{ name: 'Ana' }, { name: 'Bo' }];
  it('routes done pulses to the actor fighter', () => {
    const [a] = pulseActions([{ id: 'p1', type: 'done', actor: 'Bo', points: 3 }], party);
    expect(a).toMatchObject({ kind: 'attack', fighter: 1, points: 3 });
  });
  it('unknown actor still lands a hit (fighter -1)', () => {
    const [a] = pulseActions([{ id: 'p2', type: 'done', actor: 'Ghost' }], party);
    expect(a).toMatchObject({ kind: 'attack', fighter: -1, points: 1 });
  });
  it('scope-added becomes a summon', () => {
    const [a] = pulseActions([{ id: 'p3', type: 'scope-added', points: 2 }], party);
    expect(a).toMatchObject({ kind: 'summon', points: 2 });
  });
  it('ignores other event types', () => {
    expect(pulseActions([{ id: 'p4', type: 'blocked' }], party)).toEqual([]);
  });
});
