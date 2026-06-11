// Snapshot store: the single source of truth for "the latest Jira snapshot".
// On dev/Render it's an in-memory cache refreshed by a setInterval in the
// long-lived server process. On Vercel it's Vercel KV, refreshed by a cron
// job hitting /api/refresh — same shape, swap the storage.
//
// Pure functions are upstream (shared/derive.js). This module owns:
//  - the data source (Jira or mock),
//  - the storage (KV or memory),
//  - a refresh() that fetches and writes,
//  - a getSnapshot() that reads — with a lazy in-process fallback so a cold
//    function with empty KV still returns data on the very first request.

import { CONFIG } from '../shared/config.js';
import { createMockSource } from './mock.js';
import { createJiraSource } from './jira.js';

const MOCK = process.env.MOCK === '1';

export const source = MOCK
  ? createMockSource({
      scenario: process.env.MOCK_SCENARIO || 'doomed',
      evolve: process.env.MOCK_EVOLVE !== '0',
    })
  : createJiraSource(process.env);

// KV is opt-in: presence of the env vars Vercel injects when a KV store is
// linked. Anywhere else (dev, Render) falls back to module-scoped memory.
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const KEY = 'sb:snapshot:v1';

let kvPromise = null;
async function getKV() {
  if (!useKV) return null;
  if (!kvPromise) kvPromise = import('@vercel/kv').then((m) => m.kv);
  return kvPromise;
}

let memEntry = null;

async function readEntry() {
  const kv = await getKV();
  if (kv) return (await kv.get(KEY)) || null;
  return memEntry;
}

async function writeEntry(entry) {
  const kv = await getKV();
  if (kv) {
    // Snapshots are tiny (a few KB); no TTL — refresh overwrites every minute.
    await kv.set(KEY, entry);
  } else {
    memEntry = entry;
  }
}

// Fetch from Jira/mock and overwrite the stored entry. On error, keep the
// previous snapshot but stamp the new error so the client can show "stale".
export async function refreshSnapshot({ tick = true } = {}) {
  const prev = await readEntry();
  try {
    if (tick && source.tick) source.tick();
    const snap = await source.getSnapshot();
    const entry = { snap, fetchedAt: Date.now(), error: null };
    await writeEntry(entry);
    return entry;
  } catch (e) {
    console.error('[sprint-boss] refresh failed:', e.message);
    const entry = { snap: prev?.snap || null, fetchedAt: prev?.fetchedAt || 0, error: e.message };
    await writeEntry(entry);
    throw e;
  }
}

// Read the stored snapshot. If empty or older than maxAgeMs, refresh inline
// (handles cold starts on Vercel before cron has fired, and the very first
// request in dev).
export async function getSnapshot({ maxAgeMs = CONFIG.pollMs } = {}) {
  const entry = await readEntry();
  if (entry?.snap && Date.now() - entry.fetchedAt < maxAgeMs) return entry;
  try {
    return await refreshSnapshot({ tick: true });
  } catch {
    // Refresh threw — return the stale entry (or null) so the route can decide.
    return (await readEntry()) || { snap: null, fetchedAt: 0, error: 'No data yet' };
  }
}
