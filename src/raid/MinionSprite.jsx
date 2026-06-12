// src/raid/MinionSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { MINION_FRAMES, MINION_PALETTE } from './sprites/boss';
import { BOSS_X } from './BossSprite';

const PX = 0.062;

// Slot -> world position. Anchored to BOSS_X so the boss's spawns cluster at
// its feet and travel with it. ArenaScene reuses this to place death poofs
// after a minion's ticket closes and it leaves the list.
export const minionPos = (index) => [BOSS_X - 2.0 + (index % 3) * 0.75, 0.36, 0.6 + Math.floor(index / 3) * 0.7];

export default function MinionSprite({ issue, index }) {
  // Key by slot index mod MINION_CAP (6) so the cache stays bounded at ≤6 entries.
  const entry = useMemo(() => sheetTexture(`minion:v2:${index % 6}`, MINION_FRAMES, MINION_PALETTE), [index]);
  const mesh = useRef();
  const glyph = useRef();
  const born = useRef(null);
  useFrame((state) => {
    if (born.current == null) born.current = state.clock.elapsedTime;
    const age = state.clock.elapsedTime - born.current;
    const pop = Math.min(1, age * 3); // spawn bounce
    mesh.current.scale.setScalar(pop * (1 + Math.sin(age * 3 + index) * 0.04));
    setFrame(entry, Math.floor(state.clock.elapsedTime / 0.5 + index) % 2);
    if (glyph.current) {
      // Summon glyph: the green ring the minion rises out of, gone in ~0.7s.
      const k = Math.min(1, age / 0.7);
      glyph.current.scale.setScalar(0.6 + k * 0.7);
      glyph.current.material.opacity = 0.7 * (1 - k);
    }
  });
  const [x, y, z] = minionPos(index);
  return (
    <group position={[x, y, z]}>
      <mesh ref={glyph} rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + 0.02, 0]}>
        <ringGeometry args={[0.22, 0.28, 24]} />
        <meshBasicMaterial color="#a3e635" transparent opacity={0.7} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={mesh}>
        <planeGeometry args={[10 * PX, 8 * PX]} />
        <meshBasicMaterial map={entry.tex} transparent alphaTest={0.5} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}
