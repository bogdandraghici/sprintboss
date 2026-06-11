// Loads the optional AI-generated boss sprite from /public/boss/. If the files
// aren't present (404), the hook returns nulls and BossSprite falls back to the
// in-code pixel matrix — so the app works today and auto-upgrades the moment a
// PNG is dropped in. See public/boss/README.md for the generation spec.
import { useEffect, useState } from 'react';
import * as THREE from 'three';

export { fitPlane, crackSpecs } from './bossArtMath';

const BASE = '/boss';
const loader = new THREE.TextureLoader();

// Resolve to a crisp pixel texture, or null on any load/decode failure.
function load(url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        // Painted art (not pixel): smooth + mipmapped for a clean downscale to
        // the boss's on-screen size. (Was NearestFilter when we expected pixel
        // sprites — the delivered art is illustrated, so linear reads better.)
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.generateMipmaps = true;
        tex.anisotropy = 4;
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });
}

// { idle, cast } textures (or nulls). cast falls back to idle when absent.
export function useBossArt() {
  const [art, setArt] = useState({ idle: null, cast: null });
  useEffect(() => {
    let live = true;
    Promise.all([load(`${BASE}/idle.png`), load(`${BASE}/cast.png`)]).then(([idle, cast]) => {
      if (live) setArt({ idle, cast: cast || idle });
    });
    return () => {
      live = false;
    };
  }, []);
  return art;
}
