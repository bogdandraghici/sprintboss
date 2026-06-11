// src/raid/ArenaScene.jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useState, useEffect, useRef } from 'react';
import { cssVar } from './cssVar';
import { drainShake, addShake } from './shakeBus';
import { addFreeze, drainFreeze } from './timeBus';
import { bossStage, deriveTableau } from './raidState';
import { fighterAuras, fighterBlockHeat, bossScars } from './heat';
import FighterSprite from './FighterSprite';
import BossSprite from './BossSprite';
import MinionSprite, { minionPos } from './MinionSprite';
import FloatNum from './FloatNum';
import SlashFX from './SlashFX';
import ImpactFX from './ImpactFX';
import Effects from './Effects';
import Environment from './Environment';

// ?lite — for TVs that can't hold 60fps: lower dpr, no post chain, fewer particles.
export const LITE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('lite');

// Drains the hit-stop accumulator exactly once per frame; everyone else
// just asks frozen()/freezeLeft().
function TimeKeeper() {
  useFrame((_, dt) => drainFreeze(dt));
  return null;
}

function CameraRig() {
  const { camera } = useThree();
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const shake = drainShake(dt);
    // Eye-height, near side-on (mockup staging): the floor reads as a thin
    // baseline at the fighters' feet, not a ground plane rising behind them.
    camera.position.x = Math.sin(t * 0.07) * 0.55 + (Math.random() - 0.5) * shake * 0.5;
    camera.position.y = 1.5 + Math.sin(t * 0.11) * 0.08 + (Math.random() - 0.5) * shake * 0.35;
    camera.position.z = 9.4;
    camera.lookAt(0, 1.65, 0);
  });
  return null;
}

// Mockup floor: a matte near-bg plane plus a thin light baseline strip at the
// fighters' feet. No reflector — the old mirror painted a warm band that rose
// up behind the party.
function Floor() {
  const color = useMemo(() => cssVar('--panel-2', '#0c1219'), []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.02, 0.5]}>
        <planeGeometry args={[40, 0.05]} />
        <meshBasicMaterial color="#9aa3b5" transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </>
  );
}

const EMBERS = LITE ? 40 : 120;
function Embers({ enraged }) {
  const ref = useRef();
  const seeds = useMemo(() =>
    Array.from({ length: EMBERS }, () => ({
      x: (Math.random() - 0.5) * 16, y: Math.random() * 6, z: (Math.random() - 0.5) * 6,
      v: 0.15 + Math.random() * 0.4, w: Math.random() * 6.28,
    })), []);
  const positions = useMemo(() => new Float32Array(EMBERS * 3), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = enraged ? 2.2 : 1;
    seeds.forEach((s, i) => {
      positions[i * 3] = s.x + Math.sin(t * 0.4 + s.w) * 0.4;
      positions[i * 3 + 1] = (s.y + t * s.v * speed) % 6;
      positions[i * 3 + 2] = s.z;
    });
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={EMBERS} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color={enraged ? '#ff5d5d' : '#ff9d5c'} transparent opacity={0.7} toneMapped={false} />
    </points>
  );
}

export default function ArenaScene({ view, party = [], minions = [], horde = 0, actions = [] }) {
  const enraged = view.stats.enraged;
  const stage = bossStage(view.stats);
  const tableau = deriveTableau(view);

  // Afterglow inputs — pure functions of (events, issues, view.now): retro-safe.
  const auras = useMemo(() => fighterAuras(view.events, view.issues, view.now), [view]);
  const blockHeat = useMemo(() => fighterBlockHeat(view.events, view.issues, view.now), [view]);
  const scars = useMemo(() => bossScars(view.events, view.now), [view]);
  // Planted-sword debris removed in the mockup pass — boss scars + HP segment
  // afterglow already carry the "we closed tickets" signal; the swords just
  // littered the baseline at the smaller sprite scale. heat.js still exports
  // debris() so retro/timeMachine reconstructions stay intact if it comes back.

  const [floats, setFloats] = useState([]);
  const nextFloat = useRef(0);
  const addFloat = (text, color, x, y) =>
    setFloats((fs) => [...fs, { id: nextFloat.current++, text, color, x, y }]);
  const removeFloat = (id) => setFloats((fs) => fs.filter((f) => f.id !== id));

  const [slashes, setSlashes] = useState([]);
  const nextSlash = useRef(0);
  const addSlash = (x) => setSlashes((ss) => [...ss, { id: nextSlash.current++, x }]);
  const removeSlash = (id) => setSlashes((ss) => ss.filter((s) => s.id !== id));

  const [impacts, setImpacts] = useState([]);
  const nextImpact = useRef(0);
  const addImpact = (x, y, color, z = 0.6) =>
    setImpacts((xs) => [...xs, { id: nextImpact.current++, x, y, color, z }]);
  const removeImpact = (id) => setImpacts((xs) => xs.filter((i) => i.id !== id));

  // A minion whose ticket closed vanishes from the list — give it a death poof.
  const prevMinions = useRef([]);
  useEffect(() => {
    const gone = prevMinions.current.filter((p) => !minions.some((m) => m.key === p.key));
    prevMinions.current = minions.map((m, i) => ({ key: m.key, i }));
    for (const g of gone) {
      const [x, , z] = minionPos(g.i);
      addImpact(x, 0.5, '#a3e635', z);
    }
  }, [minions]);

  const hit = actions.find((a) => a.kind === 'attack') || null;
  const summon = actions.find((a) => a.kind === 'summon') || null;
  const summonSeen = useRef(null);
  useEffect(() => {
    if (summon && summon.id !== summonSeen.current) {
      summonSeen.current = summon.id;
      addFloat(`+${summon.points}`, '#a3e635', 4.6, 4.4);
    }
  }, [summon]);

  const strike = (points) => {
    addFreeze(Math.min(0.14, 0.06 + points * 0.01)); // hit-stop scaled to points
    addShake(0.25 + Math.min(0.5, points * 0.08));
    addFloat(`−${points}`, '#7fe7ff', 4.2, 3.6);
    addSlash(3.4);
    addImpact(3.5, 2.2, '#ffd479');
  };

  // Unattributed hits (no owning fighter, e.g. unassigned tickets) still land,
  // and so do hits owned by a downed fighter (FighterSprite ignores attack latches
  // while down): trigger the impact suite directly in both cases.
  const orphanSeen = useRef(null);
  useEffect(() => {
    // Also covers owners who can't swing (downed fighters): the hit still lands.
    const ownerDown = hit && hit.fighter >= 0 && party[hit.fighter]?.status === 'down';
    if (hit && (hit.fighter === -1 || ownerDown) && hit.id !== orphanSeen.current) {
      orphanSeen.current = hit.id;
      strike(hit.points);
    }
  }, [hit]);

  return (
    <Canvas
      dpr={LITE ? 1 : [1, 1.75]}
      camera={{ fov: 35, position: [0, 2.1, 9.4] }}
      gl={{ antialias: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[cssVar('--bg', '#0a0e13')]} />
      <fog attach="fog" args={[cssVar('--bg', '#0a0e13'), 9, 22]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[-4, 5, 4]} intensity={60} color="#7fe7ff" />
      <pointLight position={[4.5, 4, 2]} intensity={enraged ? 110 : 50} color={enraged ? '#ff5d5d' : '#ff9d5c'} />
      <TimeKeeper />
      <CameraRig />
      <Environment enraged={enraged} lite={LITE} />
      <Floor />
      {party.map((f, i) => (
        <FighterSprite
          key={f.name}
          fighter={f}
          phase={i * 0.7}
          attack={actions.find((a) => a.kind === 'attack' && a.fighter === i) || null}
          onStrike={strike}
          aura={auras.get(f.name) || 0}
          beaconHeat={blockHeat.get(f.name) || 0}
          tableau={tableau}
          position={[-8.2 + (i % 5) * 2.2 + Math.floor(i / 5) * 0.6, 0, 0.2 - Math.floor(i / 5) * 0.85]}
        />
      ))}
      <BossSprite
        enraged={enraged} hit={hit} summon={summon}
        stage={stage} scars={scars} tableau={tableau}
      />
      {tableau !== 'victory' && minions.map((m, i) => (
        <MinionSprite key={m.key} issue={m} index={i} horde={i === minions.length - 1 ? horde : 0} />
      ))}
      {floats.map((f) => <FloatNum key={f.id} item={f} onDone={removeFloat} />)}
      {slashes.map((s) => <SlashFX key={s.id} item={s} onDone={removeSlash} />)}
      {impacts.map((im) => <ImpactFX key={im.id} item={im} onDone={removeImpact} />)}
      <Embers enraged={enraged} />
      <Effects enraged={enraged} tableau={tableau} lite={LITE} />
    </Canvas>
  );
}
