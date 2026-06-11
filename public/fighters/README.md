# Painted fighter sprites

A fighter renders painted art when its roster entry (`src/raid/sprites/roster.js`)
has an `art: '<slug>'` field and `<slug>.png` exists here. No field / no file /
load failure → the in-code pixel-matrix fighter renders instead (always safe).
Renderer: `src/raid/FighterArtRig.jsx` (procedural animation via `src/raid/artPose.js`);
loader: `src/raid/fighterArt.js`. Pilot shipped June 2026 with one fighter
(Gabi Muscalu = `paladin`); the rest of the team is added one at a time as
Bogdan supplies each character image — follow the runbook below.

## Adding a fighter (runbook)

1. **Get the image from Bogdan** — one character, calm idle pose, full body,
   ~1024px tall. Any background is fine (white, gradient, or already
   transparent); the prep script handles all three. Do NOT use leftover images
   from his Downloads — he hands over each character explicitly.

2. **Prep the sprite** (keys background, kills semi-transparent glow fringe,
   crops so the feet sit at the image bottom):

   ```bash
   python3 scripts/prep-fighter.py "<path-to-source.png>" <slug>
   ```

   Then LOOK at `public/fighters/<slug>.png`: background fully transparent,
   character intact (weapon/props not eaten), feet at the bottom edge. If the
   keying mangles it, ask Bogdan for a transparent export — never ship a
   mangled sprite.

3. **Get the EXACT Jira display name — never hand-type it.** Display names can
   be raw account ids with INVISIBLE characters (Gabi's is
   `gabriel.​muscalu` — zero-width space after the dot). With the dev
   server running:

   ```bash
   curl -s http://localhost:5173/api/snapshot | python3 -c "
   import json, sys
   d = json.load(sys.stdin)
   for n in sorted({i.get('assignee') for i in d.get('issues', []) if i.get('assignee')}):
       print(repr(n))
   "
   ```

   Use the `repr()` output verbatim; write any non-ASCII/invisible codepoints
   as explicit `\uXXXX` escapes in the roster key (see Gabi's entry for the
   pattern), so no editor can silently drop them.

4. **Add the roster entry** in `src/raid/sprites/roster.js`: the exact-name
   key, the usual matrix fields (`hair`, `weapon`, `palette` — these render
   while the texture loads and if it 404s), plus `art: '<slug>'`.

5. **Pin it in the tests**: extend the `artSlugFor` describe in
   `src/raid/__tests__/sprites.test.js` with the new name → slug expectation
   (again with `\u` escapes if needed). Run `npx vitest run` — all green.

6. **Verify in the preview**: reload the Raid view; the fighter renders
   painted at 1.6 world units beside the matrix fighters, feet on the
   baseline, breathing. (Status poses: blocked = laid out + beacon;
   all-stale = slump.) Commit as `feat(raid): <name> painted fighter`.

Gotcha: the client polls every **60s** (`shared/config.js` pollMs) — even in
mock mode (`npm run mock`), the header demo buttons (hit/heal/block) only take
effect on the next poll tick. Mock sims run server-side; restart the mock
server (not the page) to reset one.

## File requirements

- One character, calm idle pose, full body. The engine adds ALL motion:
  breathing, attack lunges with smears, blocked/victory poses, flashes, dust.
  Don't bake in action poses, shadows, ground, or text.
- Transparent background, cropped so the feet sit at the image bottom
  (`scripts/prep-fighter.py` does both).
- ~1024px tall sources are fine — textures are downscaled to ≤512px at load.
- Style reference: chunky pixel-art like `public/boss/idle.png`; the face is
  the person's identity (no photo-disc head on art fighters).

`*-raw.png` files are untracked source dumps; only `<slug>.png` files ship.

## Deferred polish (waiting on Bogdan's go)

- Generic **recruit** character art for unknown assignees (until then they
  stay pixel-matrix — by design).
- **Class-flavored ranged attacks** (bow draw + arrow streak, staff bolt) —
  spec'd as a follow-up in
  `docs/superpowers/specs/2026-06-12-painted-fighter-pilot-design.md`.
- Glint-sweep idle polish; layered cutout puppetry (cape/arm planes — the rig
  is already shaped for it).
- Open art-direction question: the rig dims a downed painted fighter to 0.5;
  matrix fighters stay full-bright when down. Bogdan to pick one.

Fighter size dial: `ART_FIGHTER_H` in `src/raid/FighterArtRig.jsx` (1.6).
