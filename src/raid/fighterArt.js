// Loads the optional generated fighter bodies from /public/fighters/. Looks for
// body-1.png .. body-N.png (class variants). If none are present, the hook
// returns [] and FighterSprite falls back to the in-code pixel matrix — so the
// party works today and auto-upgrades when art is dropped in. See
// public/fighters/README.md for the generation spec.
import { useEffect, useState } from 'react';
import * as THREE from 'three';

export { fitPlane, pickVariant } from './fighterArtMath';

const BASE = '/fighters';
const MAX_VARIANTS = 6;
const loader = new THREE.TextureLoader();

function load(url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        // Painted art (matches the boss): smooth + mipmapped for clean downscale.
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

// Array of body-variant textures (in order, missing slots dropped). [] => fallback.
export function useFighterArt() {
  const [bodies, setBodies] = useState([]);
  useEffect(() => {
    let live = true;
    Promise.all(Array.from({ length: MAX_VARIANTS }, (_, i) => load(`${BASE}/body-${i + 1}.png`))).then((arr) => {
      if (live) setBodies(arr.filter(Boolean));
    });
    return () => {
      live = false;
    };
  }, []);
  return bodies;
}
