// src/raid/MinionSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { sheetTexture, setFrame } from './sprites/textures';
import { MINION_FRAMES, BOSS_PALETTE } from './sprites/boss';

const PX = 0.09;

export default function MinionSprite({ issue, index, horde = 0 }) {
  // Key by slot index mod MINION_CAP (6) so the cache stays bounded at ≤6 entries.
  const entry = useMemo(
    () => sheetTexture(`minion:${index % 6}`, MINION_FRAMES, BOSS_PALETTE),
    [index]
  );
  const mesh = useRef();
  const born = useRef(null);
  useFrame((state) => {
    if (born.current == null) born.current = state.clock.elapsedTime;
    const age = state.clock.elapsedTime - born.current;
    const pop = Math.min(1, age * 3); // spawn bounce
    mesh.current.scale.setScalar(pop * (1 + Math.sin(age * 3 + index) * 0.04));
    setFrame(entry, Math.floor(state.clock.elapsedTime / 0.5 + index) % 2);
  });
  const x = 2.6 + (index % 3) * 0.75;
  const z = 0.6 + Math.floor(index / 3) * 0.7;
  return (
    <group position={[x, 0.36, z]}>
      <mesh ref={mesh}>
        <planeGeometry args={[10 * PX, 8 * PX]} />
        <meshBasicMaterial map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      {horde > 0 && (
        <Text position={[0.55, 0.3, 0]} fontSize={0.28} color="#a3e635" anchorX="left">
          {`+${horde}`}
        </Text>
      )}
    </group>
  );
}
