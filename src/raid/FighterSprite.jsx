// src/raid/FighterSprite.jsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { sheetTexture, setFrame } from './sprites/textures';
import { headlessFramesFor, paletteFor, FRAME, HEAD_ANCHORS15 } from './sprites/roster';
import { useFighterArt, pickVariant } from './fighterArt';
import { avatarTexture } from './avatarTexture';
import { frozen } from './timeBus';

const PX = 0.034; // matrix fallback: world units per sprite pixel -> 28x40 body ≈ 0.95 x 1.36
const HEAD_SIZE = 0.48; // avatar disc diameter (matrix fallback)

// Generated-body tuning. Each body is scaled so its neck->feet span equals
// TORSO_WORLD — so every fighter's head lands on the same line and the feet sit
// on the floor, regardless of the body's build or any weapon raised overhead.
const TORSO_WORLD = 1.5; // neck-to-feet world height
const ART_HEAD = 0.52; // avatar disc diameter on the art body

// Head-centre anchor (28×40 pixel coords) -> local offset within the group.
// The body plane is centred at [0, PX*20], pixel (14, 20).
const headPos = (frame) => {
  const [cx, cy] = HEAD_ANCHORS15[frame];
  return [(cx - 14) * PX, (40 - cy) * PX];
};

// Attack timeline: [duration, frame, lunge]. Strike fires entering ATTACK_C.
// The lunge column drives both paths (matrix frame swap, or art body lunge).
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
  const bodies = useFighterArt();
  const body = bodies.length ? bodies[pickVariant(fighter.name, bodies.length)] : null;
  const usingArt = !!body;

  // Matrix fallback sheet — cached per name; only rendered when no art is present.
  const entry = useMemo(
    () => sheetTexture(`fighter:${fighter.name}:headless:v3`, headlessFramesFor(fighter.name), paletteFor(fighter.name)),
    [fighter.name]
  );
  const headTex = useMemo(() => avatarTexture(fighter.name, fighter.avatar), [fighter.name, fighter.avatar]);

  // Art layout: scale so neck->feet == TORSO_WORLD; the head pins at the neck.
  const layout = useMemo(() => {
    if (!body) return null;
    const img = body.tex.image;
    const aspect = body.aspect || (img ? (img.naturalWidth || img.width) / (img.naturalHeight || img.height) : 0.7);
    const [nx, ny] = body.neck || [0.5, 0];
    const planeH = TORSO_WORLD / Math.max(0.3, 1 - ny); // ny = neck height from top (frac)
    const planeW = planeH * aspect;
    return { planeW, planeH, neckX: (nx - 0.5) * planeW, neckY: TORSO_WORLD };
  }, [body]);

  const group = useRef();
  const mat = useRef();
  const head = useRef();
  const headMat = useRef();
  const auraMat = useRef();
  const anim = useRef({ id: null, t: 0, struck: false, points: 1 });

  useFrame((state, rawDt) => {
    const dt = frozen() ? 0 : rawDt; // hit-stop freezes the choreography
    const a = anim.current;
    const t = state.clock.elapsedTime;
    if (attack && attack.id !== a.id && fighter.status !== 'down') { a.id = attack.id; a.t = 0; a.struck = false; a.points = attack.points; }
    const attacking = a.id !== null && a.t < ATK_TOTAL && fighter.status !== 'down';

    // Shared choreography state: the active matrix frame + the lunge offset.
    let frame = FRAME.IDLE_A;
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
        onStrike?.(a.points);
      }
    } else if (tableau === 'victory') {
      frame = Math.floor(t / 0.35 + phase) % 2 ? FRAME.VICTORY_B : FRAME.VICTORY_A;
    } else if (fighter.status === 'down') {
      frame = FRAME.DOWN;
    } else if (tableau === 'defeat' || fighter.status === 'exhausted') {
      frame = Math.floor(t / 0.9 + phase) % 2 ? FRAME.KNEEL_B : FRAME.KNEEL_A;
    } else {
      frame = IDLE_CYCLE[Math.floor(t / 0.5 + phase) % 4];
    }

    const dim = fighter.status === 'exhausted' ? 0.55 : fighter.status === 'resting' ? 0.8 : 1;
    mat.current.color.setScalar(dim);
    headMat.current.color.setScalar(dim);

    if (usingArt) {
      // Engine-driven motion on the static body (the head rides the group).
      const down = fighter.status === 'down';
      let yoff = 0;
      let rot = 0;
      if (down) {
        rot = -0.55; // collapse backward
        yoff = -layout.planeH * 0.16;
      } else if (attacking) {
        yoff = 0;
      } else if (tableau === 'victory') {
        yoff = Math.abs(Math.sin(t * 4 + phase)) * 0.12; // celebratory hops
      } else if (tableau === 'defeat' || fighter.status === 'exhausted') {
        rot = -0.12; // weary lean
        yoff = -0.05;
      } else {
        yoff = 0.025 * Math.sin(t * 2 + phase); // gentle idle bob
      }
      group.current.position.x = position[0] + lunge;
      group.current.position.y = position[1] + yoff;
      group.current.rotation.z = rot;
    } else {
      setFrame(entry, frame);
      group.current.position.x = position[0] + lunge;
      const [hx, hy] = headPos(frame);
      head.current.position.set(hx, hy, 0.02);
    }

    if (auraMat.current) {
      auraMat.current.opacity = aura * (0.32 + 0.1 * Math.sin(t * 2 + phase));
    }
  });

  return (
    <group ref={group} position={position}>
      {usingArt ? (
        <>
          <mesh position={[0, layout.planeH / 2, 0]}>
            <planeGeometry args={[layout.planeW, layout.planeH]} />
            <meshBasicMaterial ref={mat} map={body.tex} transparent alphaTest={0.04} toneMapped={false} />
          </mesh>
          <mesh ref={head} position={[layout.neckX, layout.neckY + ART_HEAD * 0.28, 0.05]}>
            <planeGeometry args={[ART_HEAD, ART_HEAD]} />
            <meshBasicMaterial ref={headMat} map={headTex} transparent alphaTest={0.5} toneMapped={false} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, PX * 20, 0]}>
            <planeGeometry args={[28 * PX, 40 * PX]} />
            <meshBasicMaterial ref={mat} map={entry.tex} transparent alphaTest={0.5} toneMapped={false} />
          </mesh>
          <mesh ref={head} position={[0, PX * 33.6, 0.02]}>
            <planeGeometry args={[HEAD_SIZE, HEAD_SIZE]} />
            <meshBasicMaterial ref={headMat} map={headTex} transparent alphaTest={0.5} toneMapped={false} />
          </mesh>
        </>
      )}
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
    <mesh ref={m} position={[0, 1.7, 0]}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshBasicMaterial color="#ff5d5d" transparent toneMapped={false} />
    </mesh>
  );
}
