// src/raid/sprites/rasterize.js
// A frame is an array of equal-length strings; each char indexes the palette.
// '.' is always transparent. Returns plain typed arrays so this stays testable in node.

export function rasterize(frame, palette) {
  const h = frame.length;
  const w = frame[0].length;
  const data = new Uint8ClampedArray(w * h * 4);
  frame.forEach((row, y) => {
    if (row.length !== w) throw new Error(`row ${y} width ${row.length} != ${w}`);
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const hex = palette[ch];
      if (!hex) throw new Error(`no palette entry for '${ch}'`);
      if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) throw new Error(`palette '${ch}' must be #rrggbb or #rrggbbaa, got '${hex}'`);
      const i = (y * w + x) * 4;
      data[i] = parseInt(hex.slice(1, 3), 16);
      data[i + 1] = parseInt(hex.slice(3, 5), 16);
      data[i + 2] = parseInt(hex.slice(5, 7), 16);
      data[i + 3] = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) : 255;
    });
  });
  return { width: w, height: h, data };
}

export function buildSheet(frames, palette) {
  const rasters = frames.map((f) => rasterize(f, palette));
  const fw = rasters[0].width;
  const fh = rasters[0].height;
  const data = new Uint8ClampedArray(fw * frames.length * fh * 4);
  rasters.forEach((r, fi) => {
    if (r.width !== fw || r.height !== fh) throw new Error(`frame ${fi} size mismatch: expected ${fw}x${fh}, got ${r.width}x${r.height}`);
    for (let y = 0; y < fh; y++) {
      const src = y * fw * 4;
      data.set(r.data.subarray(src, src + fw * 4), (y * fw * frames.length + fi * fw) * 4);
    }
  });
  return { width: fw * frames.length, height: fh, frameWidth: fw, frames: frames.length, data };
}
