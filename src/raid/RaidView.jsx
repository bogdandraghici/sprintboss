// src/raid/RaidView.jsx
import { useMemo } from 'react';
import ArenaScene from './ArenaScene';
import RaidHud from '../components/RaidHud';
import TruthTicker from '../components/TruthTicker';
import { deriveParty, deriveMinions, pulseActions } from './raidState';

export default function RaidView({ view, pulses, onSelect }) {
  const party = useMemo(() => deriveParty(view), [view]);
  const { minions, horde } = useMemo(() => deriveMinions(view), [view]);
  const actions = pulseActions(pulses, party);
  return (
    <section className="raidview">
      <div className="arena">
        <ArenaScene view={view} party={party} minions={minions} horde={horde} actions={actions} />
        <RaidHud view={view} party={party} onSelect={onSelect} />
      </div>
      <TruthTicker view={view} onSelect={onSelect} />
    </section>
  );
}
