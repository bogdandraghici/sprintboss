import { describe, it, expect } from 'vitest';
import { firstName } from '../lib';

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
