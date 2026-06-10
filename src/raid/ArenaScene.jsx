// src/raid/ArenaScene.jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useMemo, useState, useEffect, useRef } from 'react';
import { cssVar } from './cssVar';
import { drainShake, addShake } from './shakeBus';
import FighterSprite from './FighterSprite';
import BossSprite from './BossSprite';
import MinionSprite from './MinionSprite';
import FloatNum from './FloatNum';
import Effects from './Effects';

function CameraRig() {
  const { camera } = useThree();
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const shake = drainShake(dt);
    camera.position.x = Math.sin(t * 0.07) * 0.55 + (Math.random() - 0.5) * shake * 0.5;
    camera.position.y = 2.1 + Math.sin(t * 0.11) * 0.12 + (Math.random() - 0.5) * shake * 0.35;
    camera.position.z = 9.4;
    camera.lookAt(0, 1.5, 0);
  });
  return null;
}

function Floor() {
  const color = useMemo(() => cssVar('--panel', '#101822'), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 24]} />
      <MeshReflectorMaterial
        blur={[300, 80]} resolution={512} mixBlur={0.9} mixStrength={6}
        roughness={0.85} depthScale={1.1} color={color} metalness={0.25}
      />
    </mesh>
  );
}

const EMBERS = 120;
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

  const [floats, setFloats] = useState([]);
  const nextFloat = useRef(0);
  const addFloat = (text, color, x, y) =>
    setFloats((fs) => [...fs, { id: nextFloat.current++, text, color, x, y }]);
  const removeFloat = (id) => setFloats((fs) => fs.filter((f) => f.id !== id));

  const hit = actions.find((a) => a.kind === 'attack') || null;
  const summon = actions.find((a) => a.kind === 'summon') || null;
  const summonSeen = useRef(null);
  useEffect(() => {
    if (summon && summon.id !== summonSeen.current) {
      summonSeen.current = summon.id;
      addFloat(`+${summon.points}`, '#a3e635', 4.6, 4.4);
    }
  }, [summon]);

  // Unattributed hits (no owning fighter, e.g. unassigned tickets) still land:
  // no sprite swings, so spawn the damage number + shake directly.
  const orphanSeen = useRef(null);
  useEffect(() => {
    if (hit && hit.fighter === -1 && hit.id !== orphanSeen.current) {
      orphanSeen.current = hit.id;
      addShake(0.25 + Math.min(0.5, hit.points * 0.08));
      addFloat(`−${hit.points}`, '#7fe7ff', 4.2, 3.6);
    }
  }, [hit]);

  const onStrike = (points, x) => {
    addShake(0.25 + Math.min(0.5, points * 0.08));
    addFloat(`−${points}`, '#7fe7ff', 4.2, 3.6);
  };

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 35, position: [0, 2.1, 9.4] }}
      gl={{ antialias: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[cssVar('--bg', '#0a0e13')]} />
      <fog attach="fog" args={[cssVar('--bg', '#0a0e13'), 9, 22]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[-4, 5, 4]} intensity={60} color="#7fe7ff" />
      <pointLight position={[4.5, 4, 2]} intensity={enraged ? 110 : 50} color={enraged ? '#ff5d5d' : '#ff9d5c'} />
      <CameraRig />
      <Floor />
      {party.map((f, i) => (
        <FighterSprite
          key={f.name}
          fighter={f}
          phase={i * 0.7}
          attack={actions.find((a) => a.kind === 'attack' && a.fighter === i) || null}
          onStrike={onStrike}
          position={[-4.7 + (i % 5) * 1.1 + Math.floor(i / 5) * 0.4, 0, 0.2 - Math.floor(i / 5) * 0.85]}
        />
      ))}
      <BossSprite enraged={enraged} hit={hit} summon={summon} />
      {minions.map((m, i) => (
        <MinionSprite key={m.key} issue={m} index={i} horde={i === minions.length - 1 ? horde : 0} />
      ))}
      {floats.map((f) => <FloatNum key={f.id} item={f} onDone={removeFloat} />)}
      <Embers enraged={enraged} />
      <Effects />
    </Canvas>
  );
}
