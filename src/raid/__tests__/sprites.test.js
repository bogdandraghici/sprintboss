// src/raid/__tests__/sprites.test.js
import { describe, it, expect } from 'vitest';
import { compose, CLASSES, HEADLESS } from '../sprites/bodies';
import { framesFor, headlessFramesFor, paletteFor, ROSTER, FRAME, headAnchors40For, SPRITE_W, SPRITE_H, artSlugFor, artScaleFor } from '../sprites/roster';
import { BOSS_FRAMES, BOSS_PALETTE, MINION_FRAMES, SLASH, bossFrames } from '../sprites/boss';
import { rasterize } from '../sprites/rasterize';

const FRAME_COUNT = Object.keys(FRAME).length; // 15

describe('compose', () => {
  it('overlays non-transparent chars at an offset, clipping out-of-bounds', () => {
    const out = compose(['....', '....'], ['HH', 'HH'], 3, 0);
    expect(out).toEqual(['...H', '...H']);
  });
});

describe('body + roster frames (40×56 pipeline)', () => {
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
  it('frames stay flat — no auto rim/outline artifacts (mockup look)', () => {
    const idle = framesFor('Serban Chiricescu')[FRAME.IDLE_A];
    expect(idle.every((row) => !row.includes('R'))).toBe(true);
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
  it('erases the head box on every class pose', () => {
    for (const [cls, c] of Object.entries(CLASSES)) {
      c.headBoxes.forEach((b, i) => {
        const hf = HEADLESS[cls][i];
        for (let y = b.y0; y <= b.y1; y++) {
          expect(hf[y].slice(b.x0, b.x1 + 1)).toBe('.'.repeat(b.x1 - b.x0 + 1));
        }
      });
    }
  });
  it('every roster member has 15 head anchors inside the 40×56 grid', () => {
    for (const name of [...Object.keys(ROSTER), 'Unknown Person']) {
      const anchors = headAnchors40For(name);
      expect(anchors).toHaveLength(FRAME_COUNT);
      for (const [cx, cy] of anchors) {
        expect(cx).toBeGreaterThanOrEqual(0);
        expect(cx).toBeLessThanOrEqual(SPRITE_W);
        expect(cy).toBeGreaterThanOrEqual(0);
        expect(cy).toBeLessThanOrEqual(SPRITE_H);
      }
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
  it('cracks land on the body — never floating on transparent pixels', () => {
    const base = bossFrames(0);
    const cracked = bossFrames(3);
    base.forEach((f, fi) => {
      f.forEach((row, y) => {
        [...row].forEach((ch, x) => {
          if (ch === '.') expect(cracked[fi][y][x]).toBe('.');
        });
      });
    });
  });
  it('each frame keeps both 2×2 ember eyes', () => {
    for (const f of bossFrames(0)) {
      expect(f.join('').split('E').length - 1).toBe(32); // 8 eye pixels, ×4 after up2
    }
  });
  it('minion and slash render', () => {
    for (const f of MINION_FRAMES) expect(() => rasterize(f, BOSS_PALETTE)).not.toThrow();
    expect(() => rasterize(SLASH, BOSS_PALETTE)).not.toThrow();
  });
});

describe('artSlugFor', () => {
  it('returns the painted-art slug for the pilot fighter', () => {
    expect(artSlugFor('gabriel.\u200bmuscalu')).toBe('paladin');
    expect(artSlugFor('Mihai Saru')).toBe('mihai');
    expect(artSlugFor('Serban Chiricescu')).toBe('serban');
    expect(artSlugFor('Andra Popazu')).toBe('andra');
    expect(artSlugFor('Corina Ivanov')).toBe('corina');
    expect(artSlugFor('Tiberiu Birloiu')).toBe('tibi');
  });
  it('returns a per-fighter art scale, defaulting to 1', () => {
    expect(artScaleFor('Mihai Saru')).toBe(0.85);
    expect(artScaleFor('gabriel.​muscalu')).toBe(1);
    expect(artScaleFor('Total Stranger')).toBe(1);
  });
  it('returns null for matrix fighters and unknown assignees', () => {
    expect(artSlugFor('Calin Nicoara')).toBe(null);
    expect(artSlugFor('Total Stranger')).toBe(null);
  });
});

describe('class bodies (20×28)', () => {
  const CHARS = '.KSHABPWLG';
  for (const [cls, c] of Object.entries(CLASSES)) {
    it(`${cls}: 6 poses, 20×28, palette-clean`, () => {
      expect(c.poses).toHaveLength(6);
      for (const f of c.poses) {
        expect(f).toHaveLength(28);
        for (const row of f) {
          expect(row).toHaveLength(20);
          for (const ch of row) expect(CHARS).toContain(ch);
        }
      }
    });
    it(`${cls}: head boxes erase cleanly, anchors in bounds, hairAt per pose`, () => {
      expect(c.headBoxes).toHaveLength(6);
      expect(c.headAnchors).toHaveLength(6);
      expect(c.hairAt).toHaveLength(6);
      c.headBoxes.forEach((b, i) => {
        expect(b.x0).toBeLessThanOrEqual(b.x1);
        expect(b.y0).toBeLessThanOrEqual(b.y1);
        const hf = HEADLESS[cls][i];
        for (let y = b.y0; y <= b.y1; y++) {
          expect(hf[y].slice(b.x0, b.x1 + 1)).toBe('.'.repeat(b.x1 - b.x0 + 1));
        }
      });
      for (const [cx, cy] of c.headAnchors) {
        expect(cx).toBeGreaterThanOrEqual(0);
        expect(cx).toBeLessThanOrEqual(19);
        expect(cy).toBeGreaterThanOrEqual(0);
        expect(cy).toBeLessThanOrEqual(27);
      }
      // compose() silently clips out-of-bounds overlays — catch bad anchors here.
      c.hairAt.forEach((h) => {
        if (h !== null) {
          const [x, y] = h;
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x + 8).toBeLessThanOrEqual(19); // hair overlays are 9 wide
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y + 3).toBeLessThanOrEqual(27); // tallest hair is 4 rows
        }
      });
    });
  }
});
