// src/raid/BossSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { BOSS_FRAMES, BOSS_FRAME, BOSS_PALETTE } from './sprites/boss';

const PX = 0.16; // 28x26 -> ≈ 4.5 x 4.2 world units

// hit: {id} latest landed strike; summon: {id} latest scope-add.
export default function BossSprite({ enraged, hit, summon }) {
  const palette = useMemo(
    () => (enraged ? { ...BOSS_PALETTE, E: '#ff2222', G: '#ff5d5d', C: '#ffd479' } : BOSS_PALETTE),
    [enraged]
  );
  const entry = useMemo(
    () => sheetTexture(`boss:${enraged ? 'enraged' : 'calm'}`, BOSS_FRAMES, palette),
    [palette, enraged]
  );
  const mat = useRef();
  const mesh = useRef();
  const fx = useRef({ hitId: null, flash: 0, summonId: null, cast: 0 });

  useFrame((state, dt) => {
    const f = fx.current;
    if (hit && hit.id !== f.hitId) { f.hitId = hit.id; f.flash = 1; }
    if (summon && summon.id !== f.summonId) { f.summonId = summon.id; f.cast = 0.9; }
    f.flash = Math.max(0, f.flash - dt * 3.5);
    f.cast = Math.max(0, f.cast - dt);
    const breathing = Math.floor(state.clock.elapsedTime / 1.1) % 2;
    setFrame(entry, f.cast > 0 ? BOSS_FRAME.CAST : breathing ? BOSS_FRAME.IDLE_B : BOSS_FRAME.IDLE_A);
    // White flash on hit; green wash while casting a summon.
    const w = 1 + f.flash * 3;
    mat.current.color.setRGB(w, w + (f.cast > 0 ? 1.2 : 0), w);
    mesh.current.position.x = 4.6 + (f.flash > 0 ? (Math.random() - 0.5) * 0.12 : 0);
  });

  return (
    <mesh ref={mesh} position={[4.6, PX * 13, -0.4]}>
      <planeGeometry args={[28 * PX, 26 * PX]} />
      <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
    </mesh>
  );
}
