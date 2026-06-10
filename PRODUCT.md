# Sprint Boss

## Product purpose
A live Jira sprint visualization that is a useful tool disguised as a game.
Two linked views: the board as a factory conveyor (diagnostic: where work is
stuck) and the sprint as a boss fight (forecast: will we make it, what scope
creep costs). Runs as an ambient display on an office TV / Mac mini, and is
interactive when someone walks up to it.

## Register
product

## Users
- The whole dev team, passively, from across a room (TV, all day). Primary.
- Anyone who walks up to it: hover/click for ticket detail, deep link to Jira.
- The team during ceremonies: standup (per-person 24h summary, person
  selectable), retro (sprint scrubber).

## Tone
Industrial night shift: calm, instrument-like, dry humor in the game framing.
A control-room panel, not a casino. The ambient layer is nearly still; real
events (ticket done, scope added, new blocker) get short, punchy, legible
moments.

## Strategic principles
- Information first: every visual element encodes a real metric, or it's cut.
- Gamify the work, not the people. No leaderboards, no per-person aggregation.
  Attribution only on individual events.
- Readable from across the room. Color masses and big numerals first; text on
  approach.
- Degrade gracefully: missing points/changelog/sprint never produce wrong
  visuals, only quieter ones.

## Anti-references
- Jira itself (dense tables, chrome everywhere).
- Generic SaaS dashboards: identical stat-card grids, hero metrics, purple
  gradients.
- Idle-game/casino visual noise: constant motion, particles, glow on
  everything.
- Per-person productivity trackers of any kind.
