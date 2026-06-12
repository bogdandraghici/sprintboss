import { describe, it, expect } from 'vitest';
import { deriveSnapshot, priorSprintsOf, DAY } from '../../shared/derive.js';
import { CONFIG } from '../../shared/config.js';

describe('priorSprintsOf', () => {
  it('returns [] for missing / non-array input', () => {
    expect(priorSprintsOf(undefined, 42)).toEqual([]);
    expect(priorSprintsOf(null, 42)).toEqual([]);
    expect(priorSprintsOf('nope', 42)).toEqual([]);
  });

  it('maps closed sprints to {id, name}', () => {
    expect(priorSprintsOf([{ id: 40, name: 'Sprint 40', state: 'closed' }], 42))
      .toEqual([{ id: 40, name: 'Sprint 40' }]);
  });

  it('excludes the current sprint (closed-fallback/retro: a closed sprint lists itself)', () => {
    const closed = [{ id: 41, name: 'Sprint 41' }, { id: 42, name: 'Sprint 42' }];
    expect(priorSprintsOf(closed, 42)).toEqual([{ id: 41, name: 'Sprint 41' }]);
  });

  it('falls back to the id when a sprint has no name', () => {
    expect(priorSprintsOf([{ id: 40 }], 42)).toEqual([{ id: 40, name: '40' }]);
  });
});

describe('deriveSnapshot priorSprints passthrough', () => {
  const columns = [
    { name: 'To Do', statusNames: ['to do'], wipLimit: null },
    { name: 'Done', statusNames: ['done'], wipLimit: null },
  ];
  const sprint = { id: 42, name: 'S42', state: 'active', startDate: 0, endDate: 10 * DAY };
  const baseIssue = {
    key: 'SB-1', summary: 'x', url: '', assignee: null, points: null,
    created: 1, statusName: 'To Do', transitions: [], flagHistory: [],
    flagged: false, blockedReason: null, sprintAddedAt: null,
  };

  it('carries priorSprints onto the output issue', () => {
    const issues = [{ ...baseIssue, priorSprints: [{ id: 41, name: 'S41' }] }];
    const snap = deriveSnapshot({ sprint, issues, columns, config: CONFIG, now: 5 * DAY });
    expect(snap.issues[0].priorSprints).toEqual([{ id: 41, name: 'S41' }]);
  });

  it('defaults to [] when the source omits it (mock issues, old payloads)', () => {
    const snap = deriveSnapshot({ sprint, issues: [{ ...baseIssue }], columns, config: CONFIG, now: 5 * DAY });
    expect(snap.issues[0].priorSprints).toEqual([]);
  });
});
