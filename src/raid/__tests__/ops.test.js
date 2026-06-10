import { describe, it, expect } from 'vitest';
import { up2, shift, outline, rimLight } from '../sprites/ops';

describe('up2', () => {
  it('doubles every pixel in both axes', () => {
    expect(up2(['.A', 'B.'])).toEqual(['..AA', '..AA', 'BB..', 'BB..']);
  });
});

describe('shift', () => {
  it('moves content right/down, clipping and back-filling with transparency', () => {
    expect(shift(['AB..', 'CD..'], 1, 1)).toEqual(['....', '.AB.']);
  });
  it('moves content left/up', () => {
    expect(shift(['.AB.', '.CD.'], -1, -1)).toEqual(['CD..', '....']);
  });
  it('zero shift is identity', () => {
    expect(shift(['AB'], 0, 0)).toEqual(['AB']);
  });
});

describe('outline', () => {
  it('marks transparent 4-neighbours of opaque pixels, leaves opaque alone', () => {
    expect(outline(['...', '.A.', '...'])).toEqual(['.K.', 'KAK', '.K.']);
  });
  it('clips at the frame edge without throwing', () => {
    expect(outline(['A'])).toEqual(['A']);
  });
});

describe('rimLight', () => {
  it('marks opaque pixels whose left or top neighbour is transparent or outline', () => {
    // 'K' outline is treated as edge; the body pixel behind it gets rim.
    expect(rimLight(['KAA', 'KAA'])).toEqual(['KRR', 'KRA']);
  });
  it('never touches transparent or outline pixels', () => {
    expect(rimLight(['.K.', 'KAK'])).toEqual(['.K.', 'KRK']);
  });
});
