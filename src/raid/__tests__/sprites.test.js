// src/raid/__tests__/sprites.test.js
import { describe, it, expect } from 'vitest';
import { compose, BODY_FRAMES, BODY_HEADLESS, HEAD_ANCHORS } from '../sprites/bodies';
import { framesFor, headlessFramesFor, paletteFor, ROSTER, FRAME } from '../sprites/roster';
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

describe('headless (avatar-headed) frames', () => {
  it('every roster member yields 6 equal-sized renderable headless frames', () => {
    for (const name of [...Object.keys(ROSTER), 'Unknown Person']) {
      const frames = headlessFramesFor(name);
      expect(frames).toHaveLength(6);
      for (const f of frames) {
        expect(f).toHaveLength(BODY_FRAMES[FRAME.IDLE_A].length);
        expect(() => rasterize(f, paletteFor(name))).not.toThrow();
      }
    }
  });
  it('erases the head box (idle frame head region is fully transparent)', () => {
    const idle = BODY_HEADLESS[FRAME.IDLE_A];
    for (let y = 0; y <= 6; y++) {
      expect(idle[y].slice(2, 10)).toBe('........');
    }
    // torso untouched
    expect(idle[9]).toBe(BODY_FRAMES[FRAME.IDLE_A][9]);
  });
  it('has one head anchor per frame, inside the 14x20 grid', () => {
    expect(HEAD_ANCHORS).toHaveLength(6);
    for (const [cx, cy] of HEAD_ANCHORS) {
      expect(cx).toBeGreaterThanOrEqual(0);
      expect(cx).toBeLessThanOrEqual(14);
      expect(cy).toBeGreaterThanOrEqual(0);
      expect(cy).toBeLessThanOrEqual(20);
    }
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
