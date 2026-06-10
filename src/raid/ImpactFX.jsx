// src/raid/ImpactFX.jsx
// Sparks + expanding shockwave ring at an impact point, ~0.45s. The color makes
// it double as the boss-hit burst (gold) and the minion death poof (lime).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const LIFE = 0.45;
const N = 14;

export default function ImpactFX({ item, onDone }) {
  const ring = useRef();
  const sparks = useRef([]);
  const t = useRef(0);
  const seeds = useMemo(
    () => Array.from({ length: N }, (_, i) => ({
      a: (i / N) * Math.PI * 2 + (i % 3) * 0.21,
      v: 1.6 + (i % 5) * 0.35,
    })),
    []
  );
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current > LIFE) return onDone(item.id);
    const k = t.current / LIFE;
    if (ring.current) {
      ring.current.scale.setScalar(0.4 + k * 2.2);
      ring.current.material.opacity = 0.55 * (1 - k);
    }
    seeds.forEach((s, i) => {
      const m = sparks.current[i];
      if (!m) return;
      const d = s.v * t.current;
      m.position.set(Math.cos(s.a) * d, Math.sin(s.a) * d * 0.7 - 1.2 * t.current * t.current, 0);
      m.material.opacity = 1 - k;
    });
  });
  return (
    <group position={[item.x, item.y, 0.6]}>
      <mesh ref={ring}>
        <ringGeometry args={[0.3, 0.36, 24]} />
        <meshBasicMaterial color={item.color} transparent opacity={0.55} toneMapped={false} depthWrite={false} />
      </mesh>
      {seeds.map((s, i) => (
        <mesh key={i} ref={(el) => (sparks.current[i] = el)}>
          <planeGeometry args={[0.06, 0.06]} />
          <meshBasicMaterial color={item.color} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
