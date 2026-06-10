import Ticket from './Ticket';
import { ageBand, fmtDays } from '../lib';

export default function FactoryLine({ view, onSelect }) {
  // Done never rides the belt; blocked-zone columns drain into the bay instead.
  const lanes = view.columns
    .map((col, idx) => ({ ...col, idx }))
    .slice(0, -1)
    .filter((col) => !col.isBlockedZone);
  const blocked = view.issues.filter((i) => i.blocked && !i.done);

  return (
    <section className="panel factory">
      <div className="stations">
        {lanes.map((col) => (
          <Station key={col.name} col={col} idx={col.idx} view={view} onSelect={onSelect} />
        ))}
      </div>
      <div className="belt">
        {lanes.map((col) => (
          <div key={col.name} className="belt-seg" data-jammed={col.jammed} />
        ))}
      </div>
      <MaintenanceBay blocked={blocked} onSelect={onSelect} />
      <StatLine view={view} />
    </section>
  );
}

function Station({ col, idx, view, onSelect }) {
  // Blocked items fall off the belt into the bay; they still count toward WIP.
  // Stalest first: when a column scrolls, the diagnosis is above the fold.
  const items = view.issues
    .filter((i) => i.col === idx && !i.blocked)
    .sort((a, b) => a.columnSince - b.columnSince);
  const agingOn = !view.flags?.noChangelog;
  const stale = agingOn ? items.filter((i) => ageBand(i.daysInColumn, view.aging) === 'stale').length : 0;

  return (
    <div className="station" data-jammed={col.jammed}>
      <div className="station-head">
        <span className="label">{col.name}</span>
        {stale > 0 && <span className="station-stale">{stale} stale</span>}
        <span className="station-wip">
          {col.count}
          {col.wipLimit != null && `/${col.wipLimit}`}
          {col.jammed && ' JAM'}
        </span>
      </div>
      <div className="station-items">
        {items.map((issue) => (
          <Ticket key={issue.key} issue={issue} view={view} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function MaintenanceBay({ blocked, onSelect }) {
  const occupied = blocked.length > 0;
  return (
    <div className="bay" data-occupied={occupied}>
      <span className="label" style={{ color: occupied ? 'var(--red)' : 'var(--faint)', flex: 'none' }}>
        {occupied ? '⚠ Maintenance bay' : 'Maintenance bay clear'}
      </span>
      {occupied && (
        <div className="bay-items">
          {blocked.map((issue) => (
            <button key={issue.key} className="bay-ticket" onClick={() => onSelect(issue)} title={issue.summary}>
              <span className="beacon" />
              <span className="ticket-key mono" style={{ flex: 'none' }}>{issue.key}</span>
              <span className="bay-reason">{issue.blockedReason || 'Flagged'} · {issue.colName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatLine({ view }) {
  const lanes = view.columns.slice(0, -1);
  const unit = view.stats.anyEstimated ? 'pts' : 'tickets';
  return (
    <div className="statline">
      <span>out <b>{view.stats.throughput.toFixed(1)}/day</b></span>
      <span>shipped <b style={{ color: 'var(--teal)' }}>{view.stats.completed} {unit}</b></span>
      <span>
        dwell{' '}
        {lanes.map((c, i) => (
          <span key={c.name}>
            {i > 0 && ' · '}
            {c.name.toLowerCase()}{' '}
            <b className={c.avgDwellDays != null && c.avgDwellDays > view.aging.warmDays ? 'warn' : ''}>
              {c.avgDwellDays != null ? fmtDays(c.avgDwellDays) : '—'}
            </b>
          </span>
        ))}
      </span>
    </div>
  );
}
