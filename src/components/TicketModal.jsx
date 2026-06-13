import { useEffect } from 'react';
import Avatar from './Avatar';
import { ageBand, fmtDays, fmtDate, ordinal } from '../lib';
import { unestimatedTip, beaconTip } from '../tipCopy';

export default function TicketModal({ issue, view, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!issue) return null;
  const band = view.flags?.noChangelog ? 'off' : ageBand(issue.daysInColumn, view.aging);
  const unit = view.stats.anyEstimated ? 'pts' : 'tickets';

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="panel modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <a
            href={issue.url}
            target="_blank"
            rel="noreferrer"
            className="mono font-bold text-[1.05rem] hover:underline"
            style={{ color: 'var(--teal)' }}
          >
            {issue.key}
          </a>
          {issue.addedMidSprint && (
            <span className="chip" style={{ color: 'var(--lime)', borderColor: 'var(--lime)' }}>
              SCOPE +{issue.points}
            </span>
          )}
          {issue.done && <span className="chip" style={{ color: 'var(--teal)' }}>DONE</span>}
          {!issue.estimated && (
            <span className="chip" style={{ color: 'var(--amber)', borderStyle: 'dashed' }} data-tip={unestimatedTip(issue.points, unit)}>
              UNESTIMATED
            </span>
          )}
          <button className="iconbtn ml-auto" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <h2 className="mt-3 mb-4 text-[1.15rem] font-semibold leading-snug">{issue.summary}</h2>

        {issue.blocked && (
          <div
            className="mb-4 rounded-md px-3 py-2 mono text-[0.78rem] font-semibold flex items-center gap-2"
            style={{ border: '1px solid var(--red)', color: 'var(--red)', background: 'var(--glow-red)' }}
            data-tip={beaconTip()}
          >
            <span className="beacon" /> BLOCKED{issue.blockedReason ? ` — ${issue.blockedReason}` : ''}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Meta label="Assignee">
            <span className="flex items-center gap-2">
              <Avatar name={issue.assignee} src={issue.assigneeAvatar} size="1.8rem" /> {issue.assignee || 'Unassigned'}
            </span>
          </Meta>
          <Meta label={view.stats.anyEstimated ? 'Story points' : 'Count'}>
            <span className="mono font-bold">{issue.estimated ? issue.points : `${issue.points} (assumed)`}</span>
          </Meta>
          <Meta label="Station">
            <span>
              {issue.colName}
              {' · '}
              <b className="mono" style={{ color: `var(--${{ fresh: 'teal', warm: 'amber', stale: 'red' }[band] || 'dim'})` }}>
                {fmtDays(issue.daysInColumn)}
              </b>{' '}
              <span style={{ color: 'var(--faint)' }}>in column</span>
            </span>
          </Meta>
          <Meta label="Cycle time">
            <span className="mono">{issue.cycleDays > 0 ? fmtDays(issue.cycleDays) : '—'}</span>
          </Meta>
          <Meta label="In sprint since">
            <span className="mono">
              {fmtDate(issue.addedAt)}
              {issue.addedMidSprint && <span style={{ color: 'var(--lime)' }}> (added mid-sprint)</span>}
            </span>
          </Meta>
          {issue.priorSprints?.length > 0 && (
            <Meta label="Sprint history">
              <span className="mono font-bold">{ordinal(issue.priorSprints.length + 1)} sprint</span>{' '}
              <span style={{ color: 'var(--faint)' }}>
                after {issue.priorSprints.map((s) => s.name).join(', ')}
              </span>
            </Meta>
          )}
          {issue.done && (
            <Meta label="Completed">
              <span className="mono">{fmtDate(issue.doneAt)}</span>
            </Meta>
          )}
        </div>

        <a
          href={issue.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2 font-semibold text-[0.8rem] tracking-wider uppercase"
          style={{ background: 'var(--ink)', color: 'var(--bg)' }}
        >
          Open in Jira ↗
        </a>
      </div>
    </div>
  );
}

function Meta({ label, children }) {
  return (
    <div>
      <div className="label label-faint mb-1">{label}</div>
      <div className="text-[0.85rem]">{children}</div>
    </div>
  );
}
