// src/components/Dock.jsx
// The data half of the command deck: real tickets, grouped by board column.
// Every column shows the full card (summary + face + age) for all of its
// issues and scrolls internally instead of truncating; blocked is always loud.
import Ticket from './Ticket';
import { deriveDock } from '../raid/raidState';

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
        <div className="dock-cards">
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
  return (
    <div className="dock-group" data-kind={group.kind}>
      <div className="dock-head">
        <span className="label">{group.name} · {group.issues.length}</span>
      </div>
      <div className="dock-cards">
        {group.issues.map((i) => (
          <Ticket key={i.key} issue={i} view={view} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
