// src/components/TruthTicker.jsx
import { ageBand } from '../lib';

// The no-metaphor strip: per-column counts + stale, then every blocker with its reason.
export default function TruthTicker({ view, onSelect }) {
  const agingOn = !view.flags?.noChangelog;
  const lanes = view.columns
    .map((c, idx) => ({ ...c, idx }))
    .slice(0, -1)
    .filter((c) => !c.isBlockedZone);
  const blocked = view.issues.filter((i) => i.blocked && !i.done);
  return (
    <div className="ticker mono">
      {lanes.map((c) => {
        const stale = agingOn
          ? view.issues.filter((i) => i.col === c.idx && !i.blocked && !i.done &&
              ageBand(i.daysInColumn, view.aging) === 'stale').length
          : 0;
        return (
          <span key={c.name} className="ticker-col">
            {c.name.toLowerCase()} <b>{c.count}</b>
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
