import { describe, it, expect } from 'vitest';
import { discoveryPhase, CUE_PERIOD_MS, CUE_WINDOW_MS, STANDUP_HINT } from '../discoveryCue';

const OPTS = { periodMs: 100, windowMs: 10 }; // window = last 10ms of every 100ms

describe('discoveryPhase', () => {
  it('is quiet at elapsed 0 (no flash on entering ambient)', () => {
    expect(discoveryPhase(0, OPTS)).toBe(false);
  });
  it('is quiet through the bulk of the period', () => {
    expect(discoveryPhase(50, OPTS)).toBe(false);
    expect(discoveryPhase(89, OPTS)).toBe(false);
  });
  it('is on during the end-of-period window', () => {
    expect(discoveryPhase(90, OPTS)).toBe(true);
    expect(discoveryPhase(99, OPTS)).toBe(true);
  });
  it('wraps correctly into the next period', () => {
    expect(discoveryPhase(100, OPTS)).toBe(false); // start of period 2 — quiet
    expect(discoveryPhase(195, OPTS)).toBe(true);  // window of period 2
  });
  it('windowMs >= periodMs means always on', () => {
    expect(discoveryPhase(0, { periodMs: 100, windowMs: 100 })).toBe(true);
    expect(discoveryPhase(50, { periodMs: 100, windowMs: 200 })).toBe(true);
  });
  it('periodMs <= 0 is always false (guard)', () => {
    expect(discoveryPhase(50, { periodMs: 0, windowMs: 10 })).toBe(false);
    expect(discoveryPhase(50, { periodMs: -5, windowMs: 10 })).toBe(false);
  });
});

describe('constants', () => {
  it('period and window are positive, window shorter than period', () => {
    expect(CUE_PERIOD_MS).toBeGreaterThan(0);
    expect(CUE_WINDOW_MS).toBeGreaterThan(0);
    expect(CUE_WINDOW_MS).toBeLessThan(CUE_PERIOD_MS);
  });
  it('STANDUP_HINT is a non-empty string mentioning standup', () => {
    expect(typeof STANDUP_HINT).toBe('string');
    expect(STANDUP_HINT.length).toBeGreaterThan(8);
    expect(STANDUP_HINT.toLowerCase()).toContain('standup');
  });
});
