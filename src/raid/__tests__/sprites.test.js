// src/raid/__tests__/sprites.test.js
import { describe, it, expect } from 'vitest';
import { compose, BODY_FRAMES } from '../sprites/bodies';
import { framesFor, paletteFor, ROSTER, FRAME } from '../sprites/roster';
import { BOSS_FRAMES, BOSS_PALETTE, MINION_FRAMES, SLASH } from '../sprites/boss';
import { rasterize } from '../sprites/rasterize';

describe('compose', () => {
  it('overlays non-transparent chars at an offset, clipping out-of-bounds', () => {
    const out = compose(['....', '....'], ['HH', 'HH'], 3, 0);
    expect(out).toEqual(['...H', '...H']); // right column clipped
  });
});

describe('body + roster frames', () => {
  it('every roster member yields 6 equal-sized renderable frames', () => {
    for (const name of [...Object.keys(ROSTER), 'Unknown Person']) {
      const frames = framesFor(name);
      expect(frames).toHaveLength(6);
      for (const f of frames) {
        expect(f).toHaveLength(BODY_FRAMES[FRAME.IDLE_A].length);
        expect(() => rasterize(f, paletteFor(name))).not.toThrow();
      }
    }
  });
  it('unknown names fall back to the recruit look', () => {
    expect(paletteFor('Unknown Person')).toEqual(paletteFor('__recruit__'));
  });
});

describe('boss / minion / slash', () => {
  it('boss frames are renderable and equal-sized', () => {
    for (const f of BOSS_FRAMES) {
      expect(f).toHaveLength(BOSS_FRAMES[0].length);
      expect(() => rasterize(f, BOSS_PALETTE)).not.toThrow();
    }
  });
  it('minion and slash render', () => {
    for (const f of MINION_FRAMES) expect(() => rasterize(f, BOSS_PALETTE)).not.toThrow();
    expect(() => rasterize(SLASH, BOSS_PALETTE)).not.toThrow();
  });
});
