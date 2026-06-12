import { describe, it, expect } from 'vitest';
import { clampArenaHeight, MIN_ARENA_PX, MAX_ARENA_FRACTION } from '../arenaResize';

describe('clampArenaHeight', () => {
  const VH = 1000; // viewport height; max = 700px at MAX_ARENA_FRACTION 0.7

  it('passes an in-range value through unchanged', () => {
    expect(clampArenaHeight(300, VH)).toBe(300);
  });
  it('clamps below the minimum up to MIN_ARENA_PX', () => {
    expect(clampArenaHeight(10, VH)).toBe(MIN_ARENA_PX);
  });
  it('clamps above the maximum down to viewportH * MAX_ARENA_FRACTION', () => {
    expect(clampArenaHeight(5000, VH)).toBe(VH * MAX_ARENA_FRACTION);
  });
  it('returns MIN_ARENA_PX when the viewport is too small for the min (min wins)', () => {
    expect(clampArenaHeight(80, 100)).toBe(MIN_ARENA_PX);
  });
});
