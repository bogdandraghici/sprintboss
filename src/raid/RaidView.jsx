// src/raid/RaidView.jsx
import { useMemo } from 'react';
import ArenaScene from './ArenaScene';
import { deriveParty, deriveMinions, pulseActions } from './raidState';

export default function RaidView({ view, pulses, onSelect }) {
  // onSelect is intentionally unused until Task 10 — accepted now so App wiring is final
  const party = useMemo(() => deriveParty(view), [view]);
  const { minions, horde } = useMemo(() => deriveMinions(view), [view]);
  const actions = pulseActions(pulses, party);
  return (
    <section className="raidview">
      <div className="arena">
        {/* onStrike no-op: Task 8 replaces it with boss reaction + damage numbers + shake */}
        <ArenaScene view={view} party={party} minions={minions} horde={horde} actions={actions} onStrike={() => {}} />
      </div>
    </section>
  );
}
