import { describe, it, expect } from 'vitest';
import { storyProgress } from '../raidState';

// Minimal issue factory: only the fields storyProgress reads.
const iss = (key, parentKey, done) => ({ key, parentKey, done });

describe('storyProgress', () => {
  it('returns an empty map for no issues', () => {
    expect(storyProgress({ issues: [] }).size).toBe(0);
  });

  it('counts done/total per parent across ALL issues (done included)', () => {
    const view = { issues: [
      iss('SB-1', 'ST-1', true),
      iss('SB-2', 'ST-1', false),
      iss('SB-3', 'ST-1', true),
      iss('SB-4', 'ST-2', false),
    ] };
    const m = storyProgress(view);
    expect(m.get('ST-1')).toEqual({ done: 2, total: 3 });
    expect(m.get('ST-2')).toEqual({ done: 0, total: 1 });
  });

  it('ignores parentless issues', () => {
    const view = { issues: [iss('SB-1', null, true), iss('SB-2', 'ST-1', false)] };
    const m = storyProgress(view);
    expect(m.size).toBe(1);
    expect(m.get('ST-1')).toEqual({ done: 0, total: 1 });
  });
});
