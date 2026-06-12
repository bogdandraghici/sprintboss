import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG } from '../shared/config.js';
import { createAuth } from './auth.js';
import { source, refreshSnapshot, getSnapshot } from './snapshotStore.js';

// Tri-mode entry: same file boots three runtimes.
//  - `npm run dev` / `npm start`: long-lived process — listens, polls Jira on
//    an interval, serves the built client in PROD.
//  - Render: identical to `npm start`.
//  - Vercel: imported by `api/index.js` as a serverless function — exports
//    `app`, skips `listen()`/setInterval, never serves static (Vercel's edge
//    serves `dist/` directly). The snapshot is kept warm by Vercel Cron
//    hitting /api/refresh once a minute (see vercel.json).
const PROD = process.env.NODE_ENV === 'production';
const ON_VERCEL = !!process.env.VERCEL;
const PORT = Number(process.env.API_PORT || (PROD && process.env.PORT) || 4000);
const MOCK = process.env.MOCK === '1';

const app = express();
app.set('trust proxy', 1);

const auth = createAuth(process.env);
auth.routes(app);
app.use(auth.middleware);
app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/snapshot', async (_req, res) => {
  const { snap, error } = await getSnapshot();
  if (!snap) return res.status(503).json({ error: error || 'No data yet' });
  res.json({ ...snap, stale: !!error, staleError: error });
});

// Cron-triggered snapshot refresh (Vercel Cron hits this once a minute).
// Auth: when CRON_SECRET is set, require it in the Authorization header —
// Vercel sends it automatically; manual probes need to pass it too. The
// Google-session middleware skips this path (see auth.js).
async function refreshHandler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    const entry = await refreshSnapshot({ tick: true });
    res.json({ ok: true, fetchedAt: entry.fetchedAt });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
}
app.get('/api/refresh', refreshHandler);
app.post('/api/refresh', refreshHandler);

// Avatar proxy: the Atlassian avatar CDN sends no CORS headers, which taints
// canvases — WebGL avatar textures need same-origin bytes. Host-allowlisted.
const AVATAR_HOSTS = new Set([
  'avatar-management--avatars.us-west-2.prod.public.atl-paas.net',
  'secure.gravatar.com',
]);
app.get('/api/avatar', async (req, res) => {
  let url;
  try {
    url = new URL(req.query.url);
  } catch {
    return res.status(400).json({ error: 'Bad url' });
  }
  if (url.protocol !== 'https:' || !AVATAR_HOSTS.has(url.hostname)) {
    return res.status(403).json({ error: 'Host not allowed' });
  }
  try {
    const upstream = await fetch(url, { redirect: 'follow' });
    if (!upstream.ok) return res.status(upstream.status).end();
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Issue-type icons live on the Jira host and need Basic auth — proxy them with
// the Jira creds, allowlisted to the configured base host only. Falls back to
// 404 when Jira isn't configured (mock mode), which the client renders as a glyph.
const JIRA_BASE = (process.env.JIRA_BASE_URL || '').replace(/\/+$/, '');
const JIRA_ICON_AUTH =
  process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN
    ? 'Basic ' + Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')
    : null;
app.get('/api/icon', async (req, res) => {
  if (!JIRA_BASE || !JIRA_ICON_AUTH) return res.status(404).end();
  let url;
  try {
    url = new URL(req.query.url);
  } catch {
    return res.status(400).json({ error: 'Bad url' });
  }
  if (url.protocol !== 'https:' || url.hostname !== new URL(JIRA_BASE).hostname) {
    return res.status(403).json({ error: 'Host not allowed' });
  }
  try {
    const upstream = await fetch(url, { headers: { Authorization: JIRA_ICON_AUTH }, redirect: 'follow' });
    if (!upstream.ok) return res.status(upstream.status).end();
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Mock-only levers for demoing hit / heal / block without waiting on chance.
if (MOCK) {
  app.post('/api/demo/:action', async (req, res) => {
    const fn = { hit: 'completeOne', heal: 'addScope', move: 'moveOne', block: 'blockOne', unblock: 'unblockOne' }[
      req.params.action
    ];
    if (!fn) return res.status(400).json({ error: `Unknown action "${req.params.action}"` });
    const key = source[fn]();
    await refreshSnapshot({ tick: false });
    res.json({ ok: true, issue: key });
  });
}

// Long-lived hosts (dev, Render) keep the snapshot warm in-process and serve
// the built client themselves. Vercel handles both differently (cron + edge).
if (!ON_VERCEL) {
  setInterval(() => refreshSnapshot({ tick: true }).catch(() => {}), CONFIG.pollMs).unref();
  refreshSnapshot({ tick: false }).catch(() => {});

  if (PROD) {
    const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.listen(PORT, () => {
    console.log(
      `[sprint-boss] ${MOCK ? `MOCK (${process.env.MOCK_SCENARIO || 'doomed'})` : 'LIVE'} api on http://localhost:${PORT}` +
        (auth.enabled ? ` · gated to @${auth.domain}` : ' · no auth gate (GOOGLE_CLIENT_ID unset)')
    );
  });
}

export default app;
