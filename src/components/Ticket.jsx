import Avatar from './Avatar';
import { ageBand, fmtDays } from '../lib';

// The one ticket card, identical everywhere it appears (factory line, standup).
export default function Ticket({ issue, view, onSelect }) {
  const band = view.flags?.noChangelog ? 'off' : ageBand(issue.daysInColumn, view.aging);
  return (
    <button
      className="ticket pop-in"
      data-age={band}
      data-unestimated={!issue.estimated}
      data-scope={issue.addedMidSprint}
      onClick={() => onSelect(issue)}
      title={`${issue.key} — ${issue.summary}`}
    >
      <span className="age-dot" />
      <span className="ticket-key">{issue.key}</span>
      {band !== 'off' && <span className="ticket-age">{fmtDays(issue.daysInColumn)}</span>}
      <span className="ticket-pts">{issue.estimated ? issue.points : '?'}</span>
      <span className="ticket-face">
        <Avatar name={issue.assignee} src={issue.assigneeAvatar} />
      </span>
      <span className="ticket-summary">{issue.summary}</span>
    </button>
  );
}
