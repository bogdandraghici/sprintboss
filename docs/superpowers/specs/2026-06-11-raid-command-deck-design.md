# Sprint Boss: Raid command deck — design

**Date:** 2026-06-11
**Status:** Approved (brainstorm with Bogdan)
**Replaces:** the Arena (3D raid scene) as the default view. Factory stays as the
secondary view. The conveyor metaphor is retired from the flagship; the boss
fight metaphor is kept and upgraded.

## Concept

A two-layer "command deck" screen, art-directed as **evolved HD-2D pixel**
(pixel sprites in a lit Three.js diorama — the existing recipe, pushed hard):

- **Scene layer** (~55% height): pure spectacle, zero text in the art.
  Pixel fighters with real-avatar bobblehead heads on the left, an upgraded
  golem boss on the right, minions for open scope-creep tickets, blocked
  owners knocked down under red beacons. The damage log floats over the
  scene's corner as a translucent MMO-style combat log.
- **Data layer**: boss HP bar + scar timeline + enrage chip on top; ticket
  dock below the scene; truth ticker at the very bottom.

Clutter control is structural: text never sits on top of art, each strip has
one job. Everything clickable → TicketModal, as today.

What was liked about Factory survives by design: the per-ticket segmented HP
bar, and real tickets visible with full detail (key, summary, age, owner).

## Layout (top to bottom)

1. **Top band** — `HpBar` (per-ticket segments, done packed right, creep in
   lime) + `ScarTimeline` beneath it + compact `EnrageTimer` chip top-right
   (expandable math panel as today).
2. **Scene** — wide diorama strip. Fighters in a loose staggered rank left,
   boss right, minions between. `DamageLog` overlays bottom-right.
3. **Dock** — ticket cards grouped by board column (see Dock behavior).
4. **Truth ticker** — raw per-column counts, stale counts, blocked list with
   reasons. Zero metaphor.

## State mapping (Jira → screen)

| Jira state | Scene | Data layer |
|---|---|---|
| Ticket completed | Owner attacks (routed by issue key): hit-stop → slash → boss flash + knockback → −N arc. Leaves glowing boss scar + planted-sword debris (~24h fade); attacker keeps ember aura while fresh | HP segment drains, glows gold, cools ~2h; HIT in log |
| Scope added | Boss summon cast: green floor glyph, minion rises (cap 6 + horde counter) | Lime HP segment, timeline scar, lime dock marker, HEAL in log |
| Scope-creep ticket done | Its minion dies (poof) + normal attack | as above |
| Blocked | Owner knocked down, red beacon — brighter when fresh | Card → Blocked group with reason; ticker; BLOCK in log |
| Unblocked | Fighter stands back up | CLEAR in log |
| All of a person's tickets stale | Fighter kneels, exhausted, dimmed | Age dots on cards |
| Enraged | Red color grade, eyes flare, embers double | ENRAGED chip |
| Reopened | Segment relights with a flash (boss "regenerates") | UNDO in log |
| Boss HP 75/50/25% | Crack overlays composite on; orange core glows through | — |
| HP reaches 0 | Death sequence: crumble, dust, slow-mo, victory poses; calm victory tableau persists | Bar gray, chip "Cleared" |
| Sprint ends with HP left | Boss triumphant idle, desaturated grade | Timer shows overrun in red |
| Unassigned tickets | No fighter; minion if scope-added | Dock card with recruit avatar |

## Afterglow (missed-event visibility)

Events leave **residue that cools over hours**, so a glance shows what
happened since you last looked. Heat is computed purely from
`view.now − event.ts` (and `issue.doneAt`) — no new state, retro mode
reconstructs the afterglow of any past moment for free.

- Freshly-done HP segments glow gold → cool to depleted gray over ~2h.
- Each recent hit leaves a glowing impact scar on the boss, dimming over the day.
- The fighter who landed a recent kill keeps a faint ember aura.
- Fresh blocks burn brighter: beacon intensity decays with age.
- Each kill plants a sword in the battlefield debris field, fading ~24h —
  a glance distinguishes a busy day from a quiet one.

Declined alternatives: idle instant-replay of recent events; persistent
last-event line in the ticker.

## Dock behavior

- Groups mirror the board: one group per working column. Done never appears
  (it lives in the HP bar + damage log). Blocked-zone columns drain into the
  Blocked group (Factory's maintenance-bay rule).
- Column 1 (To do) is always compact key-only rows — it's a queue.
- Other working columns get full cards: age dot (ageBand colors), key,
  age, summary, owner avatar + name, lime scope-creep marker.
- Blocked group: always full cards + blocked reason, red treatment.
- No scrolling on a TV: density auto-degrades per group — cards drop the
  summary line first (key + avatar + age survive), then collapse to chips
  with a "+N more" counter.
- One shared `Ticket` component with a `density` prop
  (`full` / `no-summary` / `chip`) keeps Factory, dock, and standup consistent.

## Graphics upgrade (the "real videogame" pass)

1. **Sprites.** Fighters 14×20 → 24×36 cells; frames: idle ×4, attack ×5
   (anticipation → strike → follow-through), hit-react, kneel ×2, downed,
   victory ×2. Rasterizer gains automatic dark-outline and 1px rim-light
   passes (rim keyed to scene light color). Bobblehead avatar heads stay.
2. **Boss.** 28×26 → ~48×44. Damage-state crack overlays at 75/50/25% HP
   with an ember-orange core glowing through. Breathing idle, slow-orbiting
   rock shards (billboards), hit reaction (white flash + knockback + shard
   jitter), summon cast with floor glyph, enrage state, full death sequence.
3. **Environment.** Layered parallax backdrop (distant ruins → pillars →
   floor props) under the existing slow camera drift; flickering brazier
   point lights; light shafts; ground-fog planes; embers + dust motes;
   reflective floor tuned wetter; debris field for afterglow swords.
4. **Post-processing.** Selective bloom (eyes, core, embers, trails),
   vignette, subtle grain, color grade shifting red on enrage, one-frame
   chromatic-aberration pulse on big hits.
5. **Game feel.** Hit-stop (~80ms, scaled to points) before screen shake;
   impact sparks + shockwave ring; arcing damage numbers; minion death poof;
   minion spawn-rise from glyph.

Idle motion runs off the R3F clock; never `Date.now()` in scene code —
pure function of `view` + short-lived pulses, so retro replays correctly.

## Architecture

Data layer untouched (`useSnapshot`, `derive.js`, `timeMachine`). Client-side:

- **View identity:** new view takes the `arena` slot — key `raid`, default
  view, header toggle Raid ↔ Factory. Stored `sb-view: 'arena'` reads as
  `raid`.
- **Evolve `src/raid/` in place.** `RaidView.jsx` becomes the command-deck
  layout composing existing `HpBar`/`ScarTimeline`/`EnrageTimer`/`DamageLog`
  (hud.jsx) + `TruthTicker` + new dock + scene.
- **New `src/raid/heat.js`:** afterglow math as pure functions of
  `(events, issues, now)` — segment cooling, boss scars, auras, beacon
  freshness, debris list.
- **`raidState.js` grows:** boss damage stage thresholds, dock grouping +
  density-degradation selectors.
- **Sprites:** `bodies.js`, `boss.js` upsized per above; `rasterize.js`
  outline + rim passes. Dimensions asserted in tests. Sprite art remains
  draft quality until Bogdan's art-direction pass.
- **`Effects.jsx`:** real post chain via `@react-three/postprocessing` 2.x
  (already installed, fiber-v8 compatible).
- **Perf:** devicePixelRatio cap, instanced particles, `?lite` query flag
  disables the post chain.
- Factory (`FactoryLine` + `BossPanel`) untouched. `BossFigure` stays for
  boot/no-sprint screens. CLAUDE.md updated in the shipping session.

## Testing

- Vitest (pure logic, as today): heat decay properties (monotonic, clamped,
  half-lives), damage-stage thresholds, dock grouping/density math, sprite
  matrix integrity (row widths, palette coverage, frame counts), rasterizer
  outline/rim passes.
- Browser preview against `npm run mock` for scene, animations, event
  choreography; retro scrubber verified to reconstruct afterglow.
- Bogdan art-directs sprite drafts before the view ships as default.

## Out of scope

- Audio.
- Idle instant-replay and persistent last-event ticker line (considered,
  declined).
- Changes to Factory view, standup overlay, retro scrubber mechanics.
- Photoreal/rigged 3D characters; image-asset pipeline (sprites stay in-code).
