// src/raid/__tests__/sprites.test.js
import { describe, it, expect } from 'vitest';
import { compose, BODY_FRAMES, BODY_HEADLESS, HEAD_ANCHORS } from '../sprites/bodies';
import {
  framesFor, headlessFramesFor, paletteFor, ROSTER, FRAME,
  HEAD_ANCHORS15, SPRITE_W, SPRITE_H,
} from '../sprites/roster';
import { BOSS_FRAMES, BOSS_PALETTE, MINION_FRAMES, SLASH, bossFrames } from '../sprites/boss';
import { rasterize } from '../sprites/rasterize';

const FRAME_COUNT = Object.keys(FRAME).length; // 15

describe('compose', () => {
  it('overlays non-transparent chars at an offset, clipping out-of-bounds', () => {
    const out = compose(['....', '....'], ['HH', 'HH'], 3, 0);
    expect(out).toEqual(['...H', '...H']);
  });
});

describe('body + roster frames (28×40 pipeline)', () => {
  it('every roster member yields 15 equal-sized renderable frames', () => {
    for (const name of [...Object.keys(ROSTER), 'Unknown Person']) {
      const frames = framesFor(name);
      expect(frames).toHaveLength(FRAME_COUNT);
      for (const f of frames) {
        expect(f).toHaveLength(SPRITE_H);
        expect(f[0]).toHaveLength(SPRITE_W);
        expect(() => rasterize(f, paletteFor(name))).not.toThrow();
      }
    }
  });
  it('frames carry the automatic rim-light pass', () => {
    const idle = framesFor('Serban Chiricescu')[FRAME.IDLE_A];
    expect(idle.some((row) => row.includes('R'))).toBe(true);
  });
  it('unknown names fall back to the recruit look', () => {
    expect(paletteFor('Unknown Person')).toEqual(paletteFor('__recruit__'));
  });
});

describe('headless (avatar-headed) frames', () => {
  it('every roster member yields 15 renderable headless frames', () => {
    for (const name of [...Object.keys(ROSTER), 'Unknown Person']) {
      const frames = headlessFramesFor(name);
      expect(frames).toHaveLength(FRAME_COUNT);
      for (const f of frames) expect(() => rasterize(f, paletteFor(name))).not.toThrow();
    }
  });
  it('erases the head box on the base body (idle head region transparent)', () => {
    const idle = BODY_HEADLESS[0];
    for (let y = 0; y <= 6; y++) expect(idle[y].slice(2, 10)).toBe('........');
    expect(idle[9]).toBe(BODY_FRAMES[0][9]); // torso untouched
  });
  it('has one head anchor per FRAME, inside the 28×40 grid', () => {
    expect(HEAD_ANCHORS).toHaveLength(6); // base anchors stay in 14×20 space
    expect(HEAD_ANCHORS15).toHaveLength(FRAME_COUNT);
    for (const [cx, cy] of HEAD_ANCHORS15) {
      expect(cx).toBeGreaterThanOrEqual(0);
      expect(cx).toBeLessThanOrEqual(SPRITE_W);
      expect(cy).toBeGreaterThanOrEqual(0);
      expect(cy).toBeLessThanOrEqual(SPRITE_H);
    }
  });
});

describe('boss / minion / slash', () => {
  it('staged boss frames are renderable, 56×52, and crack progressively', () => {
    for (const stage of [0, 1, 2, 3]) {
      const frames = bossFrames(stage);
      expect(frames).toHaveLength(BOSS_FRAMES.length); // idle A/B + cast
      for (const f of frames) {
        expect(f).toHaveLength(52);
        expect(f[0]).toHaveLength(56);
        expect(() => rasterize(f, BOSS_PALETTE)).not.toThrow();
      }
    }
    const core = (fs) => fs[0].join('').split('O').length;
    expect(core(bossFrames(1))).toBeGreaterThan(core(bossFrames(0)));
    expect(core(bossFrames(3))).toBeGreaterThan(core(bossFrames(1)));
  });
  it('minion and slash render', () => {
    for (const f of MINION_FRAMES) expect(() => rasterize(f, BOSS_PALETTE)).not.toThrow();
    expect(() => rasterize(SLASH, BOSS_PALETTE)).not.toThrow();
  });
});
