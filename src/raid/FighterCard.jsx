// src/raid/FighterCard.jsx
// Standup-only: a full-height card showing one fighter live (idle +
// shadow-boxing), their name/class, and a stat grid. The art stage is a small
// standalone R3F canvas that reuses the arena's exact rig selection, so the
// figure matches the battle. Pure logic lives in fighterCard.js; this file is
// verified in the browser preview.
import { Canvas } from '@react-three/fiber';
import FighterSprite from './FighterSprite';
import FighterArtRig from './FighterArtRig';
import { artSlugFor } from './sprites/roster';
import { LITE } from './ArenaScene';
import { cardStats, weaponClassLabel } from './fighterCard';

const STATUS = {
  fighting:  { label: 'Fighting',  tone: 'fighting' },
  resting:   { label: 'Resting',   tone: 'resting' },
  exhausted: { label: 'Exhausted', tone: 'exhausted' },
  down:      { label: 'Down',      tone: 'down' },
};

// Fighter art is ~2.2 world units tall with feet at y=0. Drop the rig by ~half
// its height so the body centres on the origin the camera looks at.
const FIGHTER_DROP = -1.05;

function CardScene({ fighter }) {
  const art = artSlugFor(fighter.name);
  const Comp = art ? FighterArtRig : FighterSprite;
  return (
    <Canvas
      dpr={LITE ? 1 : [1, 1.75]}
      gl={{ alpha: true, antialias: !LITE }}
      camera={{ fov: 30, position: [0, 0, 4.2] }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[-4, 5, 4]} intensity={50} color="#7fe7ff" />
      <pointLight position={[4.5, 4, 2]} intensity={45} color="#ff9d5c" />
      <Comp
        fighter={fighter}
        art={art}
        lite={LITE}
        phase={0}
        attack={null}
        onStrike={() => {}}
        beaconHeat={fighter.status === 'down' ? 1 : 0}
        tableau={null}
        focus={null}
        onFocus={() => {}}
        position={[0, FIGHTER_DROP, 0]}
      />
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
