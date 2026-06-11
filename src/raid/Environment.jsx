// src/raid/Environment.jsx
// The diorama around the fight: parallax ruin silhouettes, light shafts,
// drifting ground fog, flickering braziers, dust motes. Purely decorative.
import { useMemo, useRef } from 'react';
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
      {[-2.5, 0.5, 3.5].map((x, i) => (
        <mesh key={i} position={[x, 4.5, -3]} rotation={[0, 0, 0.28 - i * 0.06]}>
          <planeGeometry args={[0.9 + i * 0.3, 11]} />
          <meshBasicMaterial
            color="#9fc2ff" transparent opacity={0.045} toneMapped={false}
            blending={THREE.AdditiveBlending} depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function FogBands() {
  const a = useRef();
  const b = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    a.current.position.x = Math.sin(t * 0.05) * 1.2;
    b.current.position.x = Math.sin(t * 0.04 + 2) * 1.6;
  });
  return (
    <>
      <mesh ref={a} position={[0, 0.45, 1.6]}>
        <planeGeometry args={[24, 0.9]} />
        <meshBasicMaterial color="#8fa8d8" transparent opacity={0.05} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={b} position={[0, 0.8, -1.5]}>
        <planeGeometry args={[26, 1.3]} />
        <meshBasicMaterial color="#8fa8d8" transparent opacity={0.04} toneMapped={false} depthWrite={false} />
      </mesh>
    </>
  );
}

function Brazier({ x, enraged }) {
  const light = useRef();
  const flame = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flicker = 0.75 + Math.sin(t * 7 + x) * 0.15 + Math.sin(t * 13.7 + x * 2) * 0.1;
    light.current.intensity = (enraged ? 26 : 16) * flicker;
    flame.current.scale.y = 0.8 + flicker * 0.35;
    flame.current.material.opacity = 0.75 + flicker * 0.2;
  });
  return (
    <group position={[x, 0, 1.9]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
        <meshBasicMaterial color="#141a26" />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.3, 0.1, 0.2]} />
        <meshBasicMaterial color="#1c2433" />
      </mesh>
      <mesh ref={flame} position={[0, 1.18, 0]}>
        <coneGeometry args={[0.12, 0.42, 6]} />
        <meshBasicMaterial color={enraged ? '#ff5d5d' : '#ffb15c'} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.3, 0.3]} color={enraged ? '#ff5d5d' : '#ff9d5c'} intensity={16} distance={7} />
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

export default function Environment({ enraged = false, lite = false }) {
  return (
    <>
      <Backdrop />
      {!lite && <Shafts />}
      <FogBands />
      <Brazier x={-6.4} enraged={enraged} />
      <Brazier x={-1.2} enraged={enraged} />
      {!lite && <Dust />}
    </>
  );
}
