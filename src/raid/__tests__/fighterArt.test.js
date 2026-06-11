// src/raid/__tests__/fighterArt.test.js
import { describe, it, expect } from 'vitest';
import { pickVariant } from '../fighterArtMath';

describe('pickVariant', () => {
  it('is stable per name', () => {
    expect(pickVariant('Serban', 3)).toBe(pickVariant('Serban', 3));
    expect(pickVariant('Mihai', 3)).toBe(pickVariant('Mihai', 3));
  });
  it('stays within [0, count)', () => {
    for (const n of ['Serban', 'Mihai', 'Alex', 'Cristina', 'Calin', 'GB', '']) {
      for (const c of [1, 2, 3, 4]) {
        const v = pickVariant(n, c);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(c);
      }
    }
  });
  it('returns 0 when there are no variants', () => {
    expect(pickVariant('Serban', 0)).toBe(0);
  });
  it('spreads names across variants (not all the same bucket)', () => {
    const names = ['Serban', 'Mihai', 'Alex', 'Cristina', 'Calin', 'Andrei', 'Bogdan', 'Radu'];
    const buckets = new Set(names.map((n) => pickVariant(n, 3)));
    expect(buckets.size).toBeGreaterThan(1);
  });
});
