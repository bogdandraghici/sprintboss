// src/raid/ArenaScene.jsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMemo, useState, useEffect, useRef } from 'react';
import { cssVar } from './cssVar';
import { drainShake, addShake } from './shakeBus';
import { addFreeze, drainFreeze } from './timeBus';
import { bossStage, deriveTableau } from './raidState';
import * as cc from './cameraControls';
import { fighterBlockHeat, bossScars } from './heat';
import FighterSprite from './FighterSprite';
import FighterArtRig from './FighterArtRig';
import { artSlugFor } from './sprites/roster';
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

// Home framing: eye slightly below the look point, near side-on.
const EYE_Y = 1.5, EYE_Z = 12.4, LOOK_Y = 1.65;
const HOME_DIST = Math.hypot(EYE_Y - LOOK_Y, EYE_Z);

// Interactive pan/zoom layered on the ambient sway + hit-stop shake. Wheel
// zooms toward the cursor, left-drag pans; both suppress the sway while
// engaged and ease back home after IDLE_RETURN_S idle. Double-click / Esc
// reset instantly. Presentation-only — see cameraControls.js for the math.
function CameraRig() {
  const { camera, gl } = useThree();
  const ctrl = useRef({
    cur: { pan: { x: 0, y: 0 }, zoom: 1 },
    tgt: { pan: { x: 0, y: 0 }, zoom: 1 },
    idle: cc.IDLE_RETURN_S,
  });
  const drag = useRef({ down: false, dragging: false, sx: 0, sy: 0, lx: 0, ly: 0, id: null });

  useEffect(() => {
    const dom = gl.domElement;
    const vFov = () => (camera.fov * Math.PI) / 180;
    const rectOf = () => dom.getBoundingClientRect();

    const onWheel = (e) => {
      e.preventDefault();
      const c = ctrl.current; c.idle = 0;
      const r = rectOf();
      const ndc = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
      const aspect = r.width / r.height;
      const oldZoom = c.tgt.zoom;
      const newZoom = cc.clampZoom(oldZoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      const oldHalf = cc.viewHalf(vFov(), HOME_DIST, aspect, oldZoom);
      const newHalf = cc.viewHalf(vFov(), HOME_DIST, aspect, newZoom);
      c.tgt.zoom = newZoom;
      c.tgt.pan = cc.clampPan(cc.cursorZoomPan(c.tgt.pan, ndc, oldHalf, newHalf));
    };
    const onDown = (e) => {
      if (e.button !== 0) return;
      const d = drag.current;
      d.down = true; d.dragging = false; d.id = e.pointerId;
      d.sx = d.lx = e.clientX; d.sy = d.ly = e.clientY;
    };
    const onMove = (e) => {
      const d = drag.current; if (!d.down) return;
      if (!d.dragging && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > cc.DRAG_THRESHOLD) {
        d.dragging = true;
        try { dom.setPointerCapture(d.id); } catch { /* ignore */ }
      }
      if (!d.dragging) return;
      const c = ctrl.current; c.idle = 0;
      const r = rectOf();
      const half = cc.viewHalf(vFov(), HOME_DIST, r.width / r.height, c.tgt.zoom);
      c.tgt.pan = cc.clampPan(cc.dragToPan(c.tgt.pan, e.clientX - d.lx, e.clientY - d.ly, half, r.width, r.height));
      d.lx = e.clientX; d.ly = e.clientY;
    };
    const onUp = (e) => {
      const d = drag.current;
      if (d.dragging) {
        // Keep the drag-release off R3F's click path so it can't focus a
        // fighter: stop the capture-phase pointerup before it reaches the
        // canvas, and swallow any synthesized DOM click as a backup.
        e.stopPropagation();
        const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        dom.addEventListener('click', swallow, { capture: true, once: true });
      }
      d.down = false; d.dragging = false;
    };
    const reset = () => { const c = ctrl.current; c.tgt.pan = { x: 0, y: 0 }; c.tgt.zoom = 1; c.idle = cc.IDLE_RETURN_S; };
    const onKey = (e) => { if (e.key === 'Escape') reset(); };

    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { capture: true });
    window.addEventListener('pointerup', onUp, { capture: true });
    dom.addEventListener('dblclick', reset);
    window.addEventListener('keydown', onKey);
    return () => {
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerup', onUp, { capture: true });
      dom.removeEventListener('dblclick', reset);
      window.removeEventListener('keydown', onKey);
    };
  }, [camera, gl]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const shake = drainShake(dt);
    const c = ctrl.current;
    c.idle += dt;
    if (c.idle >= cc.IDLE_RETURN_S) { c.tgt.pan.x = 0; c.tgt.pan.y = 0; c.tgt.zoom = 1; }
    c.cur.zoom = cc.ease(c.cur.zoom, c.tgt.zoom, dt);
    c.cur.pan.x = cc.ease(c.cur.pan.x, c.tgt.pan.x, dt);
    c.cur.pan.y = cc.ease(c.cur.pan.y, c.tgt.pan.y, dt);

    const sf = cc.swayFactor(c.cur.pan, c.cur.zoom);
    const swayX = Math.sin(t * 0.07) * 0.55 * sf;
    const swayY = Math.sin(t * 0.11) * 0.08 * sf;
    // Pan translates eye+target together; zoom dollies the eye toward target.
    const Tx = c.cur.pan.x, Ty = LOOK_Y + c.cur.pan.y;
    const inv = 1 / c.cur.zoom;
    camera.position.x = Tx + swayX * inv + (Math.random() - 0.5) * shake * 0.5;
    camera.position.y = Ty + (EYE_Y - LOOK_Y + swayY) * inv + (Math.random() - 0.5) * shake * 0.35;
    camera.position.z = EYE_Z * inv;
    camera.lookAt(Tx, Ty, 0);
  });
  return null;
}

// Floor depth gradient, painted into a 1-D (depth-axis) canvas: the surface
// catches a steel sheen toward the front where the point-lights reach, eases
// back to the panel tone, then dissolves into the bg/fog at the far edge — so
// there's no hard horizon line, the floor fades into distance. A feathered
// bright band sits at the fighters' z: it replaces the old hard baseline strip
// (which read as a tightrope) with a soft glow that still anchors their feet.
// flipY maps canvas-top -> v=1; the plane's -π/2 rotation maps v=1 -> world -z,
// so canvas-top is the FAR edge. Tunable live — see verification pass.
function floorTexture(bg, panel) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, bg);       // far edge: melt into background/fog
  grad.addColorStop(0.4, panel);    // mid-back: flat panel tone
  grad.addColorStop(0.7, '#0f1722'); // front: a whisper of lift, barely above panel
  grad.addColorStop(1.0, '#0b1118'); // very front: settles back toward bg
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  // Feet glow band — feathered, centred on the fighters' z (canvas mid).
  // Just enough to anchor feet without becoming its own bright stripe.
  const band = g.createLinearGradient(0, 92, 0, 168);
  band.addColorStop(0, 'rgba(154,163,181,0)');
  band.addColorStop(0.5, 'rgba(154,163,181,0.22)');
  band.addColorStop(1, 'rgba(154,163,181,0)');
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = band;
  g.fillRect(0, 92, 16, 76);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function Floor() {
  const tex = useMemo(
    () => floorTexture(cssVar('--bg', '#0a0e13'), cssVar('--panel-2', '#0c1219')),
    []
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[40, 24]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

// Soft radial contact shadow shared by every grounded figure. Black with an
// alpha falloff so it darkens whatever floor tone sits under it.
const SHADOW_TEX = typeof document !== 'undefined' ? (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})() : null;

// A flattened ellipse laid on the floor (y just above the plane). Planted in
// world space — NOT parented to a bobbing/lunging body — so figures visibly
// rise off it when they jump, lunge, or (the boss) breathe.
function GroundShadow({ x, z, w, d = w * 0.4, opacity = 0.5 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.012, z]} scale={[w, d, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={SHADOW_TEX} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// Where each fighter stands — shared by the sprite layer and the shadow layer
// so they can't drift apart.
const fighterPos = (i) => [-16.5 + (i % 7) * 3.0 + Math.floor(i / 7) * 0.9, 0, 0.2 - Math.floor(i / 7) * 1.7];

function GroundShadows({ party, minions, tableau, focus }) {
  // Contact shadows are planted on the floor under every grounded figure.
  const bossGone = tableau === 'victory';
  return (
    <>
      {party.map((f, i) => {
        const [x, , z] = fighterPos(i);
        const op = focus && f.name !== focus ? 0.2 : 0.5;
        return <GroundShadow key={f.name} x={x} z={z} w={0.95} opacity={op} />;
      })}
      {!bossGone && minions.map((m, i) => {
        const [x, , z] = minionPos(i);
        return <GroundShadow key={m.key} x={x} z={z} w={0.6} opacity={0.45} />;
      })}
      {!bossGone && <GroundShadow x={4.6} z={-0.4} w={2.6} d={0.95} opacity={0.55} />}
    </>
  );
}

// A large invisible plane behind everything. Any click that isn't a fighter
// (whose hit-box stops propagation) falls through to here and clears focus.
// `visible` stays true so three.js still raycasts it; opacity 0 hides it.
function ClearBackdrop({ onClear }) {
  return (
    <mesh position={[0, 4, -6]} onClick={() => onClear()}>
      <planeGeometry args={[60, 30]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
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

export default function ArenaScene({ view, party = [], minions = [], horde = 0, actions = [], focus = null, onFocus = () => {} }) {
  const enraged = view.stats.enraged;
  const stage = bossStage(view.stats);
  const tableau = deriveTableau(view);

  // Afterglow inputs — pure functions of (events, issues, view.now): retro-safe.
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
      camera={{ fov: 35, position: [0, 2.1, 12.4] }}
      gl={{ antialias: false }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[cssVar('--bg', '#0a0e13')]} />
      <fog attach="fog" args={[cssVar('--bg', '#0a0e13'), 12, 25]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[-4, 5, 4]} intensity={60} color="#7fe7ff" />
      <pointLight position={[4.5, 4, 2]} intensity={enraged ? 110 : 50} color={enraged ? '#ff5d5d' : '#ff9d5c'} />
      <TimeKeeper />
      <CameraRig />
      <Environment enraged={enraged} lite={LITE} />
      <Floor />
      <GroundShadows party={party} minions={minions} tableau={tableau} focus={focus} />
      <ClearBackdrop onClear={() => onFocus(null)} />
      {party.map((f, i) => {
        const art = artSlugFor(f.name);
        const Comp = art ? FighterArtRig : FighterSprite;
        return (
          <Comp
            key={f.name}
            fighter={f}
            art={art}
            lite={LITE}
            phase={i * 0.7}
            attack={actions.find((a) => a.kind === 'attack' && a.fighter === i) || null}
            onStrike={strike}
            beaconHeat={blockHeat.get(f.name) || 0}
            tableau={tableau}
            focus={focus}
            onFocus={onFocus}
            position={fighterPos(i)}
          />
        );
      })}
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
