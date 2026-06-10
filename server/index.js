import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../shared/config.js';
import { createMockSource } from './mock.js';
import { createJiraSource } from './jira.js';

// API_PORT, not PORT — dev tooling (preview launchers, PaaS) injects PORT
// for the *web* process and would collide with Vite.
const PORT = Number(process.env.API_PORT || process.env.SB_PORT || 4000);
const MOCK = process.env.MOCK === '1';

const source = MOCK
  ? createMockSource({
      scenario: process.env.MOCK_SCENARIO || 'doomed',
      evolve: process.env.MOCK_EVOLVE !== '0',
    })
  : createJiraSource(process.env);

const app = express();

let cache = null;
let lastFetch = 0;
let lastError = null;

async function refresh({ force = false, tick = true } = {}) {
  if (!force && cache && Date.now() - lastFetch < CONFIG.pollMs) return cache;
  try {
    if (tick && source.tick) source.tick();
    cache = await source.getSnapshot();
    lastFetch = Date.now();
    lastError = null;
  } catch (e) {
    lastError = e;
    console.error('[sprint-boss] refresh failed:', e.message);
  }
  return cache;
}

app.get('/api/snapshot', async (_req, res) => {
  const snap = await refresh();
  if (!snap) return res.status(503).json({ error: lastError?.message || 'No data yet' });
  res.json({ ...snap, stale: !!lastError, staleError: lastError?.message || null });
});

// Mock-only levers for demoing hit / heal / block without waiting on chance.
if (MOCK) {
  app.post('/api/demo/:action', async (req, res) => {
    const fn = { hit: 'completeOne', heal: 'addScope', move: 'moveOne', block: 'blockOne', unblock: 'unblockOne' }[
      req.params.action
    ];
    if (!fn) return res.status(400).json({ error: `Unknown action "${req.params.action}"` });
    const key = source[fn]();
    await refresh({ force: true, tick: false });
    res.json({ ok: true, issue: key });
  });
}

// Keep the snapshot warm so events accumulate even with no client attached.
setInterval(() => refresh({ force: true }), CONFIG.pollMs).unref();
refresh({ force: true, tick: false });

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[sprint-boss] ${MOCK ? `MOCK (${process.env.MOCK_SCENARIO || 'doomed'})` : 'LIVE'} api on http://localhost:${PORT}`);
});
