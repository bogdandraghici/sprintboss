# Sprint Boss — design system

## Direction (user-confirmed)
- Boss character: factory golem (boiler body, gauge chest, smokestacks); the
  conveyor and the boss share one industrial world.
- Palette: "industrial night shift", dark-first for the TV, with a warm-paper
  light theme.
- Motion: calm base, punchy events. Ambient layer near-still; hits/heals/
  blocks get short loud moments.
- Theme default: dark.

## Tokens (CSS custom properties in src/index.css)
- Surfaces dark: bg #0a0e13, panel #101822, panel-2 #0c1219, inset #080d12,
  lines #1e2c3b / #2b3f54.
- Ink: #e8eef4, dim #8da0b3, faint #54677a.
- Signals: teal #2dd4bf (fresh / damage), amber #fcbf3e (warming / caution),
  red #ff5263 (stale / jam / enrage), lime #a8e34d (scope creep / heal).
- Steel family for the golem: #2c3d4f / #43596f / #16222e.
- Light theme: warm paper bg #e7e4dc, panels #f7f5ef, signals darkened for
  contrast.

## Typography
- Chakra Petch (display, signage, labels), IBM Plex Mono (numerals,
  instrumentation, keys). Root font-size scales with viewport
  (clamp 11px–22px) so the same layout reads on a TV.
- Labels: uppercase, 0.16em tracking, small, dim.

## Semantics (do not repurpose)
- Teal = good/fresh/damage-to-boss. Amber = aging/caution. Red = stale,
  jammed, blocked, enraged only. Lime = scope creep only.
- Red is rationed: if everything glows red, nothing is an alarm.

## Components
- Panels: 1px line border, 0.7rem radius, faint top-light gradient. No nested
  cards.
- Tickets: ONE quiet line: age dot · mono key · age numeral · points · avatar.
  Neutral surface; age lives only in the dot + numeral. No side stripes, no
  glows, no summary inline (hover/click for detail). Unestimated = amber "?".
- Stations: header carries the aggregates readable from TV distance:
  count/WIP (red when jammed) and "n stale" when any ticket is over the red
  threshold.
- Maintenance bay: a whisper when clear (one dim text line); framed dashed
  alarm zone only when occupied.
- Stats: one mono instrumentation line, no chip cards.
- Belt: animated hazard stripes; jam = segment stops, turns red.
- Boss HP: segmented bar, width = points; done = ghost outline; scope = lime
  hatch; blocked = red ring.
- Damage log: borderless mono lines fading with age (opacity ramp), worded
  chips (HIT/HEAL/BLOCK/CLEAR), newest first, max 6.
- Loudness budget: at rest the only saturated elements are age dots, the
  shipped number, and scars. Red frames/glows are reserved for jam, blocked,
  and enrage. ON TRACK is quiet text; only ENRAGED gets a filled chip.

## Motion rules
- Events: hit shake 0.55s, float numbers 2.4s, heal glow, scar pop. Exponential
  ease-out. No bounce/elastic on ambient elements.
- Ambient: belt stripes drift, boss bob 4.2s, steam puffs. Nothing else moves
  at rest.
- prefers-reduced-motion collapses all animation.
