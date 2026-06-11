// src/raid/FighterArtRig.jsx
// Painted-art fighter: a rig of layer planes (one layer today — the full
// body) anchored at the feet, animated procedurally via artPose.js. Falls
// back to the pixel-matrix FighterSprite while the texture loads or if the
// PNG is missing, so the matrix path stays the universal safety net.
// Future layered exports (cape/arm/body) become additional planes here.
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import FighterSprite, { Beacon } from './FighterSprite';
import { useFighterArt } from './fighterArt';
import { artScaleFor } from './sprites/roster';
import { fitPlane } from './bossArtMath';
import { attackPose, idlePose, victoryPose, DOWN_ROT, SLUMP } from './artPose';
import { frozen } from './timeBus';

const ART_FIGHTER_H = 1.78; // world height — designer-tuned live in the preview
const GHOST_LIFE = 0.35;
const DUST_LIFE = 0.6;

export default function FighterArtRig(props) {
  const tex = useFighterArt(props.art);
  if (!tex) return <FighterSprite {...props} />;
  return <Rig {...props} tex={tex} />;
}

function Rig({ fighter, attack, onStrike, position, phase = 0, aura = 0, beaconHeat = 0, tableau = null, focus = null, onFocus, lite = false, tex }) {
  const [W, H] = useMemo(() => fitPlane(tex.image.width, tex.image.height, ART_FIGHTER_H * artScaleFor(fighter.name)), [tex, fighter.name]);
  const group = useRef();
  const body = useRef();
  const mat = useRef();
  const auraMat = useRef();
  const anim = useRef({ id: null, t: 99, struck: false, points: 1 }); // t seeds past ATK_TOTAL: no phantom attack on mount
  const [ghosts, setGhosts] = useState([]);
  const [dust, setDust] = useState([]);
  const nextFx = useRef(0);

  useFrame((state, rawDt) => {
    const dt = frozen() ? 0 : rawDt; // hit-stop freezes the choreography
    const t = state.clock.elapsedTime;
    const a = anim.current;
    if (attack && attack.id !== a.id && fighter.status !== 'down') { a.id = attack.id; a.t = 0; a.struck = false; a.points = attack.points; }
    a.t += dt;
    const atk = fighter.status !== 'down' ? attackPose(a.t) : null;
    if (atk?.strike && !a.struck) {
      a.struck = true;
      onStrike?.(a.points);
      if (!lite) {
        setGhosts((gs) => [...gs, ...[-0.55, -0.37, -0.19].map((gx) => ({ id: nextFx.current++, x: gx, born: t }))]);
        setDust((ds) => [...ds, { id: nextFx.current++, born: t }]);
      }
    }
    if (ghosts.length && t - ghosts[0].born > GHOST_LIFE) setGhosts((gs) => gs.filter((g) => t - g.born < GHOST_LIFE));
    if (dust.length && t - dust[0].born > DUST_LIFE) setDust((ds) => ds.filter((d) => t - d.born < DUST_LIFE));

    const idle = idlePose(t, phase, fighter.status === 'resting' ? 0.6 : 1);
    let x = 0, y = 0, rot = idle.rot, sy = idle.sy, dim = 1;
    if (fighter.status === 'down') { rot = DOWN_ROT; sy = 1; dim = 0.5; }
    else if (atk) { x = atk.x; rot = atk.rot; sy = atk.sy; }
    else if (tableau === 'victory') { const v = victoryPose(t, phase); y = v.y; sy = v.sy; rot = 0; }
    else if (tableau === 'defeat' || fighter.status === 'exhausted') { rot = SLUMP.rot + idle.rot * 0.5; sy = SLUMP.sy; dim = 0.55; }
    else if (fighter.status === 'resting') dim = 0.8;

    const focusDim = focus && fighter.name !== focus ? 0.32 : 1;
    if (atk?.strike) mat.current.color.setRGB(2.5, 2.5, 2.5); // impact flash
    else mat.current.color.setScalar(dim * focusDim);
    group.current.position.set(position[0] + x, y, position[2]);
    body.current.rotation.z = rot;
    body.current.scale.y = sy;
    if (auraMat.current) auraMat.current.opacity = aura * (0.32 + 0.1 * Math.sin(t * 2 + phase));
  });

  return (
    <group ref={group} position={position}>
      {/* Oversized invisible click target (same contract as FighterSprite). */}
      {onFocus && (
        <mesh
          position={[0, H / 2, 0.06]}
          onClick={(e) => { e.stopPropagation(); onFocus(fighter.name); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          <planeGeometry args={[W * 1.3, H * 1.05]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {/* Feet-anchored body: rotation/scale pivot at the floor, not the center. */}
      <group ref={body}>
        <mesh position={[0, H / 2, 0]}>
          <planeGeometry args={[W, H]} />
          <meshBasicMaterial ref={mat} map={tex} transparent alphaTest={0.4} toneMapped={false} />
        </mesh>
      </group>
      {focus === fighter.name && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.42, 0.55, 40]} />
          <meshBasicMaterial color="#7fe7ff" transparent opacity={0.75} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      {aura > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.55, 24]} />
          <meshBasicMaterial ref={auraMat} color="#ff9d5c" transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      {ghosts.map((g) => <Ghost key={g.id} g={g} tex={tex} w={W} h={H} />)}
      {dust.map((d) => <Dust key={d.id} d={d} />)}
      {fighter.status === 'down' && <Beacon heat={beaconHeat} />}
    </group>
  );
}

// Fading after-image left behind by the lunge (smear-frame stand-in).
function Ghost({ g, tex, w, h }) {
  const m = useRef();
  useFrame((state) => {
    const k = Math.min(1, (state.clock.elapsedTime - g.born) / GHOST_LIFE);
    if (m.current) m.current.opacity = 0.35 * (1 - k);
  });
  return (
    <mesh position={[g.x, h / 2, -0.02]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial ref={m} map={tex} transparent opacity={0.35} alphaTest={0.05} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// Dust puff kicked up at the feet on the lunge.
function Dust({ d }) {
  const mesh = useRef();
  const m = useRef();
  useFrame((state) => {
    const k = Math.min(1, (state.clock.elapsedTime - d.born) / DUST_LIFE);
    if (mesh.current) { mesh.current.scale.setScalar(0.5 + k); mesh.current.position.y = 0.06 + k * 0.12; }
    if (m.current) m.current.opacity = 0.4 * (1 - k);
  });
  return (
    <mesh ref={mesh} position={[-0.15, 0.06, 0.05]}>
      <circleGeometry args={[0.16, 10]} />
      <meshBasicMaterial ref={m} color="#8da0b3" transparent opacity={0.4} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}
