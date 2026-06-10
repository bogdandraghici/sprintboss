// src/raid/__tests__/rasterize.test.js
import { describe, it, expect } from 'vitest';
import { rasterize, buildSheet } from '../sprites/rasterize';

const palette = { X: '#ff0000', O: '#00ff00' };

describe('rasterize', () => {
  it('maps chars to RGBA and "." to transparent', () => {
    const { width, height, data } = rasterize(['X.', '.O'], palette);
    expect([width, height]).toEqual([2, 2]);
    expect([...data.slice(0, 4)]).toEqual([255, 0, 0, 255]); // X
    expect(data[7]).toBe(0);                                  // '.' alpha
    expect([...data.slice(12, 16)]).toEqual([0, 255, 0, 255]); // O
  });
  it('throws on ragged rows and unknown chars', () => {
    expect(() => rasterize(['XX', 'X'], palette)).toThrow(/width/);
    expect(() => rasterize(['Z'], palette)).toThrow(/palette/);
  });
});

describe('buildSheet', () => {
  it('lays frames out horizontally', () => {
    const sheet = buildSheet([['X'], ['O']], palette);
    expect(sheet).toMatchObject({ width: 2, height: 1, frameWidth: 1, frames: 2 });
    expect([...sheet.data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...sheet.data.slice(4, 8)]).toEqual([0, 255, 0, 255]);
  });
  it('rejects mismatched frame sizes', () => {
    expect(() => buildSheet([['X'], ['OO']], palette)).toThrow(/mismatch/);
  });
});
