// Loads the optional generated fighter bodies from /public/fighters/. Reads
// bodies.json (written by scripts/fit-fighters.py) for the per-body neck anchor
// + aspect, then loads each body-N.png. No manifest/files -> [] and the party
// falls back to the in-code pixel matrix. See public/fighters/README.md.
import { useEffect, useState } from 'react';
import * as THREE from 'three';

export { pickVariant } from './fighterArtMath';

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

// Array of { tex, neck:[xFrac,yFrac], aspect } in variant order. [] => fallback.
export function useFighterArt() {
  const [bodies, setBodies] = useState([]);
  useEffect(() => {
    let live = true;
    (async () => {
      let manifest = null;
      try {
        const r = await fetch(`${BASE}/bodies.json`);
        if (r.ok) manifest = await r.json();
      } catch {
        /* no manifest — probe with defaults below */
      }
      const entries =
        manifest?.bodies?.length
          ? manifest.bodies.map((b) => ({ file: b.file, neck: b.neck || [0.5, 0], aspect: b.aspect || null }))
          : Array.from({ length: MAX_VARIANTS }, (_, i) => ({ file: `body-${i + 1}.png`, neck: [0.5, 0], aspect: null }));

      const loaded = await Promise.all(
        entries.map(async (e) => {
          const tex = await load(`${BASE}/${e.file}`);
          return tex ? { tex, neck: e.neck, aspect: e.aspect } : null;
        })
      );
      if (live) setBodies(loaded.filter(Boolean));
    })();
    return () => {
      live = false;
    };
  }, []);
  return bodies;
}
