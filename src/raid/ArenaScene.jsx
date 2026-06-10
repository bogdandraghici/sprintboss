// src/raid/ArenaScene.jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useMemo } from 'react';
import { cssVar } from './cssVar';
import { drainShake } from './shakeBus';

function CameraRig() {
  const { camera } = useThree();
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const shake = drainShake(dt);
    camera.position.x = Math.sin(t * 0.07) * 0.55 + (Math.random() - 0.5) * shake * 0.5;
    camera.position.y = 2.1 + Math.sin(t * 0.11) * 0.12 + (Math.random() - 0.5) * shake * 0.35;
    camera.position.z = 8.6;
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

export default function ArenaScene({ view, party = [], minions = [], horde = 0, actions = [] }) {
  const enraged = view.stats.enraged;
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 35, position: [0, 2.1, 8.6] }}
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
      {/* fighters, boss, minions, effects arrive in Tasks 7-9 */}
    </Canvas>
  );
}
