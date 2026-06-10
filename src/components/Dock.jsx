// src/components/Dock.jsx
// The data half of the command deck: real tickets, grouped by board column.
// Queue (first column) is always key-only chips; working columns carry full
// cards and degrade density instead of scrolling; blocked is always loud.
import Ticket from './Ticket';
import { deriveDock, dockDensity, QUEUE_MAX, WORK_MAX } from '../raid/raidState';

export default function Dock({ view, onSelect }) {
  const { groups, blocked } = deriveDock(view);
  return (
    <div className="dock">
      {groups.map((g) => <DockGroup key={g.idx} group={g} view={view} onSelect={onSelect} />)}
      <div className="dock-group dock-blocked" data-occupied={blocked.length > 0}>
        <div className="dock-head">
          <span className="label" style={{ color: blocked.length ? 'var(--red)' : 'var(--faint)' }}>
            {blocked.length ? `⚑ Blocked · ${blocked.length}` : 'No blockers'}
          </span>
        </div>
        <div className="dock-cards" data-density="full">
          {blocked.map((i) => (
            <div key={i.key} className="dock-blocked-card">
              <Ticket issue={i} view={view} onSelect={onSelect} />
              <span className="dock-reason">{i.blockedReason || 'Flagged'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DockGroup({ group, view, onSelect }) {
  const isQueue = group.kind === 'queue';
  const { density, show, more } = isQueue
    ? { density: 'chip', show: Math.min(group.issues.length, QUEUE_MAX), more: Math.max(0, group.issues.length - QUEUE_MAX) }
    : dockDensity(group.issues.length, WORK_MAX);
  return (
    <div className="dock-group" data-kind={group.kind}>
      <div className="dock-head">
        <span className="label">{group.name} · {group.issues.length}</span>
      </div>
      <div className="dock-cards" data-density={density}>
        {group.issues.slice(0, show).map((i) => (
          <Ticket key={i.key} issue={i} view={view} onSelect={onSelect} density={density} />
        ))}
        {more > 0 && <span className="dock-more mono">+{more} more</span>}
      </div>
    </div>
  );
}
