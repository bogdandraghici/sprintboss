// src/raid/__tests__/raidState.test.js
import { describe, it, expect } from 'vitest';
import { deriveParty, deriveMinions, pulseActions, MINION_CAP } from '../raidState';
import { bossStage, deriveDock, dockDensity, deriveTableau, QUEUE_MAX, WORK_MAX } from '../raidState';

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
  it('blocked issues never count as stale (blocked-as-column boards)', () => {
    const [f] = deriveParty(mkView([
      mkIssue({ blocked: true, daysInColumn: 30 }),
      mkIssue({ key: 'A-2', daysInColumn: 1 }),
    ]));
    expect(f.status).toBe('down');
    expect(f.stale).toBe(0);
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
  const party = [
    { name: 'Ana', issues: [{ key: 'A-1' }] },
    { name: 'Bo', issues: [{ key: 'B-1' }] },
  ];
  it('routes done pulses to the owning fighter by issue key', () => {
    // actor is deliberately NOT a party member — that's the regression this test pins.
    // The transition author may be a reviewer or automation; the owning fighter should swing.
    const [a] = pulseActions([{ id: 'p1', type: 'done', key: 'B-1', actor: 'Some Reviewer', points: 3 }], party);
    expect(a).toMatchObject({ kind: 'attack', fighter: 1, points: 3 });
  });
  it('unknown issue still lands a hit (fighter -1)', () => {
    const [a] = pulseActions([{ id: 'p2', type: 'done', key: 'Z-9', actor: 'Ghost' }], party);
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

describe('bossStage', () => {
  const s = (remaining, total) => bossStage({ remaining, total });
  it('maps hp fraction to crack stages: 0 pristine .. 3 near-death, 4 dead', () => {
    expect(s(10, 10)).toBe(0);
    expect(s(7.4, 10)).toBe(1);   // <= 75%
    expect(s(5, 10)).toBe(2);     // <= 50%
    expect(s(2.5, 10)).toBe(3);   // <= 25%
    expect(s(0, 10)).toBe(4);
    expect(s(0, 0)).toBe(0);      // empty sprint: pristine, not dead
  });
});

describe('deriveDock', () => {
  const columns = [
    { name: 'To Do', isBlockedZone: false },
    { name: 'In Progress', isBlockedZone: false },
    { name: 'Blocked', isBlockedZone: true },
    { name: 'Done', isBlockedZone: false },
  ];
  const mk = (key, col, over = {}) =>
    ({ key, col, columnSince: 5, done: false, blocked: false, ...over });
  it('one group per working column; first is the queue; done never appears', () => {
    const view = { columns, issues: [
      mk('A-1', 0), mk('A-2', 1), mk('A-3', 3, { done: true }),
    ] };
    const { groups } = deriveDock(view);
    expect(groups.map((g) => [g.name, g.kind])).toEqual([['To Do', 'queue'], ['In Progress', 'work']]);
    expect(groups.flatMap((g) => g.issues.map((i) => i.key))).toEqual(['A-1', 'A-2']);
  });
  it('blocked issues drain into the blocked list regardless of column, stalest first', () => {
    const view = { columns, issues: [
      mk('B-1', 2, { blocked: true, columnSince: 9 }),
      mk('B-2', 1, { blocked: true, columnSince: 3 }),
    ] };
    const { groups, blocked } = deriveDock(view);
    expect(blocked.map((i) => i.key)).toEqual(['B-2', 'B-1']);
    expect(groups[1].issues).toEqual([]);
  });
});

describe('dockDensity', () => {
  it('full up to max, compact to 2x, chips capped at 3x with overflow count', () => {
    expect(dockDensity(4, 6)).toEqual({ density: 'full', show: 4, more: 0 });
    expect(dockDensity(9, 6)).toEqual({ density: 'compact', show: 9, more: 0 });
    expect(dockDensity(20, 6)).toEqual({ density: 'chip', show: 18, more: 2 });
  });
  it('exports TV capacity constants', () => {
    expect(QUEUE_MAX).toBeGreaterThan(0);
    expect(WORK_MAX).toBeGreaterThan(0);
  });
});

describe('deriveTableau', () => {
  const mkV = (remaining, total, now, end) =>
    ({ stats: { remaining, total }, now, sprint: { end } });
  it('victory when all hp is gone', () => {
    expect(deriveTableau(mkV(0, 10, 5, 10))).toBe('victory');
  });
  it('defeat when the sprint ended with hp left', () => {
    expect(deriveTableau(mkV(3, 10, 11, 10))).toBe('defeat');
  });
  it('null mid-sprint, and null for an empty sprint', () => {
    expect(deriveTableau(mkV(3, 10, 5, 10))).toBe(null);
    expect(deriveTableau(mkV(0, 0, 5, 10))).toBe(null);
  });
});
