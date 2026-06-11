// src/raid/BossSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { bossFrames, BOSS_FRAME, BOSS_PALETTE } from './sprites/boss';
import { useBossArt, fitPlane, crackSpecs } from './bossArt';
import { addShake } from './shakeBus';
import { frozen } from './timeBus';
import { hueOf } from '../lib';

const PX = 0.064; // matrix fallback: 56x52 -> ≈ 3.6 x 3.3 world units
const BOSS_X = 4.6;
const BODY_W = 56 * PX;
const BODY_H = 52 * PX;
const ART_H = 4.0; // world height for the loaded sprite (width derives from aspect)
const FOOT_DROP = 0.2; // nudge the feet onto the floor baseline (the boss sits back at z, perspective lifts it)

// Deterministic scar spot on the torso, hashed from the issue key, in the
// plane's own w×h so it lands right whether art or matrix is in use.
const scarPos = (key, w, h) => {
  const n = hueOf(key);
  return [((n % 19) / 19 - 0.5) * w * 0.5, h * (0.35 + ((n % 7) / 7) * 0.3) - h / 2];
};

// hit/summon: latest pulse actions. stage: 0..3 crack level (raidState.bossStage).
// scars: [{key, ts, heat}] afterglow of recent hits. tableau: arena narrative state.
export default function BossSprite({ enraged, hit, summon, stage = 0, scars = [], tableau = null }) {
  const dead = tableau === 'victory';
  const art = useBossArt();
  const usingArt = !!art.idle;

  // Matrix fallback sheet — cheap, cached; only rendered when no art is present.
  const palette = useMemo(
    () => (enraged ? { ...BOSS_PALETTE, E: '#ff2222', e: '#7a1010', G: '#ff5d5d', C: '#ffd479' } : BOSS_PALETTE),
    [enraged]
  );
  const entry = useMemo(
    () => sheetTexture(`boss:v8:s${Math.min(stage, 3)}:${enraged ? 'enraged' : 'calm'}`, bossFrames(stage), palette),
    [palette, enraged, stage]
  );

  // Plane dimensions: aspect-fit the loaded sprite, else the matrix proportion.
  const [W, H] = useMemo(() => {
    const img = art.idle?.image;
    if (img) return fitPlane(img.naturalWidth || img.width, img.naturalHeight || img.height, ART_H);
    return [BODY_W, BODY_H];
  }, [art.idle]);
  const planeArgs = useMemo(() => [W, H], [W, H]);

  const group = useRef();
  const mat = useRef();
  const fx = useRef({ hitId: null, flash: 0, kick: 0, summonId: null, cast: 0, death: 0, rumbled: false });

  useFrame((state, rawDt) => {
    const dt = frozen() ? 0 : rawDt;
    const f = fx.current;
    const t = state.clock.elapsedTime;
    if (hit && hit.id !== f.hitId) { f.hitId = hit.id; f.flash = 1; f.kick = 1; }
    if (summon && summon.id !== f.summonId) { f.summonId = summon.id; f.cast = 0.9; }
    f.flash = Math.max(0, f.flash - dt * 3.5);
    f.kick = Math.max(0, f.kick - dt * 2.2);
    f.cast = Math.max(0, f.cast - dt);

    // Death: one big rumble, then sink and fade (rawDt — the crumble ignores hit-stop).
    if (dead) {
      if (!f.rumbled) { f.rumbled = true; addShake(0.9); }
      f.death = Math.min(1.6, f.death + rawDt);
    } else if (f.death > 0) {
      f.death = 0;
      f.rumbled = false;
    }
    const sink = f.death / 1.6;
    mat.current.opacity = 1 - sink;

    const castActive = f.cast > 0;
    if (usingArt) {
      // Swap to the cast pose if one was generated; otherwise the scale below rears it up.
      const want = castActive && art.cast ? art.cast : art.idle;
      if (mat.current.map !== want) { mat.current.map = want; mat.current.needsUpdate = true; }
    } else {
      const breathing = Math.floor(t / 1.1) % 2;
      setFrame(entry, castActive ? BOSS_FRAME.CAST : breathing ? BOSS_FRAME.IDLE_B : BOSS_FRAME.IDLE_A);
    }

    // Flash white on hit + a green wash while casting. Enrage reddens the art
    // by tint (the matrix path reddens via palette swap instead, so skip it).
    // Painted art already carries its own colour — enrage is a gentle warm/angry
    // shift, not a flat red multiply (which would crush the illustration to a blob).
    const redden = usingArt && enraged;
    const r0 = redden ? 1.18 : 1, g0 = redden ? 0.82 : 1, b0 = redden ? 0.78 : 1;
    const w = f.flash * 3;
    mat.current.color.setRGB(r0 + w, g0 + w + (castActive ? 1.0 : 0), b0 + w);

    // Breathing: a subtle UNIFORM scale (no morph) for the painted golem — a
    // heavy creature barely moves. The matrix path breathes via frame swaps, so
    // it stays at 1. A summon with no dedicated pose punches the whole figure up.
    const breath = usingArt ? 1 + 0.008 * Math.sin(t * 1.1) : 1;
    const swagger = tableau === 'defeat' ? 1 + 0.04 * Math.sin(t * 1.4) : 1;
    const castPush = usingArt && castActive && !art.cast ? 0.06 * f.cast : 0;
    const s = swagger * breath * (1 - sink * 0.15) * (1 + castPush);
    group.current.scale.setScalar(s);

    // Anchor at the feet: the plane's bottom stays on the floor as it scales,
    // then sinks under on death. Knockback + flash jitter ride on x.
    group.current.position.y = (s * H) / 2 - FOOT_DROP - sink * H * 0.9;
    group.current.position.x = BOSS_X + f.kick * f.kick * 0.45 + (f.flash > 0 ? (Math.random() - 0.5) * 0.12 : 0);
  });

  return (
    <group ref={group} position={[BOSS_X, H / 2, -0.4]}>
      <mesh>
        <planeGeometry args={planeArgs} />
        <meshBasicMaterial
          ref={mat}
          map={usingArt ? art.idle : entry.tex}
          transparent
          alphaTest={usingArt ? 0.4 : 0.05}
          toneMapped={false}
        />
      </mesh>
      {/* Art path: cracks are scene overlays (the matrix bakes them into the sheet). */}
      {!dead && usingArt && crackSpecs(stage, W, H).map((c, i) => <Crack key={i} c={c} />)}
      {!dead && scars.map((s) => <Scar key={`${s.key}-${s.ts}`} scar={s} w={W} h={H} />)}
      {/* Orbiting debris shards read as junk floating around the painted boss — matrix only. */}
      {!dead && !usingArt && <Shards enraged={enraged} h={H} />}
    </group>
  );
}

// Glowing molten crack through the body — count grows with HP stage.
function Crack({ c }) {
  return (
    <mesh position={[c.x, c.y, 0.02]} rotation={[0, 0, c.rot]}>
      <planeGeometry args={[0.05, c.len]} />
      <meshBasicMaterial color="#ff9d3d" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// Glowing impact mark; brightness = afterglow heat, cooling over the day.
function Scar({ scar, w = BODY_W, h = BODY_H }) {
  const [x, y] = scarPos(scar.key, w, h);
  return (
    <mesh position={[x, y, 0.01]}>
      <circleGeometry args={[0.11, 12]} />
      <meshBasicMaterial color="#ff9d3d" transparent opacity={scar.heat * 0.8} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// Slow-orbiting rock shards — debris caught in the boss's pull.
const SHARDS = [
  { r: 3.2, y: 1.6, s: 0.16, sp: 0.32, ph: 0 },
  { r: 3.6, y: 2.6, s: 0.11, sp: 0.22, ph: 2.1 },
  { r: 2.9, y: 3.4, s: 0.13, sp: 0.41, ph: 4.4 },
];
function Shards({ enraged, h = BODY_H }) {
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    SHARDS.forEach((s, i) => {
      const m = refs.current[i];
      if (!m) return;
      const a = t * s.sp * (enraged ? 1.6 : 1) + s.ph;
      m.position.set(Math.cos(a) * s.r * 0.55, s.y - h / 2 + Math.sin(a * 0.7) * 0.18, Math.sin(a) * 0.5);
      m.rotation.z = a * 0.6;
    });
  });
  return (
    <>
      {SHARDS.map((s, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <planeGeometry args={[s.s, s.s * 0.8]} />
          <meshBasicMaterial color="#5b6b7d" toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
