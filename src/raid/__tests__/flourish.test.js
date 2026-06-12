// src/raid/__tests__/flourish.test.js
import { describe, it, expect } from 'vitest';
import { hash01, flourishGap, newFlourish, stepFlourish, flourishEligible, FLOURISH_MIN, FLOURISH_MAX } from '../flourish';

const ATK = 0.6;

describe('hash01', () => {
  it('stays in [0,1)', () => {
    for (let a = 0; a < 20; a++) for (let b = 0; b < 20; b++) {
      const v = hash01(a, b);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('is deterministic', () => {
    expect(hash01(3, 7)).toBe(hash01(3, 7));
  });
});

describe('flourishGap', () => {
  it('stays within the configured window', () => {
    for (let seed = 0; seed < 10; seed++) for (let n = 0; n < 10; n++) {
      const g = flourishGap(seed, n);
      expect(g).toBeGreaterThanOrEqual(FLOURISH_MIN);
      expect(g).toBeLessThanOrEqual(FLOURISH_MAX);
    }
  });
  it('different seeds desync (no two fighters share a first gap)', () => {
    const gaps = Array.from({ length: 8 }, (_, i) => flourishGap(i * 0.7, 0));
    expect(new Set(gaps).size).toBe(gaps.length);
  });
});

describe('flourishEligible', () => {
  it('lets fighting and resting fighters shadow-box', () => {
    expect(flourishEligible('fighting', null)).toBe(true);
    expect(flourishEligible('resting', null)).toBe(true);
  });
  it('excludes the spent: down and exhausted', () => {
    expect(flourishEligible('down', null)).toBe(false);
    expect(flourishEligible('exhausted', null)).toBe(false);
  });
  it('victory owns the moment (its own hop) — no flourish', () => {
    expect(flourishEligible('fighting', 'victory')).toBe(false);
  });
  it('defeat/overrun does NOT suppress it — the team is still grinding', () => {
    expect(flourishEligible('fighting', 'defeat')).toBe(true);
    expect(flourishEligible('resting', 'defeat')).toBe(true);
    // ...but an individually-spent fighter still sits out, defeat or not
    expect(flourishEligible('exhausted', 'defeat')).toBe(false);
  });
});

describe('stepFlourish', () => {
  it('waits, then plays the full swing, then waits again', () => {
    const s = newFlourish();
    const seed = 0.7;
    const gap = flourishGap(seed, 0);
    // Before the gap elapses: nothing.
    let out = stepFlourish(s, gap - 0.1, seed, ATK, true);
    expect(out).toBeNull();
    // Crossing the gap kicks off the swing at t≈0.
    out = stepFlourish(s, 0.2, seed, ATK, true);
    expect(out).toBeCloseTo(0, 5);
    expect(s.phase).toBe('play');
    // Swing advances by dt and reports its local time.
    out = stepFlourish(s, 0.3, seed, ATK, true);
    expect(out).toBeCloseTo(0.3, 5);
    // Past atkTotal it ends and returns to waiting.
    out = stepFlourish(s, ATK, seed, ATK, true);
    expect(out).toBeNull();
    expect(s.phase).toBe('wait');
    expect(s.count).toBe(1);
  });

  it('returns null and resets a swing in progress when disabled', () => {
    const s = newFlourish();
    const seed = 1.4;
    stepFlourish(s, flourishGap(seed, 0) + 0.05, seed, ATK, true); // now playing
    expect(s.phase).toBe('play');
    const out = stepFlourish(s, 0.1, seed, ATK, false);
    expect(out).toBeNull();
    expect(s.phase).toBe('wait');
    expect(s.timer).toBe(0);
  });

  it('never plays two swings back-to-back without a wait', () => {
    const s = newFlourish();
    const seed = 2.1;
    let plays = 0, justEnded = false;
    for (let i = 0; i < 4000; i++) {
      const out = stepFlourish(s, 0.05, seed, ATK, true);
      if (out === 0) {
        plays++;
        // a brand-new swing must not start the same step a previous one ended
        expect(justEnded).toBe(false);
      }
      justEnded = s.phase === 'wait' && s.timer === 0 && out === null;
    }
    expect(plays).toBeGreaterThan(5); // it actually fires repeatedly over time
  });
});
