// src/components/RaidHud.jsx
import { useState } from 'react';
import Avatar from './Avatar';
import { EnrageTimer, HpBar, ScarTimeline, DamageLog } from './hud';
import { fmtDays } from '../lib';

export default function RaidHud({ view, party, onSelect }) {
  return (
    <div className="raid-hud">
      <div className="hud-top">
        <div className="hud-hp">
          <HpBar view={view} onSelect={onSelect} />
          <ScarTimeline view={view} />
        </div>
        <EnrageTimer view={view} />
      </div>
      <div className="hud-bottom">
        <div className="party">
          {party.map((f) => <PartyFrame key={f.name} fighter={f} onSelect={onSelect} />)}
        </div>
        <DamageLog view={view} />
      </div>
    </div>
  );
}

const STATUS_ICON = { fighting: '⚔', exhausted: '💤', down: '⚑', resting: '✓' };

function PartyFrame({ fighter, onSelect }) {
  const [open, setOpen] = useState(false);
  const openIssues = fighter.issues.filter((i) => !i.done);
  return (
    <div className="pframe" data-status={fighter.status}>
      <button className="pframe-head" onClick={() => setOpen((o) => !o)}>
        <Avatar name={fighter.name} src={fighter.avatar} />
        <span className="pframe-name">{fighter.name.split(' ')[0]}</span>
        <span className="pframe-status">{STATUS_ICON[fighter.status]}</span>
        <span className="pframe-counts mono">
          {fighter.open}<i> open</i>
          {fighter.stale > 0 && <b className="warn"> {fighter.stale} stale</b>}
        </span>
      </button>
      {open && (
        <div className="pframe-list">
          {openIssues.map((i) => (
            <button key={i.key} className="pframe-row mono" onClick={() => onSelect(i)}>
              {i.blocked ? '⚑ ' : ''}{i.key} · {fmtDays(i.daysInColumn)} · {i.colName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
