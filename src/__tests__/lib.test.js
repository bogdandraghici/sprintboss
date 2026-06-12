import { describe, it, expect } from 'vitest';
import { firstName, carryoverLabel, ordinal } from '../lib';

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
