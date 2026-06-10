import * as THREE from 'three';
import { buildSheet } from './rasterize';

const cache = new Map();

// key must uniquely identify (frames, palette) — include theme/enrage variants in it.
export function sheetTexture(key, frames, palette) {
  if (cache.has(key)) return cache.get(key);
  const sheet = buildSheet(frames, palette);
  const canvas = document.createElement('canvas');
  canvas.width = sheet.width;
  canvas.height = sheet.height;
  canvas.getContext('2d').putImageData(new ImageData(sheet.data, sheet.width, sheet.height), 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1 / sheet.frames, 1);
  const entry = { tex, frames: sheet.frames, frameWidth: sheet.frameWidth, frameHeight: sheet.height };
  cache.set(key, entry);
  return entry;
}

export const setFrame = (entry, frame) => { entry.tex.offset.x = frame / entry.frames; };
