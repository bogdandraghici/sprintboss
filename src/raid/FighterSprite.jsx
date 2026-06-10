// src/raid/FighterSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { headlessFramesFor, paletteFor, FRAME } from './sprites/roster';
import { HEAD_ANCHORS } from './sprites/bodies';
import { avatarTexture } from './avatarTexture';

const PX = 0.1; // world units per sprite pixel -> 14x20 body ≈ 1.4 x 2.0
const HEAD_SIZE = 0.8; // avatar disc diameter — bobblehead proportions on purpose

// Head-centre anchor (pixel coords) -> local offset within the fighter group.
// The body plane is centred at [0, PX*10], pixel (7, 10).
const headPos = (frame) => {
  const [cx, cy] = HEAD_ANCHORS[frame];
  return [(cx - 7) * PX, (20 - cy) * PX];
};

// attack: latest {id, points} action for this fighter (or null).
// onStrike(points): fired once per attack at the moment of impact.
export default function FighterSprite({ fighter, attack, onStrike, position, phase = 0 }) {
  const entry = useMemo(
    () => sheetTexture(`fighter:${fighter.name}:headless`, headlessFramesFor(fighter.name), paletteFor(fighter.name)),
    [fighter.name]
  );
  const headTex = useMemo(() => avatarTexture(fighter.name, fighter.avatar), [fighter.name, fighter.avatar]);
  const group = useRef();
  const mat = useRef();
  const head = useRef();
  const headMat = useRef();
  const anim = useRef({ id: null, t: 0, struck: false });

  useFrame((state, dt) => {
    const a = anim.current;
    if (attack && attack.id !== a.id) { a.id = attack.id; a.t = 0; a.struck = false; }
    const attacking = a.id !== null && a.t < 0.7 && fighter.status !== 'down';
    let frame;
    let lunge = 0;
    if (attacking) {
      a.t += dt;
      frame = a.t < 0.28 ? FRAME.ATTACK_A : FRAME.ATTACK_B;
      lunge = a.t < 0.28 ? -0.15 : 0.5;
      if (a.t >= 0.28 && !a.struck) {
        a.struck = true;
        onStrike?.(attack.points);
      }
    } else {
      frame =
        fighter.status === 'down' ? FRAME.DOWN
        : fighter.status === 'exhausted' ? FRAME.KNEEL
        : Math.floor(state.clock.elapsedTime / 0.8 + phase) % 2 ? FRAME.IDLE_B : FRAME.IDLE_A;
    }
    setFrame(entry, frame);
    group.current.position.x = position[0] + lunge;
    // The avatar head follows the pose's head anchor (z forward of the body).
    const [hx, hy] = headPos(frame);
    head.current.position.set(hx, hy, 0.02);
    // Dim the weary; beacon handled below.
    const dim = fighter.status === 'exhausted' ? 0.55 : fighter.status === 'resting' ? 0.8 : 1;
    mat.current.color.setScalar(dim);
    headMat.current.color.setScalar(dim);
  });

  return (
    <group ref={group} position={position}>
      <mesh position={[0, PX * 10, 0]}>
        <planeGeometry args={[14 * PX, 20 * PX]} />
        <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      <mesh ref={head} position={[0, PX * 16.8, 0.02]}>
        <planeGeometry args={[HEAD_SIZE, HEAD_SIZE]} />
        <meshBasicMaterial ref={headMat} map={headTex} transparent alphaTest={0.5} toneMapped={false} />
      </mesh>
      {fighter.status === 'down' && <Beacon />}
    </group>
  );
}

// Blinking red distress light over a downed fighter.
function Beacon() {
  const m = useRef();
  useFrame((state) => {
    m.current.material.opacity = 0.35 + 0.65 * Math.abs(Math.sin(state.clock.elapsedTime * 3));
  });
  return (
    <mesh ref={m} position={[0, 2.5, 0]}>
      <sphereGeometry args={[0.09, 8, 8]} />
      <meshBasicMaterial color="#ff5d5d" transparent toneMapped={false} />
    </mesh>
  );
}
