export const DAY = 86_400_000;
export const HOUR = 3_600_000;

export const cls = (...xs) => xs.filter(Boolean).join(' ');

export function ageBand(days, aging) {
  if (!aging) return 'off';
  if (days <= aging.freshDays) return 'fresh';
  if (days <= aging.warmDays) return 'warm';
  return 'stale';
}

export function fmtDays(days) {
  if (days < 1) {
    const h = Math.round(days * 24);
    return h <= 0 ? 'now' : `${h}h`;
  }
  if (days >= 10) return `${Math.round(days)}d`;
  return `${days.toFixed(1).replace(/\.0$/, '')}d`;
}

export function timeAgo(ts, now = Date.now()) {
  const m = Math.max(0, Math.round((now - ts) / 60_000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function fmtCountdown(ms) {
  const over = ms < 0;
  let s = Math.abs(ms) / 1000;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const body = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return over ? `${body} over` : body;
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fmtDateTime(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function initials(name) {
  if (!name) return '·';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function hueOf(name) {
  let h = 0;
  for (const c of String(name || '')) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function firstName(name) {
  const first = String(name).split(/[\s._]+/).filter(Boolean)[0] || String(name);
  return first.charAt(0).toUpperCase() + first.slice(1);
}
