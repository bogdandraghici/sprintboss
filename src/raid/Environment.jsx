// src/raid/Environment.jsx
// The diorama around the fight: parallax ruin silhouettes, light shafts,
// dust motes. Purely decorative.
import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Seeded rand so the backdrop is identical on every mount (retro replays too).
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function silhouetteTexture(seed, color, minH) {
  const rnd = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color;
  let x = 0;
  while (x < 512) {
    const w = 14 + rnd() * 50;
    const h = minH + rnd() * 60;
    g.fillRect(x, 128 - h, w, h);                                // ruined pillar
    if (rnd() > 0.55) g.fillRect(x - 4, 128 - h - 6, w + 8, 6);  // broken cap
    x += w + 6 + rnd() * 30;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function Backdrop() {
  const far = useMemo(() => silhouetteTexture(7, '#0c1320', 30), []);
  const mid = useMemo(() => silhouetteTexture(19, '#101a2b', 50), []);
  return (
    <>
      <mesh position={[0, 2.6, -8]}>
        <planeGeometry args={[34, 6.5]} />
        <meshBasicMaterial map={far} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.2, -5.5]}>
        <planeGeometry args={[28, 5.5]} />
        <meshBasicMaterial map={mid} transparent toneMapped={false} />
      </mesh>
    </>
  );
}

function Shafts() {
  const g = useRef();
  useFrame((state) => {
    g.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.02;
  });
  return (
    <group ref={g}>
      {[-1.5, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 4.5, -3]} rotation={[0, 0, 0.26 - i * 0.05]}>
          <planeGeometry args={[1 + i * 0.4, 11]} />
          <meshBasicMaterial
            color="#9fc2ff" transparent opacity={0.018} toneMapped={false}
            blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

const MOTES = 50;
function Dust() {
  const ref = useRef();
  const seeds = useMemo(() => {
    const rnd = mulberry32(101);
    return Array.from({ length: MOTES }, () => ({
      x: (rnd() - 0.5) * 14, y: rnd() * 5, z: -3 + rnd() * 5,
      v: 0.02 + rnd() * 0.05, w: rnd() * 6.28,
    }));
  }, []);
  const positions = useMemo(() => new Float32Array(MOTES * 3), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    seeds.forEach((s, i) => {
      positions[i * 3] = s.x + Math.sin(t * 0.1 + s.w) * 0.6;
      positions[i * 3 + 1] = (s.y + t * s.v) % 5;
      positions[i * 3 + 2] = s.z;
    });
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={MOTES} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#cfe2ff" transparent opacity={0.35} toneMapped={false} />
    </points>
  );
}

// War banners planted around the battlefield — pixel-art prop, loaded once and
// instanced at a few background spots (behind the action line). Decorative.
const BANNER_SPOTS = [
  { x: -8.0, z: -1.2, h: 3.2 },
  { x: -5.6, z: -2.0, h: 3.4 },
  { x: -3.2, z: -2.8, h: 3.0 },
];
// Objects this far back sit on the y=0 plane but project above the visible
// baseline; drop them so the pole base meets the floor (grows with distance).
const footDrop = (z) => 0.24 * (0.5 - z);
function Banners() {
  const [tex, setTex] = useState(null);
  useEffect(() => {
    const l = new THREE.TextureLoader();
    l.load(
      '/props/banner.png',
      (t) => {
        t.magFilter = THREE.NearestFilter; // pixel art: crisp
        t.minFilter = THREE.NearestMipmapNearestFilter;
        t.generateMipmaps = true;
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      },
      undefined,
      () => {}
    );
  }, []);
  if (!tex) return null;
  const img = tex.image;
  const aspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
  return (
    <>
      {BANNER_SPOTS.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2 - footDrop(s.z), s.z]}>
          <planeGeometry args={[s.h * aspect, s.h]} />
          <meshBasicMaterial map={tex} transparent alphaTest={0.4} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

// Braziers and fog bands cut per the approved mockup — the scene reads as a
// clean dark hall: pillars, banners, a light shaft, drifting motes.
export default function Environment({ enraged = false, lite = false }) {
  return (
    <>
      <Backdrop />
      <Banners />
      {!lite && <Shafts />}
      {!lite && <Dust />}
    </>
  );
}
