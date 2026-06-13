import { describe, it, expect } from 'vitest';
import { firstName, carryoverLabel, ordinal, fmtCountdownBody } from '../lib';

describe('firstName', () => {
  it('takes the first token and capitalizes it', () => {
    expect(firstName('Ada Lovelace')).toBe('Ada');
  });
  it('splits on dots and underscores', () => {
    expect(firstName('grace.hopper')).toBe('Grace');
    expect(firstName('alan_turing')).toBe('Alan');
  });
  it('handles a single lowercase token', () => {
    expect(firstName('linus')).toBe('Linus');
  });
  it('falls back to the whole string when no token splits out', () => {
    expect(firstName('  ')).toBe('  ');
  });
});

describe('carryoverLabel', () => {
  it('is null for a first-sprint ticket (no prior sprints)', () => {
    expect(carryoverLabel([])).toBeNull();
    expect(carryoverLabel(undefined)).toBeNull();
    expect(carryoverLabel(null)).toBeNull();
  });
  it('shows total sprint count: 1 prior sprint -> this is its 2nd', () => {
    expect(carryoverLabel([{ id: 41, name: 'Sprint 41' }])).toBe('×2');
  });
  it('counts multiple priors', () => {
    const priors = [{ id: 39 }, { id: 40 }, { id: 41 }];
    expect(carryoverLabel(priors)).toBe('×4');
  });
});

describe('ordinal', () => {
  it('handles 1st/2nd/3rd/4th', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
  });
  it('handles the teens', () => {
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
  });
});

describe('fmtCountdownBody', () => {
  const D = 86400_000, H = 3600_000, M = 60_000;

  it('formats days + hours', () => {
    expect(fmtCountdownBody(1 * D + 10 * H)).toBe('1d 10h');
  });

  it('formats hours + minutes when under a day', () => {
    expect(fmtCountdownBody(2 * H + 5 * M)).toBe('2h 5m');
  });

  it('formats minutes only when under an hour', () => {
    expect(fmtCountdownBody(7 * M)).toBe('7m');
  });

  it('emits 0m at the zero boundary', () => {
    expect(fmtCountdownBody(0)).toBe('0m');
  });

  it('keeps a zero second field (2h 0m)', () => {
    expect(fmtCountdownBody(2 * H)).toBe('2h 0m');
  });

  it('is sign-independent — never emits "over"', () => {
    expect(fmtCountdownBody(-(1 * D + 10 * H))).toBe('1d 10h');
    expect(fmtCountdownBody(-(7 * M))).not.toMatch(/over/);
  });
});
