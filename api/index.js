// Vercel serverless entry. The Express app (server/index.js) detects
// process.env.VERCEL and skips listen()/setInterval/static-serving when
// imported here — Vercel's edge handles static `dist/` and cron handles the
// keep-warm. The rewrite in vercel.json funnels /api/*, /auth/*, /healthz to
// this function so Express sees the original URL.
export { default } from '../server/index.js';
