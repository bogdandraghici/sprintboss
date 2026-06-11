// src/raid/RaidView.jsx
// Command deck: data layers above and below, the scene as pure spectacle between.
import { useMemo } from 'react';
import ArenaScene from './ArenaScene';
import Dock from '../components/Dock';
import TruthTicker from '../components/TruthTicker';
import { EnrageTimer, HpBar, DamageLog } from '../components/hud';
import { deriveParty, deriveMinions, pulseActions } from './raidState';

export default function RaidView({ view, pulses, onSelect }) {
  const party = useMemo(() => deriveParty(view), [view]);
  const { minions, horde } = useMemo(() => deriveMinions(view), [view]);
  const actions = pulseActions(pulses, party);
  return (
    <section className="raidview">
      <div className="raid-top">
        <div className="hud-hp">
          <HpBar view={view} onSelect={onSelect} />
        </div>
        <EnrageTimer view={view} />
      </div>
      <div className="arena">
        <ArenaScene view={view} party={party} minions={minions} horde={horde} actions={actions} />
        <div className="combat-log">
          <DamageLog view={view} />
        </div>
      </div>
      <Dock view={view} onSelect={onSelect} />
      <TruthTicker view={view} onSelect={onSelect} />
    </section>
  );
}
