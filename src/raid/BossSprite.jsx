// src/raid/BossSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { bossFrames, BOSS_FRAME, BOSS_PALETTE } from './sprites/boss';
import { addShake } from './shakeBus';
import { frozen } from './timeBus';
import { hueOf } from '../lib';

const PX = 0.095; // 56x52 -> ≈ 5.3 x 4.9 world units
export const BOSS_X = 4.6;
const BODY_W = 56 * PX;
const BODY_H = 52 * PX;

// Deterministic scar spot on the torso, hashed from the issue key.
const scarPos = (key) => {
  const h = hueOf(key);
  return [
    ((h % 19) / 19 - 0.5) * BODY_W * 0.5,
    BODY_H * (0.35 + ((h % 7) / 7) * 0.3) - BODY_H / 2,
  ];
};

// hit/summon: latest pulse actions. stage: 0..3 crack level (raidState.bossStage).
// scars: [{key, ts, heat}] afterglow of recent hits. dead: tableau === 'victory'.
export default function BossSprite({ enraged, hit, summon, stage = 0, scars = [], dead = false }) {
  const palette = useMemo(
    () => (enraged ? { ...BOSS_PALETTE, E: '#ff2222', G: '#ff5d5d', C: '#ffd479' } : BOSS_PALETTE),
    [enraged]
  );
  const entry = useMemo(
    () => sheetTexture(`boss:v2:s${Math.min(stage, 3)}:${enraged ? 'enraged' : 'calm'}`, bossFrames(stage), palette),
    [palette, enraged, stage]
  );
  const group = useRef();
  const mat = useRef();
  const fx = useRef({ hitId: null, flash: 0, kick: 0, summonId: null, cast: 0, death: 0, rumbled: false });

  useFrame((state, rawDt) => {
    const dt = frozen() ? 0 : rawDt;
    const f = fx.current;
    if (hit && hit.id !== f.hitId) { f.hitId = hit.id; f.flash = 1; f.kick = 1; }
    if (summon && summon.id !== f.summonId) { f.summonId = summon.id; f.cast = 0.9; }
    f.flash = Math.max(0, f.flash - dt * 3.5);
    f.kick = Math.max(0, f.kick - dt * 2.2);
    f.cast = Math.max(0, f.cast - dt);

    // Death: one big rumble, then sink and fade (rawDt — the crumble ignores hit-stop).
    if (dead) {
      if (!f.rumbled) { f.rumbled = true; addShake(0.9); }
      f.death = Math.min(1.6, f.death + rawDt);
    }
    const sink = f.death / 1.6;
    group.current.position.y = BODY_H / 2 - sink * BODY_H * 0.9;
    mat.current.opacity = 1 - sink;

    const breathing = Math.floor(state.clock.elapsedTime / 1.1) % 2;
    setFrame(entry, f.cast > 0 ? BOSS_FRAME.CAST : breathing ? BOSS_FRAME.IDLE_B : BOSS_FRAME.IDLE_A);
    // White flash on hit; green wash while casting a summon.
    const w = 1 + f.flash * 3;
    mat.current.color.setRGB(w, w + (f.cast > 0 ? 1.2 : 0), w);
    // Knockback eases out; flash keeps the old jitter on top.
    group.current.position.x = BOSS_X + f.kick * f.kick * 0.45 + (f.flash > 0 ? (Math.random() - 0.5) * 0.12 : 0);
  });

  return (
    <group ref={group} position={[BOSS_X, BODY_H / 2, -0.4]}>
      <mesh>
        <planeGeometry args={[BODY_W, BODY_H]} />
        <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      {!dead && scars.map((s) => <Scar key={`${s.key}-${s.ts}`} scar={s} />)}
    </group>
  );
}

// Glowing impact mark; brightness = afterglow heat, cooling over the day.
function Scar({ scar }) {
  const [x, y] = scarPos(scar.key);
  return (
    <mesh position={[x, y, 0.01]}>
      <circleGeometry args={[0.11, 12]} />
      <meshBasicMaterial color="#ff9d3d" transparent opacity={scar.heat * 0.8} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
