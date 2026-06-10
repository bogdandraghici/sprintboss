# Sprint Boss

Ambient wall-display app that visualizes our live Jira sprint as a boss fight. Express server polls Jira (flowx.atlassian.net, board 28 "MVP Team"), serves `/api/snapshot`; React client renders it. Built for a TV: calm base state, punchy event animations.

## The two views (header toggle, persisted in `sb-view`)

- **Arena** (default): HD-2D Three.js scene (`src/raid/`). Teammates are pixel-sprite fighters with their real Jira profile pictures as bobblehead-style heads; they fight the golem boss. Completing a ticket = the owning fighter attacks (HP drains); scope creep = boss summons a minion per mid-sprint ticket (cap 6 + horde counter); blocked = fighter knocked down with beacon; all-stale = kneeling exhausted. HUD overlays (HP bar, enrage timer, scar timeline, damage log, party frames) + "truth ticker" with raw per-column/blocked data.
- **Factory** (legacy): conveyor-belt line (`FactoryLine.jsx`) + boss panel (`BossPanel.jsx`).

## Architecture rules

- Data layer is sacred: `useSnapshot` (poll + pulse detection), `shared/derive.js` (stats), `timeMachine.js` (retro mode reconstructs any past moment). The arena is a pure function of `view` + short-lived pulses — never put `Date.now()` in scene code; use `view.now`/`view.timeTravel`.
- Pure logic lives in `src/raid/raidState.js` (party/minions/actions selectors) and `src/raid/sprites/` (pixel matrices + rasterizer) — all vitest-tested (`npm test`). R3F components are verified in the browser preview.
- Sprites are in-code pixel matrices (strings + palette), rasterized to CanvasTextures at runtime — no image assets. Roster in `sprites/roster.js`; unknown assignees get the `__recruit__` fallback. Attack pulses route by **issue key**, not event actor (the actor is whoever dragged the ticket).
- Avatars load via `/api/avatar` proxy (host-allowlisted) — the Atlassian CDN has no CORS headers and would taint WebGL textures.
- Both views share HUD widgets from `src/components/hud.jsx`. `BossFigure.jsx` (SVG golem) is also used by boot/no-sprint screens — don't delete it.

## Constraints & conventions

- React 18 → pinned to @react-three/fiber **v8** / drei v9. No TypeScript — plain JSX. Theming via CSS variables in `index.css` (dark-first; scene reads them via `cssVar()` at mount).
- Board quirks: blocked is a *column* (treated as blocked zone), nothing is story-pointed (tickets mode), heavy mid-sprint scope creep.
- Workflow: commits go directly to `main`; pushes to github.com/flowx-ai/sprint-boss need Bogdan's explicit OK. `npm run dev` (live) / `npm run mock` (synthetic events for animation testing). Design docs: `docs/superpowers/specs/`, plans: `docs/superpowers/plans/`.
- Sprite art is draft quality pending Bogdan's art-direction pass; he's a designer — consult him before visual decisions.

## Keep this file current

When we make significant changes (new views/modes, data-layer changes, new conventions, metaphor changes), update this CLAUDE.md in the same session so future conversations start with accurate context.
