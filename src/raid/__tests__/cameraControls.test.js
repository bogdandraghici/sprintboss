import { describe, it, expect } from 'vitest';
import {
  clampZoom, ease, viewHalf, clampPan, cursorZoomPan, dragToPan, swayFactor,
  ZOOM_MIN, ZOOM_MAX, CONTENT, HOME,
} from '../cameraControls';

describe('clampZoom', () => {
  it('keeps zoom within [MIN, MAX]', () => {
    expect(clampZoom(0.2)).toBe(ZOOM_MIN);
    expect(clampZoom(9)).toBe(ZOOM_MAX);
    expect(clampZoom(2)).toBe(2);
  });
});

describe('ease', () => {
  it('moves toward the target and never overshoots in one step', () => {
    const next = ease(0, 10, 0.016);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });
  it('is a no-op for non-positive dt (resume-safe)', () => {
    expect(ease(3, 9, 0)).toBe(3);
  });
  it('converges to the target over many steps', () => {
    let v = 0;
    for (let i = 0; i < 200; i++) v = ease(v, 5, 0.05);
    expect(v).toBeCloseTo(5, 3);
  });
});

describe('viewHalf', () => {
  it('shrinks the visible extent as zoom increases', () => {
    const a = viewHalf(0.6, 12, 1.7, 1);
    const b = viewHalf(0.6, 12, 1.7, 3);
    expect(b.halfH).toBeLessThan(a.halfH);
    expect(b.halfW).toBeCloseTo(b.halfH * 1.7, 6);
    // zoom 3 sees exactly a third of the height of zoom 1
    expect(a.halfH / b.halfH).toBeCloseTo(3, 6);
  });
});

describe('clampPan', () => {
  it('lets you reach every fighter — pan spans the full content width', () => {
    // leftmost fighter (~-16.5) and the boss side (+6.5) are both reachable
    expect(clampPan({ x: -16.5, y: 0 }).x).toBeCloseTo(-16.5);
    expect(clampPan({ x: 6.5, y: 0 }).x).toBeCloseTo(6.5);
  });
  it('clamps the look-point to the content bounds (offset from HOME)', () => {
    const p = clampPan({ x: -999, y: 999 });
    expect(p.x).toBeCloseTo(CONTENT.xMin - HOME.x);
    expect(p.y).toBeCloseTo(CONTENT.yMax - HOME.y);
    const q = clampPan({ x: 999, y: -999 });
    expect(q.x).toBeCloseTo(CONTENT.xMax - HOME.x);
    expect(q.y).toBeCloseTo(CONTENT.yMin - HOME.y);
  });
});

describe('cursorZoomPan', () => {
  it('does not move pan when cursor is dead-center', () => {
    const p = cursorZoomPan({ x: 1, y: 0.5 }, { x: 0, y: 0 }, { halfW: 8, halfH: 4 }, { halfW: 3, halfH: 1.5 });
    expect(p).toEqual({ x: 1, y: 0.5 });
  });
  it('shifts pan toward an off-center cursor as the view tightens', () => {
    // cursor to the right (ndc.x = 1); zooming in (halfW 8 -> 3) keeps that
    // point fixed by panning right (+).
    const p = cursorZoomPan({ x: 0, y: 0 }, { x: 1, y: 0 }, { halfW: 8, halfH: 4 }, { halfW: 3, halfH: 4 });
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(0);
  });
});

describe('dragToPan', () => {
  it('pans opposite the drag on x and with screen-to-world on y', () => {
    const half = { halfW: 5, halfH: 2.5 };
    // drag right 100px on a 1000px-wide viewport -> world moves -1 (2*5/1000*100)
    const p = dragToPan({ x: 0, y: 0 }, 100, 0, half, 1000, 500);
    expect(p.x).toBeCloseTo(-1);
    // drag down 100px on 500px tall -> +1 world y (up)
    const q = dragToPan({ x: 0, y: 0 }, 0, 100, half, 1000, 500);
    expect(q.y).toBeCloseTo(1);
  });
});

describe('swayFactor', () => {
  it('is full at rest and zero once engaged', () => {
    expect(swayFactor({ x: 0, y: 0 }, ZOOM_MIN)).toBe(1);
    expect(swayFactor({ x: 0, y: 0 }, 2)).toBe(0);
    expect(swayFactor({ x: 8, y: 0 }, ZOOM_MIN)).toBe(0);
  });
});
