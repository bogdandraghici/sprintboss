# Sprint Boss

Your active Jira sprint as a live factory floor and a boss fight. A useful tool
disguised as a game: every pixel encodes a real metric.

- **Factory line** (left) — the board as a conveyor. Ticket color = age in
  column (teal ≤ 1d, amber ≤ 3d, red > 3d). Over the WIP limit = visible jam,
  the belt stalls. Blocked tickets fall off the belt into the maintenance bay.
- **Sprint boss** (right) — segmented HP bar (one segment per ticket, width =
  story points). Tickets done = hits with floating damage numbers. Scope added
  mid-sprint = the boss heals, and leaves a permanent scar on the timeline.
  If the rolling 3-day velocity won't clear the remaining points before the
  sprint ends, the boss **enrages**. Hover the enrage timer for the math.

## Run it

```bash
npm install
npm run mock          # full experience on generated data, no credentials
```

Open http://localhost:5173. For the real thing:

```bash
cp .env.example .env  # fill in JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BOARD_ID
npm run dev
```

Production: `npm run build && npm start` (Express serves `dist/` and the API
on one port, default 4000).

## Deploying to Vercel

The same `server/index.js` runs as a Vercel serverless function when imported
via [api/index.js](api/index.js). Vercel's edge serves `dist/` directly, and a
cron job hits `/api/refresh` once a minute to keep the snapshot warm in
Vercel KV — replacing the long-lived `setInterval` poll.

1. **Connect the repo to Vercel.** Framework preset: Vite. Build/output
   detected from [vercel.json](vercel.json).
2. **Create a KV store** in the Vercel dashboard (Storage → KV) and link it
   to the project. Vercel will inject `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` automatically; the snapshot store detects these and
   switches off in-memory caching ([server/snapshotStore.js](server/snapshotStore.js)).
3. **Set env vars** in Project Settings:
   - `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_BOARD_ID` — same
     as Render.
   - `SESSION_SECRET` — **required** on Vercel. Without it, every cold start
     mints a fresh secret and invalidates every session.
   - `CRON_SECRET` — required so only Vercel Cron (and you) can trigger
     `/api/refresh`. Vercel injects the matching `Authorization: Bearer`
     header automatically.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_EMAIL_DOMAIN`
     (defaults to `flowx.ai`) — only if you want the Google sign-in gate.
4. **Register the OAuth redirect URI** with Google Cloud Console:
   `https://<your-vercel-domain>/auth/callback` (and any custom domain you
   point at the project). The dev/Render redirect URI keeps working in
   parallel.
5. **Cron cadence.** [vercel.json](vercel.json) schedules `/api/refresh`
   every minute (`* * * * *`). Per-minute crons need the **Pro plan**; on
   Hobby the minimum is daily and the snapshot would stale out fast. If
   you're stuck on Hobby, drop the cron and rely on the lazy refresh in
   `getSnapshot()` (every cold start refetches Jira), or proxy an external
   uptime ping at `/api/refresh` instead.

After the first deploy: visit `https://<your-vercel-domain>/api/refresh`
once (with `Authorization: Bearer $CRON_SECRET`) to seed KV before opening
the dashboard, or just wait one minute for the cron's first tick.

## Modes (top-right)

- **Ambient** — default. Auto-refreshing, readable from across the room.
- **Standup** — per-person daily summary: pick a teammate (or ←/→ through
  them) and see what their tickets did in the last 24h (full column journeys,
  done/blocked highlighted) plus everything else of theirs still parked, with
  ages. Click any row for the ticket card.
- **Retro** — scrub the whole sprint; watch jams form and the boss heal.

## Mock levers

- `MOCK_SCENARIO=doomed|healthy` — enraged forecast vs. on-track.
- `MOCK_EVOLVE=0` — freeze the mock sprint (default: it mutates occasionally).
- `POST /api/demo/hit|heal|block|unblock|move` — trigger events on demand
  (the `hit / heal / block` chips in the header do this in mock mode).

## Tuning

All thresholds live in [shared/config.js](shared/config.js): aging bands, WIP
limits (Jira board column "max" constraints win when set), poll interval,
velocity window, unestimated-ticket weight.

## Deploy a shared instance

One-time setup on Render (free tier, deploys from this repo via `render.yaml`):

1. [dashboard.render.com](https://dashboard.render.com) → New → Blueprint →
   select this repo. Fill in the prompted env vars: the four `JIRA_*` values.
2. Share `https://<service-name>.onrender.com`. The service name in
   `render.yaml` carries a random suffix — **the URL is the only access
   control**, so share it like a password and rename the service to rotate it.
   The Jira token itself never leaves the server.

Optional hard gate: the server has built-in Google sign-in. Create an OAuth
client at [console.cloud.google.com](https://console.cloud.google.com)
(Credentials → OAuth client ID → Web application, redirect URI
`https://<service-name>.onrender.com/auth/callback`) and add
`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars on the service. Every
route then requires a verified `@flowx.ai` Google account
(`ALLOWED_EMAIL_DOMAIN` to change it); outsiders get a 403.

## Graceful degradation

- No story points → tickets count 1 each, HP bar labeled "tickets",
  unestimated tickets get a dashed `?` chip.
- No changelog access → aging colors are hidden rather than wrong.
- No active sprint → friendly empty state; the most recent closed sprint is
  served (with a CLOSED SPRINT badge) so retro mode still works.
- Jira down mid-session → last good snapshot stays up with a STALE DATA badge.

## Design rules

Gamify the work, not the people: no leaderboards, no per-person aggregation.
Attribution appears only on individual events in the damage log.
