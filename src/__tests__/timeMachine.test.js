// src/__tests__/timeMachine.test.js
import { describe, it, expect } from 'vitest';
import { deriveSnapshot, DAY } from '../../shared/derive.js';
import { stateAt } from '../timeMachine.js';

// Minimal config that mirrors what the server uses.
const CONFIG = {
  pollMs: 30_000,
  unestimatedPoints: 1,
  velocityWindowDays: 3,
  aging: { freshDays: 2, warmDays: 5 },
};

const COLUMNS = [
  { name: 'To Do',       statusNames: ['to do'],       wipLimit: null },
  { name: 'In Progress', statusNames: ['in progress'], wipLimit: null },
  { name: 'Blocked',     statusNames: ['blocked'],     wipLimit: null },
  { name: 'Done',        statusNames: ['done'],        wipLimit: null },
];

const sprintStart = Date.now() - 10 * DAY;
const sprintEnd   = Date.now() +  4 * DAY;

const SPRINT = {
  id: 1, name: 'Test Sprint', goal: null, state: 'active',
  startDate: sprintStart,
  endDate:   sprintEnd,
};

// t0: issue created (in "To Do")
// t1: moved to "In Progress"
// t2: moved to "Blocked" column  ← makes it blocked via column, not via flag
// t3: well after the move (our "after" probe)
const t0 = sprintStart + 1 * DAY;   // created day 1
const t1 = sprintStart + 2 * DAY;   // moved to In Progress day 2
const t2 = sprintStart + 5 * DAY;   // moved to Blocked column day 5
const t3 = sprintStart + 7 * DAY;   // probe: after the move

const ISSUES = [
  {
    key: 'MT-1',
    summary: 'A ticket that ends up in the Blocked column',
    url: 'https://example.atlassian.net/browse/MT-1',
    assignee: 'Ana',
    assigneeAvatar: null,
    points: 1,
    created: t0,
    statusName: 'to do',
    sprintAddedAt: t0,
    transitions: [
      { ts: t1, from: 'To Do',       to: 'In Progress', author: 'Ana' },
      { ts: t2, from: 'In Progress', to: 'Blocked',     author: 'Ana' },
    ],
    flagHistory: [],   // no flags at all — blocked ONLY via column
    flagged: false,
    blockedReason: null,
  },
];

const snap = deriveSnapshot({
  sprint:  SPRINT,
  issues:  ISSUES,
  columns: COLUMNS,
  config:  CONFIG,
  now:     t3,
});

describe('stateAt — blocked-zone column reconstruction', () => {
  it('live snapshot correctly marks issue blocked when it is in the Blocked column', () => {
    // Sanity-check that deriveSnapshot itself sees the issue as blocked.
    const live = snap.issues.find((i) => i.key === 'MT-1');
    expect(live.blocked).toBe(true);
    expect(live.colName).toBe('Blocked');
  });

  it('retro view AFTER move into Blocked column reports blocked:true', () => {
    const view = stateAt(snap, t3);
    const issue = view.issues.find((i) => i.key === 'MT-1');
    expect(issue).toBeDefined();
    expect(issue.colName).toBe('Blocked');
    expect(issue.blocked).toBe(true);   // ← currently FAILS with old code
  });

  it('retro view BEFORE move into Blocked column reports blocked:false', () => {
    // probe at t1+1ms: issue is in "In Progress", not a blocked zone
    const view = stateAt(snap, t1 + 1);
    const issue = view.issues.find((i) => i.key === 'MT-1');
    expect(issue).toBeDefined();
    expect(issue.colName).toBe('In Progress');
    expect(issue.blocked).toBe(false);
  });

  it('blocked issue in retro mode has a non-null blockedReason', () => {
    const view = stateAt(snap, t3);
    const issue = view.issues.find((i) => i.key === 'MT-1');
    expect(issue.blockedReason).not.toBeNull();
  });
});
