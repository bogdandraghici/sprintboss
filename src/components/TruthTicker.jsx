// src/components/TruthTicker.jsx
import { ageBand } from '../lib';
import { focusColumnCounts } from '../raid/raidState';

// The no-metaphor strip: per-column counts + stale, then every blocker with its
// reason. When a fighter is focused, every count narrows to their tickets.
export default function TruthTicker({ view, onSelect, focus = null }) {
  const agingOn = !view.flags?.noChangelog;
  const mine = (i) => !focus || i.assignee === focus;
  const lanes = view.columns
    .map((c, idx) => ({ ...c, idx }))
    .slice(0, -1)
    .filter((c) => !c.isBlockedZone);
  const fcounts = focusColumnCounts(view, focus);
  const blocked = view.issues.filter((i) => i.blocked && !i.done && mine(i));
  return (
    <div className="ticker mono">
      {lanes.map((c) => {
        const count = focus ? (fcounts.get(c.idx) || 0) : c.count;
        const stale = agingOn
          ? view.issues.filter((i) => i.col === c.idx && !i.blocked && !i.done && mine(i) &&
              ageBand(i.daysInColumn, view.aging) === 'stale').length
          : 0;
        return (
          <span key={c.name} className="ticker-col">
            {c.name.toLowerCase()} <b>{count}</b>
            {stale > 0 && <i className="ticker-stale"> {stale} stale</i>}
          </span>
        );
      })}
      <span className="ticker-sep">·</span>
      {blocked.length === 0 ? (
        <span className="ticker-ok">no blockers</span>
      ) : (
        blocked.map((i) => (
          <button key={i.key} className="ticker-block" onClick={() => onSelect(i)}>
            ⚑ {i.key} {i.blockedReason || 'flagged'}
          </button>
        ))
      )}
    </div>
  );
}
