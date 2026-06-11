# Sprint Boss

Ambient wall-display app that visualizes our live Jira sprint as a boss fight. Express server polls Jira (flowx.atlassian.net, board 28 "MVP Team"), serves `/api/snapshot`; React client renders it. Built for a TV: calm base state, punchy event animations.

## The two views (header toggle, persisted in `sb-view`)

- **Raid** (default; stored key `raid`, legacy `arena` migrates): the "command
  deck". Top band = per-ticket boss HP bar + scar timeline + enrage timer.
  Middle = HD-2D Three.js battle scene (`src/raid/`) — pure spectacle, no text;
  the damage log floats over it as a translucent combat log. Below = ticket
  dock (`Dock.jsx`): real tickets grouped by board column — every column
  (queue, working, and blocked) shows the full card for all of its issues and
  scrolls internally rather than truncating; blocked also carries its reason.
  Bottom = truth ticker. Completing a ticket = the owning fighter attacks (hit-stop,
  sparks, HP drains); scope creep = boss summons minions (cap 6 + horde);
  blocked = fighter downed with beacon; boss cracks at 75/50/25% HP
  (`bossStage`) and crumbles on a cleared sprint; sprint overrun = defeat grade.
  **Afterglow** (`src/raid/heat.js`): events leave residue that cools over
  hours — gold HP segments (~2h), boss scars (~24h), ember
  auras, fresher-burns-brighter beacons — all pure functions of
  `view.now − event.ts`, so retro reconstructs them. `?lite` query flag drops
  post-processing/dpr for weak TV hardware.
- **Factory** (legacy): conveyor-belt line (`FactoryLine.jsx`) + boss panel
  (`BossPanel.jsx`).

## Architecture rules

- Data layer is sacred: `useSnapshot` (poll + pulse detection), `shared/derive.js` (stats), `timeMachine.js` (retro mode reconstructs any past moment). The arena is a pure function of `view` + short-lived pulses — never put `Date.now()` in scene code; use `view.now`/`view.timeTravel`.
- Pure logic lives in `src/raid/raidState.js` (party/minions/actions/dock/stage
  selectors), `src/raid/heat.js` (afterglow decay), and `src/raid/sprites/`
  (20×28 per-class pixel matrices in `sprites/classes/` + `ops.js` upscale
  pipeline + rasterizer) — all vitest-tested (`npm test`). R3F components are
  verified in the browser preview.
- Sprites are in-code pixel matrices (strings + palette), rasterized to CanvasTextures at runtime — no image assets. Each weapon class (sword/hammer/bow/staff/daggers) has its own 20×28 body set in `sprites/classes/` with the weapon drawn in (there is no separate weapons module); upscaled 2× to 40×56 sheets. Per-person identity = palette + hair overlay + avatar head; roster in `sprites/roster.js`; unknown assignees get the `__recruit__` fallback. Proof tool: `node scripts/render-class.mjs <class>`. Attack pulses route by **issue key**, not event actor (the actor is whoever dragged the ticket).
- **Boss is the exception to no-image-assets**: it renders a generated sprite from `public/boss/idle.png` (optional `cast.png`) when present, else falls back to the in-code matrix (`sprites/boss.js`). Loader `bossArt.js` (linear filter — the art is painted, not pixel), layout math `bossArtMath.js` (fitPlane/crackSpecs, tested). Enrage/hit/HP-cracks/death are applied in-engine over a clean static sprite (so generate calm art); see `public/boss/README.md` for the generation spec + `scripts/key-art.py` to key out a white background.
- Avatars load via `/api/avatar` proxy (host-allowlisted) — the Atlassian CDN has no CORS headers and would taint WebGL textures.
- Snapshot cache lives in `server/snapshotStore.js`: in-memory on dev/Render, Vercel KV when `KV_REST_API_URL` is set. Long-lived hosts refresh via `setInterval` in `server/index.js`; on Vercel that branch is skipped and `getSnapshot()` refreshes lazily on read — the 60s client poll IS the refresh cadence (Hobby plan has no usable cron). `/api/refresh` (guarded by `CRON_SECRET`, exempt from the Google session middleware) is still available for the empty-room keep-warm case via the optional [.github/workflows/keep-warm.yml](.github/workflows/keep-warm.yml).
- Both views share HUD widgets from `src/components/hud.jsx`. `BossFigure.jsx` (SVG golem) is also used by boot/no-sprint screens — don't delete it.

## Constraints & conventions

- React 18 → pinned to @react-three/fiber **v8** / drei v9. No TypeScript — plain JSX. Theming via CSS variables in `index.css` (dark-first; scene reads them via `cssVar()` at mount).
- Board quirks: blocked is a *column* (treated as blocked zone), nothing is story-pointed (tickets mode), heavy mid-sprint scope creep.
- Workflow: commits go directly to `main`; pushes to github.com/flowx-ai/sprint-boss need Bogdan's explicit OK. `npm run dev` (live) / `npm run mock` (synthetic events for animation testing). Design docs: `docs/superpowers/specs/`, plans: `docs/superpowers/plans/`.
- Sprite art is draft quality pending Bogdan's art-direction pass; he's a designer — consult him before visual decisions.

## Keep this file current

When we make significant changes (new views/modes, data-layer changes, new conventions, metaphor changes), update this CLAUDE.md in the same session so future conversations start with accurate context.
