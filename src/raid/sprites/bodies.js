// src/raid/sprites/bodies.js
// Aggregates the 20×28 class bodies and derives avatar-ready headless variants.
import sword from './classes/sword';
import hammer from './classes/hammer';
import bow from './classes/bow';
import staff from './classes/staff';
import daggers from './classes/daggers';

export function compose(base, overlay, ox, oy) {
  const rows = base.map((r) => [...r]);
  overlay.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const ty = y + oy;
      const tx = x + ox;
      if (ty < 0 || ty >= rows.length || tx < 0 || tx >= rows[0].length) return;
      rows[ty][tx] = ch;
    });
  });
  return rows.map((r) => r.join(''));
}

export const CLASSES = { sword, hammer, bow, staff, daggers };

const eraseHead = (frame, b) =>
  frame.map((row, y) =>
    y < b.y0 || y > b.y1
      ? row
      : [...row].map((ch, x) => (x >= b.x0 && x <= b.x1 ? '.' : ch)).join('')
  );

export const HEADLESS = Object.fromEntries(
  Object.entries(CLASSES).map(([k, c]) => [
    k,
    c.poses.map((f, i) => eraseHead(f, c.headBoxes[i])),
  ])
);
