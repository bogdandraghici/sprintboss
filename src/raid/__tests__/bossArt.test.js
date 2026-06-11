// src/raid/__tests__/bossArt.test.js
import { describe, it, expect } from 'vitest';
import { fitPlane, crackSpecs } from '../bossArtMath';

describe('fitPlane', () => {
  it('preserves aspect ratio at the target height', () => {
    expect(fitPlane(200, 100, 4)).toEqual([8, 4]); // 2:1 -> width 8 at height 4
    expect(fitPlane(100, 100, 3.6)).toEqual([3.6, 3.6]); // square
  });
  it('falls back to a square when height is missing', () => {
    expect(fitPlane(200, 0, 4)).toEqual([4, 4]);
  });
});

describe('crackSpecs', () => {
  it('emits one streak per HP stage, clamped to 0..3', () => {
    expect(crackSpecs(0, 4, 4)).toHaveLength(0);
    expect(crackSpecs(2, 4, 4)).toHaveLength(2);
    expect(crackSpecs(3, 4, 4)).toHaveLength(3);
    expect(crackSpecs(9, 4, 4)).toHaveLength(3);
  });
  it('scales crack positions and length with the plane', () => {
    const [c] = crackSpecs(1, 10, 20);
    expect(Math.abs(c.x)).toBeLessThanOrEqual(5); // within ±w/2
    expect(Math.abs(c.y)).toBeLessThanOrEqual(10); // within ±h/2
    expect(c.len).toBeGreaterThan(0);
    expect(c.len).toBeLessThanOrEqual(20);
  });
});
