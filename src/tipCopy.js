// src/tipCopy.js
// Tooltip copy for every explained mechanic — "metaphor + plain meaning" voice.
// Pure formatters only; components set the result as data-tip and the shared
// TooltipLayer renders it. Dynamic thresholds (aging, ordinals, counts) are
// always interpolated, never vague.
import { fmtDays, fmtDate, ordinal, firstName } from './lib';

export function ageTip(days, band, aging) {
  if (!aging || band === 'off') return null;
  const d = fmtDays(days);
  if (band === 'fresh') return `${d} in this column — fresh (≤${aging.freshDays}d).`;
  if (band === 'warm') return `${d} in this column — warm; stale past ${aging.warmDays}d.`;
  return `${d} in this column — stale (past ${aging.warmDays}d without moving).`;
}

export function carryTip(priorSprints) {
  const n = Array.isArray(priorSprints) ? priorSprints.length : 0;
  if (n < 1) return null;
  const base = `${ordinal(n + 1)} sprint for this ticket — carried over ${n}×.`;
  return n + 1 >= 3 ? `${base} Amber from ×3.` : base;
}

export const scopeTip = () => 'Joined mid-sprint — scope creep.';

export function hpSegTip(issue, unit) {
  let t = `${issue.key} · ${issue.points} ${unit}`;
  if (issue.done) t += ' · done';
  if (issue.blocked) t += ' · blocked';
  if (issue.addedMidSprint) t += ' · joined mid-sprint (scope)';
  return t;
}

export const bossHpTip = () =>
  'Boss HP = open work. One segment per ticket — it drains as tickets land; gold burned in the last ~2h.';

export const scarStripTip = () =>
  'Scope scars — each ✚ marks tickets that joined after the sprint started.';

export function scarTip(group, unit) {
  const keys = group.keys.slice(0, 6).join(', ') +
    (group.keys.length > 6 ? ` +${group.keys.length - 6} more` : '');
  return `${fmtDate(group.ts)} · +${group.pts} ${unit} joined mid-sprint: ${keys}`;
}

export function creepTip(n, unit) {
  return `${n} ${unit} joined after sprint start — the boss healed.`;
}

// Keyed by event type (matches LOG_TYPES in components/hud.jsx).
export const LOG_TAG_TIPS = {
  done: 'Ticket landed — the boss takes damage.',
  'scope-added': 'Scope added — the boss regains HP.',
  blocked: 'Ticket flagged blocked — its fighter goes down.',
  unblocked: 'Block lifted — the fighter is back up.',
  reopened: 'Done ticket reopened — its damage is undone.',
};
export const logTagTip = (type) => LOG_TAG_TIPS[type] || null;

export function storyMeterTip(p) {
  if (!p) return null;
  return `${p.done}/${p.total} of this story's sprint tickets done — counts every column.`;
}

// Keyed by fighter status (matches deriveParty in raid/raidState.js).
export const STATUS_TIPS = {
  fighting: 'Fighting — has fresh work in flight.',
  resting: 'Resting — nothing open right now.',
  exhausted: 'Exhausted — every open ticket has gone stale.',
  down: 'Down — has a blocked ticket.',
};
export const statusTip = (status) => STATUS_TIPS[status] || STATUS_TIPS.fighting;

export function chipTip(name, active) {
  return active
    ? `${firstName(name)} — click again to clear focus.`
    : `${firstName(name)} — click to focus the deck on their tickets.`;
}

export function staleCountTip(aging) {
  return aging ? `Parked past the stale threshold (${aging.warmDays}d).` : null;
}

export const beaconTip = () => 'Blocked — the beacon cools as the block ages (~24h).';

export function unestimatedTip(points, unit) {
  if (unit === 'pts') return `No estimate — assumed ${points} pts.`;
  return `No estimate — counted as ${points} ticket${points === 1 ? '' : 's'}.`;
}
