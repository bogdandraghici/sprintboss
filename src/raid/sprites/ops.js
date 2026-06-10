// Pure frame ops. A frame is an array of equal-length strings; '.' = transparent.
// These run at sheet-build time (once per cache key), not per render frame.

export const up2 = (frame) =>
  frame.flatMap((row) => {
    const wide = [...row].map((ch) => ch + ch).join('');
    return [wide, wide];
  });

export function shift(frame, dx, dy) {
  const w = frame[0].length;
  const h = frame.length;
  const blank = '.'.repeat(w);
  const rows = frame.map((row) =>
    dx === 0 ? row
    : dx > 0 ? ('.'.repeat(dx) + row).slice(0, w)
    : (row + '.'.repeat(-dx)).slice(-w)
  );
  return Array.from({ length: h }, (_, y) => {
    const sy = y - dy;
    return sy >= 0 && sy < h ? rows[sy] : blank;
  });
}

// Dark outline: any transparent pixel 4-touching an opaque pixel becomes outlineCh.
export function outline(frame, outlineCh = 'K') {
  const h = frame.length, w = frame[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : frame[y][x]);
  return frame.map((row, y) =>
    [...row].map((ch, x) => {
      if (ch !== '.') return ch;
      return at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.'
        ? outlineCh : '.';
    }).join('')
  );
}

// 1px rim light on the key-lit side (scene key light sits up-left): any opaque
// non-outline pixel whose left or top neighbour is transparent/outline gets rimCh.
export function rimLight(frame, rimCh = 'R', outlineCh = 'K') {
  const h = frame.length, w = frame[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : frame[y][x]);
  const edge = (ch) => ch === '.' || ch === outlineCh;
  return frame.map((row, y) =>
    [...row].map((ch, x) => {
      if (ch === '.' || ch === outlineCh) return ch;
      return edge(at(x - 1, y)) || edge(at(x, y - 1)) ? rimCh : ch;
    }).join('')
  );
}
