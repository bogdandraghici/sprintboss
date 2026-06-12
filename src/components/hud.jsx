// src/components/hud.jsx
// Raid-frame widgets for the arena HUD.
import { useEffect, useMemo, useReducer, useState } from 'react';
import { fmtCountdown, fmtDate, fmtDays, timeAgo, cls, DAY } from '../lib';
import { segmentHeat } from '../raid/heat';

/* ── enrage timer ─────────────────────────────────────────────── */

export function EnrageTimer({ view }) {
  const [, tick] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  const [open, setOpen] = useState(false);

  const now = view.timeTravel ? view.now : Date.now();
  const ms = view.sprint.end - now;
  const s = view.stats;
  const unit = s.anyEstimated ? 'pts' : 'tickets';
  const slack = s.projectedFinish ? (view.sprint.end - s.projectedFinish) / DAY : null;

  return (
    <button className="enrage" data-open={open} onClick={() => setOpen((o) => !o)}>
      <span className="text-left">
        <span className="label label-faint block">Enrage timer</span>
        <span className="enrage-count" style={ms < 0 ? { color: 'var(--red)' } : null}>
          {fmtCountdown(ms)}
        </span>
      </span>
      <span className="text-right">
        <span className="enrage-chip" data-s={s.enraged ? 'enraged' : 'ok'}>
          {s.remaining <= 0 && s.total > 0 ? '✦ CLEARED' : s.enraged ? '⚠ ENRAGED' : 'ON TRACK'}
        </span>
        <span className="label label-faint block mt-1">ends {fmtDate(view.sprint.end)}</span>
      </span>

      <span className="enrage-math">
        <span>remaining <b>{s.remaining} {unit}</b></span>
        <span>
          velocity <b>{s.velocity.toFixed(1)} {unit}/day</b>{' '}
          <i style={{ color: 'var(--faint)' }}>({view.velocityWindowDays || 3}d rolling)</i>
        </span>
        <span>
          projected finish{' '}
          <b>{s.remaining <= 0 ? 'done' : s.projectedFinish ? fmtDate(s.projectedFinish) : 'never at this pace'}</b>
        </span>
        <span style={{ color: s.enraged ? 'var(--red)' : 'var(--teal)', fontWeight: 700 }}>
          {s.remaining <= 0
            ? 'scope cleared'
            : slack == null
              ? 'no completions in window'
              : slack >= 0
                ? `${fmtDays(slack)} to spare`
                : `misses deadline by ${fmtDays(-slack)}`}
        </span>
      </span>
    </button>
  );
}

/* ── segmented HP bar ─────────────────────────────────────────── */

export function HpBar({ view, onSelect, focus = null }) {
  // Like a real HP bar: living segments packed left, depleted (done) packed
  // right, so remaining HP reads as one contiguous block draining rightward.
  const segs = useMemo(
    () =>
      [...view.issues].sort(
        (a, b) =>
          (a.done ? 1 : 0) - (b.done ? 1 : 0) ||
          (a.addedMidSprint ? 1 : 0) - (b.addedMidSprint ? 1 : 0) ||
          (a.addedMidSprint ? a.addedAt - b.addedAt : a.created - b.created) ||
          a.key.localeCompare(b.key)
      ),
    [view.issues]
  );
  const s = view.stats;
  // Afterglow: freshly-killed segments glow gold and cool over ~2h.
  const now = view.timeTravel ? view.now : Date.now();
  const glow = segmentHeat(view.issues, now);
  const unit = s.anyEstimated ? 'pts' : 'tickets';

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="label">Boss HP</span>
        <span className="mono text-[0.8rem] font-bold">
          <span style={{ color: s.remaining > 0 ? 'var(--ink)' : 'var(--teal)' }}>{s.remaining}</span>
          <span style={{ color: 'var(--faint)' }}> / {s.total} {unit}</span>
          {s.scopeAddedPts > 0 && (
            <span style={{ color: 'var(--lime)' }}> (+{s.scopeAddedPts} creep)</span>
          )}
        </span>
      </div>
      <div className="hpbar">
        {segs.map((issue) => (
          <button
            key={issue.key}
            className="hpseg"
            style={{ flexGrow: issue.points, '--heat': glow.get(issue.key) || 0 }}
            data-done={issue.done}
            data-scope={issue.addedMidSprint}
            data-blocked={issue.blocked}
            data-dim={focus ? issue.assignee !== focus : undefined}
            title={`${issue.key} · ${issue.points} ${unit}${issue.done ? ' · done' : ''}${issue.addedMidSprint ? ' · added mid-sprint' : ''}`}
            onClick={() => onSelect(issue)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── scar timeline (scope creep history) ──────────────────────── */

export function ScarTimeline({ view }) {
  const { start, end } = view.sprint;
  const now = view.now;
  const span = end - start;
  const pct = (t) => `${Math.max(0, Math.min(100, ((t - start) / span) * 100))}%`;
  const days = Math.floor(span / DAY);

  // Cluster scope events per sprint day: 37 individual scars is noise,
  // "day 4: +9" is a story.
  const byDay = new Map();
  for (const e of view.events) {
    if (e.type !== 'scope-added') continue;
    const d = Math.floor((e.ts - start) / DAY);
    const g = byDay.get(d) || { ts: start + (d + 0.5) * DAY, pts: 0, keys: [] };
    g.pts += e.points;
    g.keys.push(e.key);
    byDay.set(d, g);
  }
  const scars = [...byDay.values()];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="mono text-[0.65rem]" style={{ color: 'var(--faint)' }}>
          {fmtDate(start)} <span style={{ color: 'var(--lime)' }}>✚</span> scars = scope creep
        </span>
        <span className="mono text-[0.65rem]" style={{ color: 'var(--faint)' }}>{fmtDate(end)}</span>
      </div>
      <div className="scarline">
        <div className="scar-track">
          <div className="scar-fill" style={{ width: pct(Math.min(now, end)) }} />
          {Array.from({ length: days - 1 }, (_, i) => (
            <span key={i} className="scar-day" style={{ left: pct(start + (i + 1) * DAY) }} />
          ))}
        </div>
        {scars.map((g, i) => (
          <span
            key={i}
            className="scar"
            style={{ left: pct(g.ts) }}
            title={`${fmtDate(g.ts)} · +${g.pts}: ${g.keys.slice(0, 6).join(', ')}${g.keys.length > 6 ? ` +${g.keys.length - 6} more` : ''}`}
          >
            {g.keys.length > 1 ? `+${g.pts}` : '+'}
          </span>
        ))}
        <span className="scar-now" style={{ left: pct(Math.min(now, end)) }} />
      </div>
    </div>
  );
}

/* ── damage log / activity feed ───────────────────────────────── */

export const LOG_TYPES = { done: 'HIT', 'scope-added': 'HEAL', blocked: 'BLOCK', unblocked: 'CLEAR', reopened: 'UNDO' };

export function DamageLog({ view }) {
  const rows = [...view.events].filter((e) => LOG_TYPES[e.type]).reverse().slice(0, 6);
  const now = view.timeTravel ? view.now : Date.now();
  return (
    <div className="dlog">
      <span className="label label-faint">Damage log</span>
      {rows.length === 0 && (
        <span className="text-[0.72rem]" style={{ color: 'var(--faint)' }}>No action yet this sprint.</span>
      )}
      {rows.map((e, i) => (
        <div
          key={`${e.ts}-${e.key}-${i}`}
          className="dlog-row"
          data-t={e.type}
          style={{ opacity: 1 - i * 0.13 }}
        >
          <span className="dlog-tag" data-t={e.type}>{LOG_TYPES[e.type]}</span>
          <span className={cls('dlog-delta')}>
            {e.type === 'done' ? `−${e.points}` : e.type === 'scope-added' ? `+${e.points}` : e.key}
          </span>
          <span className="dlog-who">
            {e.type === 'done' && `${e.key} landed by ${e.actor || 'someone'}`}
            {e.type === 'scope-added' && `${e.key} joined the sprint`}
            {e.type === 'blocked' && `flagged${e.actor ? ` by ${e.actor}` : ''}`}
            {e.type === 'unblocked' && 'unblocked'}
            {e.type === 'reopened' && `${e.key} reopened`}
          </span>
          <span className="dlog-ago">{timeAgo(e.ts, now)}</span>
        </div>
      ))}
    </div>
  );
}
