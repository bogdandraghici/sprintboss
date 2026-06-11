// src/raid/__tests__/artPose.test.js
import { describe, it, expect } from 'vitest';
import { attackPose, idlePose, victoryPose, STRIKE_AT, ATK_TOTAL, DOWN_ROT, SLUMP } from '../artPose';

describe('attackPose', () => {
  it('starts at rest', () => {
    const p = attackPose(0);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.rot).toBeCloseTo(0, 5);
    expect(p.sy).toBeCloseTo(1, 5);
    expect(p.strike).toBe(false);
  });
  it('anticipation pulls back before the strike', () => {
    const p = attackPose(0.1);
    expect(p.x).toBeLessThan(0);
    expect(p.rot).toBeGreaterThan(0); // lean away from the boss
    expect(p.sy).toBeLessThan(1);     // squash
    expect(p.strike).toBe(false);
  });
  it('strike segment lunges to the matrix lunge distance and flags strike', () => {
    const p = attackPose(STRIKE_AT + 0.01);
    expect(p.x).toBeCloseTo(0.55, 5);
    expect(p.strike).toBe(true);
  });
  it('recovery eases back to rest, then the pose ends', () => {
    const end = attackPose(ATK_TOTAL - 0.001);
    expect(Math.abs(end.x)).toBeLessThan(0.02);
    expect(end.strike).toBe(false);
    expect(attackPose(ATK_TOTAL)).toBeNull();
    expect(attackPose(99)).toBeNull();
  });
  it('is continuous at segment boundaries (no visual pops)', () => {
    for (const b of [0.12, STRIKE_AT, 0.32, 0.44]) {
      const before = attackPose(b - 0.001), after = attackPose(b + 0.001);
      expect(Math.abs(after.x - before.x)).toBeLessThan(0.75); // lunge jump is the only big step
      expect(Math.abs(after.sy - before.sy)).toBeLessThan(0.15);
    }
  });
});

describe('idlePose', () => {
  it('breath and sway stay within calm bounds', () => {
    for (let t = 0; t < 10; t += 0.1) {
      const p = idlePose(t, 1.4);
      expect(p.sy).toBeGreaterThan(0.987);
      expect(p.sy).toBeLessThan(1.013);
      expect(Math.abs(p.rot)).toBeLessThanOrEqual(0.01);
    }
  });
});

describe('victoryPose', () => {
  it('hops without going underground', () => {
    for (let t = 0; t < 6; t += 0.05) {
      const p = victoryPose(t, 0.7);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.sy).toBeGreaterThan(0.9);
      expect(p.sy).toBeLessThan(1.08);
    }
  });
});

describe('state constants', () => {
  it('down lays the body out; slump is subtle', () => {
    expect(DOWN_ROT).toBeGreaterThan(1.2); // ≈75°
    expect(DOWN_ROT).toBeLessThan(1.45);
    expect(SLUMP.rot).toBeLessThan(0.15);
    expect(SLUMP.sy).toBeLessThan(1);
  });
});
