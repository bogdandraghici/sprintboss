// src/raid/FighterSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { headlessFramesFor, paletteFor, FRAME, HEAD_ANCHORS15 } from './sprites/roster';
import { avatarTexture } from './avatarTexture';
import { frozen } from './timeBus';

const PX = 0.05; // world units per sprite pixel -> 28x40 body ≈ 1.4 x 2.0
const HEAD_SIZE = 0.8; // avatar disc diameter — bobblehead proportions on purpose

// Head-centre anchor (28×40 pixel coords) -> local offset within the group.
// The body plane is centred at [0, PX*20], pixel (14, 20).
const headPos = (frame) => {
  const [cx, cy] = HEAD_ANCHORS15[frame];
  return [(cx - 14) * PX, (40 - cy) * PX];
};

// Attack timeline: [duration, frame, lunge]. Strike fires entering ATTACK_C.
const ATK = [
  [0.12, FRAME.ATTACK_A, -0.1],
  [0.1, FRAME.ATTACK_B, -0.18],
  [0.1, FRAME.ATTACK_C, 0.55],
  [0.12, FRAME.ATTACK_D, 0.5],
  [0.16, FRAME.ATTACK_E, 0.15],
];
const ATK_TOTAL = ATK.reduce((s, [d]) => s + d, 0);
const STRIKE_AT = ATK[0][0] + ATK[1][0];

const IDLE_CYCLE = [FRAME.IDLE_A, FRAME.IDLE_B, FRAME.IDLE_C, FRAME.IDLE_D];

// attack: latest {id, points} action for this fighter (or null).
// onStrike(points): fired once per attack at the moment of impact.
// aura: 0..1 afterglow of a recent kill; beaconHeat: 0..1 freshness of a block.
// tableau: 'victory' | 'defeat' | null (end-of-sprint poses).
export default function FighterSprite({ fighter, attack, onStrike, position, phase = 0, aura = 0, beaconHeat = 0, tableau = null }) {
  const entry = useMemo(
    () => sheetTexture(`fighter:${fighter.name}:headless:v2`, headlessFramesFor(fighter.name), paletteFor(fighter.name)),
    [fighter.name]
  );
  const headTex = useMemo(() => avatarTexture(fighter.name, fighter.avatar), [fighter.name, fighter.avatar]);
  const group = useRef();
  const mat = useRef();
  const head = useRef();
  const headMat = useRef();
  const auraMat = useRef();
  const anim = useRef({ id: null, t: 0, struck: false });

  useFrame((state, rawDt) => {
    const dt = frozen() ? 0 : rawDt; // hit-stop freezes the choreography
    const a = anim.current;
    if (attack && attack.id !== a.id) { a.id = attack.id; a.t = 0; a.struck = false; }
    const attacking = a.id !== null && a.t < ATK_TOTAL && fighter.status !== 'down';
    let frame;
    let lunge = 0;
    if (attacking) {
      a.t += dt;
      let acc = 0;
      let seg = ATK[ATK.length - 1];
      for (const s of ATK) { acc += s[0]; if (a.t < acc) { seg = s; break; } }
      frame = seg[1];
      lunge = seg[2];
      if (a.t >= STRIKE_AT && !a.struck) {
        a.struck = true;
        onStrike?.(attack.points);
      }
    } else if (tableau === 'victory') {
      frame = Math.floor(state.clock.elapsedTime / 0.35 + phase) % 2 ? FRAME.VICTORY_B : FRAME.VICTORY_A;
    } else if (fighter.status === 'down') {
      frame = FRAME.DOWN;
    } else if (tableau === 'defeat' || fighter.status === 'exhausted') {
      frame = Math.floor(state.clock.elapsedTime / 0.9 + phase) % 2 ? FRAME.KNEEL_B : FRAME.KNEEL_A;
    } else {
      frame = IDLE_CYCLE[Math.floor(state.clock.elapsedTime / 0.5 + phase) % 4];
    }
    setFrame(entry, frame);
    group.current.position.x = position[0] + lunge;
    // The avatar head follows the pose's head anchor (z forward of the body).
    const [hx, hy] = headPos(frame);
    head.current.position.set(hx, hy, 0.02);
    // Dim the weary.
    const dim = fighter.status === 'exhausted' ? 0.55 : fighter.status === 'resting' ? 0.8 : 1;
    mat.current.color.setScalar(dim);
    headMat.current.color.setScalar(dim);
    if (auraMat.current) {
      auraMat.current.opacity = aura * (0.32 + 0.1 * Math.sin(state.clock.elapsedTime * 2 + phase));
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh position={[0, PX * 20, 0]}>
        <planeGeometry args={[28 * PX, 40 * PX]} />
        <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      <mesh ref={head} position={[0, PX * 33.6, 0.02]}>
        <planeGeometry args={[HEAD_SIZE, HEAD_SIZE]} />
        <meshBasicMaterial ref={headMat} map={headTex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      {aura > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.55, 24]} />
          <meshBasicMaterial ref={auraMat} color="#ff9d5c" transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      {fighter.status === 'down' && <Beacon heat={beaconHeat} />}
    </group>
  );
}

// Blinking red distress light over a downed fighter — fresher blocks burn brighter.
function Beacon({ heat = 0 }) {
  const m = useRef();
  useFrame((state) => {
    const amp = 0.45 + 0.55 * heat;
    m.current.material.opacity = amp * (0.35 + 0.65 * Math.abs(Math.sin(state.clock.elapsedTime * 3)));
    m.current.scale.setScalar(1 + heat * 0.6);
  });
  return (
    <mesh ref={m} position={[0, 2.5, 0]}>
      <sphereGeometry args={[0.09, 8, 8]} />
      <meshBasicMaterial color="#ff5d5d" transparent toneMapped={false} />
    </mesh>
  );
}
