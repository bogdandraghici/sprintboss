// src/raid/RaidView.jsx
// Command deck: data layers above and below, the scene as pure spectacle between.
import { useMemo, useState, useEffect } from 'react';
import ArenaScene from './ArenaScene';
import Dock from '../components/Dock';
import FighterBar from '../components/FighterBar';
import TruthTicker from '../components/TruthTicker';
import { EnrageTimer, HpBar, DamageLog } from '../components/hud';
import { deriveParty, deriveMinions, pulseActions } from './raidState';

export default function RaidView({ view, pulses, onSelect }) {
  const party = useMemo(() => deriveParty(view), [view]);
  const { minions, horde } = useMemo(() => deriveMinions(view), [view]);
  const actions = pulseActions(pulses, party);

  // Focused fighter (assignee name) or null. Presentation lens only — never
  // mutates `view`, never persisted, not part of retro reconstruction.
  const [focus, setFocus] = useState(null);

  // Esc clears the focus.
  useEffect(() => {
    if (!focus) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFocus(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);

  // If the focused fighter drops out of the party after a poll, clear focus.
  useEffect(() => {
    if (focus && !party.some((f) => f.name === focus)) setFocus(null);
  }, [party, focus]);

  return (
    <section className="raidview">
      <div className="raid-top">
        <div className="hud-hp">
          <HpBar view={view} onSelect={onSelect} focus={focus} />
        </div>
        <EnrageTimer view={view} />
      </div>
      <div className="arena">
        <ArenaScene
          view={view} party={party} minions={minions} horde={horde} actions={actions}
          focus={focus} onFocus={setFocus}
        />
        <div className="combat-log">
          <DamageLog view={view} />
        </div>
      </div>
      <FighterBar party={party} focus={focus} onFocus={setFocus} />
      <Dock view={view} onSelect={onSelect} focus={focus} />
      <TruthTicker view={view} onSelect={onSelect} focus={focus} />
    </section>
  );
}
