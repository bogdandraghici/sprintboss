import { useState } from 'react';
import Avatar from './Avatar';
import { ageBand, fmtDays } from '../lib';

// Generic fallback glyph for unknown types / mock (no iconUrl) / proxy miss.
function GenericTypeGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// Jira issue-type icon (proxied PNG) with graceful fallback to the glyph.
function IssueTypeIcon({ src, type }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <span className="itype" title={type || ''}>
        <img src={src} alt={type || 'issue'} loading="lazy" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span className="itype" title={type || ''}>
      <GenericTypeGlyph />
    </span>
  );
}

// The one ticket card, used in the raid dock and the standup/retro overlays:
// type icon + key + age + face + full summary, with an optional story caption
// (for folded singletons in "Other") and an optional story-color left accent.
export default function Ticket({ issue, view, onSelect, accent = null, storyCaption = null }) {
  const band = view.flags?.noChangelog ? 'off' : ageBand(issue.daysInColumn, view.aging);
  return (
    <button
      className="ticket pop-in"
      data-age={band}
      data-unestimated={!issue.estimated}
      data-scope={issue.addedMidSprint}
      onClick={() => onSelect(issue)}
      title={`${issue.key} — ${issue.summary}`}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: '3px' } : undefined}
    >
      <IssueTypeIcon src={issue.issueTypeIcon} type={issue.issueType} />
      <span className="ticket-key">{issue.key}</span>
      {band !== 'off' && <span className="ticket-age">{fmtDays(issue.daysInColumn)}</span>}
      {issue.estimated && <span className="ticket-pts">{issue.points}</span>}
      <span className="ticket-face">
        <Avatar name={issue.assignee} src={issue.assigneeAvatar} />
      </span>
      {storyCaption && (
        <span className="story-cap" style={{ '--capc': storyCaption.color }}>{storyCaption.name}</span>
      )}
      <span className="ticket-summary">{issue.summary}</span>
    </button>
  );
}
