// src/raid/FighterCard.jsx
// Standup-only: a full-height card showing one fighter live (idle +
// shadow-boxing), their name/class, and a stat grid. The art stage is a small
// standalone R3F canvas that reuses the arena's exact rig selection, so the
// figure matches the battle. Pure logic lives in cardStats.js; this file is
// verified in the browser preview.
import { Canvas } from '@react-three/fiber';
import FighterSprite from './FighterSprite';
import FighterArtRig from './FighterArtRig';
import { artSlugFor, cardYFor } from './sprites/roster';
import { LITE } from './ArenaScene';
import { cardStats, weaponClassLabel } from './cardStats';

const STATUS = {
  fighting:  { label: 'Fighting',  tone: 'fighting' },
  resting:   { label: 'Resting',   tone: 'resting' },
  exhausted: { label: 'Exhausted', tone: 'exhausted' },
  down:      { label: 'Down',      tone: 'down' },
};

// Both rigs anchor the figure's feet at world y≈0, and the art rig overwrites
// its own group Y every frame (ignoring position[1]) — so the rig can't be
// moved by its position prop, and R3F's default camera looks at the origin (so
// raising the camera only tilts it). Framing is therefore done in world space:
// the camera sits straight on -Z, pulled back to CAM_Z so a ~2.2-unit figure
// fills the frame with margin, and an OUTER wrapper group (which the rig can't
// touch) drops the figure by BASE_DROP so the feet land low in the frame with
// a little ground beneath for the contact shadow.
const CAM_Z = 5.8;
const BASE_DROP = -1.3;
const CARD_SCALE = 1.2; // figures read a touch larger in the card than the arena

function CardScene({ fighter }) {
  const art = artSlugFor(fighter.name);
  const Comp = art ? FighterArtRig : FighterSprite;
  // The card always shows the fighter standing — status is conveyed by the
  // badge, not the body. Normalising to 'fighting' avoids the downed/slumped
  // poses (and the down beacon) the rigs render for 'down'/'exhausted'.
  const standing = { ...fighter, status: 'fighting' };
  return (
    <Canvas
      dpr={LITE ? 1 : [1, 1.75]}
      gl={{ alpha: true, antialias: !LITE }}
      camera={{ fov: 30, position: [0, 0, CAM_Z] }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[-4, 5, 4]} intensity={50} color="#7fe7ff" />
      <pointLight position={[4.5, 4, 2]} intensity={45} color="#ff9d5c" />
      {/* Outer group the rig can't overwrite — seats the figure low (BASE_DROP),
          scales it up a touch (CARD_SCALE, feet stay anchored at the group
          origin), and carries the per-fighter cardY framing nudge on top. */}
      <group position={[0, BASE_DROP + cardYFor(fighter.name), 0]} scale={CARD_SCALE}>
        <Comp
          fighter={standing}
          art={art}
          lite={LITE}
          phase={0}
          attack={null}
          onStrike={() => {}}
          beaconHeat={0}
          tableau={null}
          focus={null}
          onFocus={() => {}}
          position={[0, 0, 0]}
        />
      </group>
    </Canvas>
  );
}

export default function FighterCard({ fighter, movedCount }) {
  const status = STATUS[fighter.status] || STATUS.fighting;
  const stats = cardStats(fighter, movedCount);
  return (
    <div className="fighter-card">
      <div className="fc-art">
        <span className="fc-badge" data-tone={status.tone}>{status.label}</span>
        <CardScene fighter={fighter} />
        <div className="fc-shadow" />
      </div>
      <div className="fc-name">
        <div className="fc-n">{fighter.name}</div>
        <div className="fc-role">{weaponClassLabel(fighter.name)}</div>
      </div>
      <div className="fc-stats">
        {stats.map((s) => (
          <div key={s.key} className="fc-stat" data-tone={s.tone || undefined}>
            <div className="fc-v">{s.value}</div>
            <div className="fc-l">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
