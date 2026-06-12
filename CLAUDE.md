# Sprint Boss

Ambient wall-display app that visualizes our live Jira sprint as a boss fight. Express server polls Jira (flowx.atlassian.net, board 28 "MVP Team"), serves `/api/snapshot`; React client renders it. Built for a TV: calm base state, punchy event animations.

## The view

The single view is **Raid** — the "command deck". (The legacy Factory view and
the header view-toggle were removed; the `sb-view` localStorage key is no longer
read or written.)

- **Raid**: Top band = per-ticket boss HP bar + scar timeline + enrage timer.
  Middle = HD-2D Three.js battle scene (`src/raid/`) — near-textless spectacle
  (the damage log floats over it as a translucent combat log), save for a subtle
  first-name caption planted on the floor under each fighter's feet
  (`FighterNames` in `ArenaScene.jsx`: muted `--dim`, low-opacity, focus-aware,
  world-space so it doesn't bob with the body). Below the scene, a
  **fighter roster bar** (`FighterBar.jsx`) sits above the dock: a strip of
  avatar + first-name chips (one per party member) that drives the same focus
  lens as clicking a fighter in the arena — click a chip to filter the whole
  command deck to that fighter; click it again (or the focused fighter) to clear,
  or use Esc / empty-space click. Both the arena fighters and the chips go
  through one `toggleFocus` in `RaidView` (re-click the active one ⇒ clear). It's
  pure presentation (drives `setFocus`, no state of its own). The `firstName`
  helper it shares with the floor captions now lives in `src/lib.js`. The arena's
  height is **user-adjustable**: a grip on its bottom edge (`.arena-resize` in
  `RaidView.jsx`) drag-resizes the scene (session-only `arenaH` state, not
  persisted; double-click resets to the CSS default), bounded by the pure tested
  `clampArenaHeight` in `src/raid/arenaResize.js` — another presentation lens
  like fighter focus / camera pan, never part of `view`. Below = ticket
  dock (`Dock.jsx`): real tickets grouped by board column and, within each
  column, sub-grouped by **story** (the Jira parent) — every story gets its own
  colored sub-header (even a single-ticket one, so a story reads the same in
  every column), and only truly parentless tickets collect under a quiet,
  always-labeled "Other" group (`groupByStory`/`storyColor` in `raidState.js`,
  tested). Every column shows the full card for all of its issues and scrolls
  internally rather than truncating; blocked stays flat (no sub-headers) but each
  card carries its story name inline + its reason. Each card leads with the
  Jira **issue-type icon** (proxied via `/api/icon`, in-code glyph fallback)
  instead of a staleness dot — staleness now reads from the bold age value plus
  a faint red wash on stale cards.
  Bottom = truth ticker. Completing a ticket = the owning fighter attacks (hit-stop,
  sparks, HP drains); between real attacks fighters also **shadow-box** — an
  ambient swing on a staggered ~4–9s per-fighter cadence so the line never goes
  static (`src/raid/flourish.js`, render-clock driven; cadence + 0.85× lunge are
  the tuning knobs). A flourish is purely decorative: no strike, no damage
  number, no boss hit — only completed tickets deal real damage. Eligibility is
  the tested `flourishEligible(status, tableau)`: fighting + resting fighters do
  it; the spent (down/exhausted) and the victory hop sit out. Defeat/overrun does
  NOT suppress it (the team is still grinding) — note this is the *normal* live
  state for an overrun-heavy board, so gating it on defeat made the whole scene
  look frozen.
  Scope creep = boss summons minions (cap 6 + horde);
  blocked = fighter downed with beacon; boss cracks at 75/50/25% HP
  (`bossStage`) and crumbles on a cleared sprint; sprint overrun = defeat grade.
  Clicking a fighter focuses them — dock, HP bar, scene, and ticker all filter
  to their tickets (presentation lens only; the scene cue is dimming the
  non-focused fighters, no floor ring; re-clicking the focused fighter, Esc, or
  an empty-space click clears). Each
  figure is grounded by a soft radial contact shadow planted on the floor (not
  parented to the body, so they lift off it when they bob/lunge); the floor
  itself is a depth-gradient plane (front sheen → panel tone → melts into the
  fog) rather than a flat line — both in `ArenaScene.jsx` as generated
  CanvasTextures.
  **Afterglow** (`src/raid/heat.js`): events leave residue that cools over
  hours — gold HP segments (~2h), boss scars (~24h),
  fresher-burns-brighter beacons — all pure functions of
  `view.now − event.ts`, so retro reconstructs them. (`fighterAuras` is still
  exported for retro/tests but no longer rendered — the on-floor ember-glow
  circles were cut.) `?lite` query flag drops post-processing/dpr for weak TV
  hardware.

## Architecture rules

- Data layer is sacred: `useSnapshot` (poll + pulse detection), `shared/derive.js` (stats), `timeMachine.js` (retro mode reconstructs any past moment). The arena is a pure function of `view` + short-lived pulses — never put `Date.now()` in scene code; use `view.now`/`view.timeTravel`.
- Camera pan/zoom is presentation-only interaction (like fighter focus), not part
  of `view`: wheel zooms toward the cursor, left-drag pans, both suppress the
  ambient sway while engaged and ease home after idle (Esc / double-click reset).
  Math is the pure, tested `src/raid/cameraControls.js`; the `CameraRig` in
  `ArenaScene.jsx` composes it with sway + hit-stop shake (uses the render clock
  `dt`, never `Date.now()`). Fighters/boss/minions set `fog={false}` so the wide
  spread isn't washed out by the environment fog (tuned for camera z≈12.4).
- Pure logic lives in `src/raid/raidState.js` (party/minions/actions/dock/stage
  selectors), `src/raid/heat.js` (afterglow decay), `src/raid/flourish.js`
  (ambient-swing scheduler), `src/raid/cardStats.js` (standup-card stat grid +
  `weaponClassLabel`), and `src/raid/sprites/`
  (20×28 per-class pixel matrices in `sprites/classes/` + `ops.js` upscale
  pipeline + rasterizer) — all vitest-tested (`npm test`). R3F components are
  verified in the browser preview.
- **Standup mode** (`src/components/Modes.jsx`, `StandupOverlay`) shows, beside
  the per-person moved/parked board, a full-height **fighter card**
  (`src/raid/FighterCard.jsx`): a standalone mini R3F `<Canvas>` reusing the
  arena's exact rig selection (`artSlugFor` → `FighterArtRig`/`FighterSprite`,
  self-animating idle/shadow-box off the render clock), plus a status badge,
  name, weapon-class role, and a 5-cell stat grid from `deriveParty` + the
  standup moved count. Pure bits in `cardStats.js`; the card module is
  `FighterCard.jsx` (capital F) — keep its stem distinct from any lowercase
  helper so the case-insensitive macOS FS doesn't mis-resolve the import.
  The card's tight crop can clip art PNGs that sit high in frame, so a
  per-fighter `cardY` roster field (read via `cardYFor`, like `artScale`)
  nudges each fighter vertically in the card only — a draft-art knob for
  Bogdan's framing pass.
- Sprites are in-code pixel matrices (strings + palette), rasterized to CanvasTextures at runtime — no image assets. Each weapon class (sword/hammer/bow/staff/daggers) has its own 20×28 body set in `sprites/classes/` with the weapon drawn in (there is no separate weapons module); upscaled 2× to 40×56 sheets. Per-person identity = palette + hair overlay + avatar head; roster in `sprites/roster.js`; unknown assignees get the `__recruit__` fallback. Proof tool: `node scripts/render-class.mjs <class>`. Attack pulses route by **issue key**, not event actor (the actor is whoever dragged the ticket). Pilot exception: a roster entry with `art: '<slug>'` + `public/fighters/<slug>.png` renders via `FighterArtRig` instead — painted art animated procedurally (`artPose.js`), matrix as loading/404 fallback; see `public/fighters/README.md`.
- **Boss is the exception to no-image-assets**: it renders a generated sprite from `public/boss/idle.png` (optional `cast.png`) when present, else falls back to the in-code matrix (`sprites/boss.js`). Loader `bossArt.js` (linear filter — the art is painted, not pixel), layout math `bossArtMath.js` (fitPlane/crackSpecs, tested). Enrage/hit/HP-cracks/death are applied in-engine over a clean static sprite (so generate calm art); see `public/boss/README.md` for the generation spec + `scripts/key-art.py` to key out a white background.
- Avatars load via `/api/avatar` proxy (host-allowlisted) — the Atlassian CDN has no CORS headers and would taint WebGL textures.
- Issue-type icons render from Jira's `issuetype.iconUrl` via the auth'd
  `/api/icon` proxy (Jira-host-allowlisted; falls back to a generic glyph and to
  404 in mock). Story = each issue's `parent` (`parentKey`/`parentName`), fetched
  alongside `issuetype` and carried through `derive.js`.
- Snapshot cache lives in `server/snapshotStore.js`: in-memory on dev/Render, Vercel KV when `KV_REST_API_URL` is set. Long-lived hosts refresh via `setInterval` in `server/index.js`; on Vercel that branch is skipped and `getSnapshot()` refreshes lazily on read — the 60s client poll IS the refresh cadence (Hobby plan has no usable cron). `/api/refresh` (guarded by `CRON_SECRET`, exempt from the Google session middleware) is still available for the empty-room keep-warm case via the optional [.github/workflows/keep-warm.yml](.github/workflows/keep-warm.yml).
- The Raid HUD widgets live in `src/components/hud.jsx`. `BossFigure.jsx` (SVG golem) is used by boot/no-sprint screens — don't delete it.

## Constraints & conventions

- React 18 → pinned to @react-three/fiber **v8** / drei v9. No TypeScript — plain JSX. Theming via CSS variables in `index.css` (dark-first; scene reads them via `cssVar()` at mount).
- Board quirks: blocked is a *column* (treated as blocked zone), nothing is story-pointed (tickets mode), heavy mid-sprint scope creep.
- Workflow: commits go directly to `main`; pushes to github.com/flowx-ai/sprint-boss need Bogdan's explicit OK. `npm run dev` (live) / `npm run mock` (synthetic events for animation testing). Design docs: `docs/superpowers/specs/`, plans: `docs/superpowers/plans/`.
- Sprite art is draft quality pending Bogdan's art-direction pass; he's a designer — consult him before visual decisions.

## Keep this file current

When we make significant changes (new views/modes, data-layer changes, new conventions, metaphor changes), update this CLAUDE.md in the same session so future conversations start with accurate context.
