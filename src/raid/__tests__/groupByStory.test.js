import { describe, it, expect } from 'vitest';
import { groupByStory, storyColor, STORY_PALETTE } from '../raidState';

// Minimal issue factory: only the fields groupByStory reads.
const mk = (key, parentKey, parentName, columnSince) => ({
  key, parentKey, parentName, columnSince,
});

describe('storyColor', () => {
  it('is deterministic and stable for given keys', () => {
    expect(storyColor('SB-900')).toBe(storyColor('SB-900'));
    // Pin concrete values so an accidental hash change is caught.
    const a = storyColor('SB-900');
    const b = storyColor('SB-901');
    expect(STORY_PALETTE).toContain(a);
    expect(STORY_PALETTE).toContain(b);
    expect(typeof a).toBe('string');
  });
  it('always returns a palette entry', () => {
    for (const k of ['SB-900', 'SB-901', 'AB-1', 'ZZ-9999']) {
      expect(STORY_PALETTE).toContain(storyColor(k));
    }
  });
});

describe('groupByStory', () => {
  it('returns empty groups for empty input', () => {
    const { stories, other } = groupByStory([]);
    expect(stories).toEqual([]);
    expect(other).toEqual([]);
  });

  it('makes a cluster for a story with 2+ tickets in the column', () => {
    const issues = [
      mk('A-1', 'P-1', 'Alpha', 10),
      mk('A-2', 'P-1', 'Alpha', 20),
    ];
    const { stories, other } = groupByStory(issues);
    expect(stories).toHaveLength(1);
    expect(stories[0].key).toBe('P-1');
    expect(stories[0].name).toBe('Alpha');
    expect(stories[0].color).toBe(storyColor('P-1'));
    expect(stories[0].issues.map((i) => i.key)).toEqual(['A-1', 'A-2']);
    expect(other).toHaveLength(0);
  });

  it('gives a single-ticket story its own cluster (never folds into other)', () => {
    const issues = [
      mk('A-1', 'P-1', 'Alpha', 10),
      mk('A-2', 'P-1', 'Alpha', 20),
      mk('B-1', 'P-2', 'Beta', 5),
    ];
    const { stories, other } = groupByStory(issues);
    // P-2 (stalest = 5) sorts ahead of P-1 (stalest = 10); both are clusters.
    expect(stories.map((s) => s.key)).toEqual(['P-2', 'P-1']);
    expect(stories.find((s) => s.key === 'P-2').issues.map((i) => i.key)).toEqual(['B-1']);
    expect(other).toHaveLength(0);
  });

  it('puts parentless tickets into other', () => {
    const issues = [mk('A-1', null, null, 10), mk('A-2', null, null, 20)];
    const { stories, other } = groupByStory(issues);
    expect(stories).toHaveLength(0);
    expect(other.map((i) => i.key)).toEqual(['A-1', 'A-2']);
  });

  it('orders story clusters worst-first by their stalest member', () => {
    // smaller columnSince = entered earlier = staler
    const issues = [
      mk('A-1', 'P-1', 'Alpha', 100), mk('A-2', 'P-1', 'Alpha', 110), // stalest = 100
      mk('B-1', 'P-2', 'Beta', 50), mk('B-2', 'P-2', 'Beta', 60),     // stalest = 50
    ];
    const { stories } = groupByStory(issues);
    expect(stories.map((s) => s.key)).toEqual(['P-2', 'P-1']);
  });

  it('other holds only parentless tickets, sorted by staleness (columnSince asc)', () => {
    const issues = [
      mk('A-1', 'P-1', 'Alpha', 10), mk('A-2', 'P-1', 'Alpha', 20), // cluster
      mk('S-1', 'P-9', 'Single', 30), // single-ticket story -> its own cluster, NOT other
      mk('O-2', null, null, 40),       // parentless
      mk('O-1', null, null, 5),        // parentless, stalest
    ];
    const { stories, other } = groupByStory(issues);
    expect(stories.map((s) => s.key).sort()).toEqual(['P-1', 'P-9']);
    expect(other.map((i) => i.key)).toEqual(['O-1', 'O-2']); // parentless only, 5 before 40
  });

  it('falls back to the parent key as name when parentName is missing', () => {
    const issues = [mk('A-1', 'P-1', null, 10), mk('A-2', 'P-1', null, 20)];
    const { stories } = groupByStory(issues);
    expect(stories[0].name).toBe('P-1');
  });
});
