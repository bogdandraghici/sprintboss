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
