// src/raid/fighterArt.js
// Loads a painted fighter sprite from /public/fighters/<slug>.png, downscaled
// to a VRAM-friendly size (a future 8-10 person roster of 1024x1536 sources
// would be heavy on TV hardware). Returns null while loading or on 404 —
// callers fall back to the pixel-matrix fighter. Same nearest filtering as
// bossArt.js: the art style is chunky pixels.
import { useEffect, useState } from 'react';
import * as THREE from 'three';

const MAX_H = 512;
const cache = new Map(); // slug -> Promise<Texture|null>

function loadScaled(slug) {
  if (cache.has(slug)) return cache.get(slug);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, MAX_H / img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * s));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * s));
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false; // keep the chunky pixels crisp
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestMipmapNearestFilter;
      tex.generateMipmaps = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      resolve(tex);
    };
    img.onerror = () => resolve(null);
    img.src = `/fighters/${slug}.png`;
  });
  cache.set(slug, p);
  return p;
}

// Texture for a slug, or null (loading / absent / no slug).
export function useFighterArt(slug) {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    if (!slug) return undefined;
    let live = true;
    loadScaled(slug).then((t) => { if (live) setTex(t); });
    return () => { live = false; };
  }, [slug]);
  return tex;
}
