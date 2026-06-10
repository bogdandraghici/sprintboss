// Circular profile-picture textures for fighter heads. Renders an initials
// disc immediately (same-origin, never blocks), then swaps in the real photo
// once it arrives through the /api/avatar proxy (the Atlassian CDN sends no
// CORS headers, so direct image->canvas use would taint the texture).
import * as THREE from 'three';
import { initials, hueOf } from '../lib';

const SIZE = 96;
const cache = new Map();

function drawDisc(ctx, paint) {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
  ctx.clip();
  paint();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#0d1016';
  ctx.stroke();
}

export function avatarTexture(name, url) {
  const key = `avatar:${name}`;
  if (cache.has(key)) return cache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  drawDisc(ctx, () => {
    ctx.fillStyle = `hsl(${hueOf(name)} 45% 38%)`;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#e8eef4';
    ctx.font = `700 ${Math.round(SIZE * 0.38)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(name), SIZE / 2, SIZE / 2 + 2);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  if (url) {
    const img = new Image();
    img.onload = () => {
      drawDisc(ctx, () => ctx.drawImage(img, 0, 0, SIZE, SIZE));
      tex.needsUpdate = true;
    };
    img.src = `/api/avatar?url=${encodeURIComponent(url)}`;
  }

  cache.set(key, tex);
  return tex;
}
