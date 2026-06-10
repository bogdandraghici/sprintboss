// src/raid/SlashFX.jsx
// Brief slash arc at the impact point; rotates and fades over 0.25s.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture } from './sprites/textures';
import { SLASH, BOSS_PALETTE } from './sprites/boss';

export default function SlashFX({ item, onDone }) {
  const entry = useMemo(() => sheetTexture('slash', [SLASH], BOSS_PALETTE), []);
  const mesh = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (t.current > 0.25) return onDone(item.id);
    const k = t.current / 0.25;
    mesh.current.rotation.z = -0.6 + k * 1.2;
    mesh.current.material.opacity = 1 - k;
    mesh.current.scale.setScalar(0.8 + k * 0.6);
  });
  return (
    <mesh ref={mesh} position={[item.x, 2.2, 0.5]}>
      <planeGeometry args={[1.1, 1.1]} />
      <meshBasicMaterial map={entry.tex} transparent opacity={1} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
