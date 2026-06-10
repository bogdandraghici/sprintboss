// Afterglow: events leave residue that cools over hours. Everything here is a
// pure function of (events, issues, now) — `now` is view.now (or the HUD's
// timeTravel-aware clock), NEVER Date.now() inside scene code. That makes the
// afterglow of any past moment reconstructable in retro mode for free.
import { HOUR } from '../lib';

export const SEGMENT_LIFE = 2 * HOUR;   // HP segment gold cool-down
export const AURA_LIFE = 2 * HOUR;      // attacker ember aura
export const SCAR_LIFE = 24 * HOUR;     // glowing impact scars on the boss
export const DEBRIS_LIFE = 24 * HOUR;   // planted swords on the battlefield
export const BEACON_LIFE = 24 * HOUR;   // blocked beacon freshness
export const SCAR_MAX = 8;

// 1 at the event, linear to 0 after `life`. Clamped both ends; null ts -> 0.
export const heat = (ts, now, life) =>
  ts == null ? 0 : Math.max(0, Math.min(1, 1 - (now - ts) / life));

// {issueKey -> 0..1} for done issues — drives HP segment afterglow.
export function segmentHeat(issues, now) {
  const m = new Map();
  for (const i of issues) {
    if (i.done && i.doneAt != null) m.set(i.key, heat(i.doneAt, now, SEGMENT_LIFE));
  }
  return m;
}

// Done events still warm under `life`: [{key, ts, heat}] in event order.
export const recentKills = (events, now, life) =>
  events
    .filter((e) => e.type === 'done')
    .map((e) => ({ key: e.key, ts: e.ts, heat: heat(e.ts, now, life) }))
    .filter((k) => k.heat > 0);

export const bossScars = (events, now) =>
  recentKills(events, now, SCAR_LIFE).slice(-SCAR_MAX);

export const debris = (events, now) => recentKills(events, now, DEBRIS_LIFE);

// {fighterName -> 0..1}: hottest recent kill per issue OWNER (the same
// key-not-actor routing rule as pulseActions — the closer may be a reviewer).
export function fighterAuras(events, issues, now) {
  const owner = new Map(issues.map((i) => [i.key, i.assignee]));
  const m = new Map();
  for (const e of events) {
    if (e.type !== 'done') continue;
    const name = owner.get(e.key);
    if (!name) continue;
    const h = heat(e.ts, now, AURA_LIFE);
    if (h > (m.get(name) || 0)) m.set(name, h);
  }
  return m;
}

// {fighterName -> 0..1}: freshness of the hottest live block they own.
// Blocked issues with no recorded event still appear at 0 (base brightness).
export function fighterBlockHeat(events, issues, now) {
  const lastBlocked = new Map();
  for (const e of events) if (e.type === 'blocked') lastBlocked.set(e.key, e.ts); // events are ts-sorted
  const m = new Map();
  for (const i of issues) {
    if (!i.blocked || i.done || !i.assignee) continue;
    const h = heat(lastBlocked.get(i.key) ?? null, now, BEACON_LIFE);
    if (!m.has(i.assignee) || h > m.get(i.assignee)) m.set(i.assignee, h);
  }
  return m;
}
