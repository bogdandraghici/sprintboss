# Fighter roster bar — design

## Goal

Add a horizontal bar above the ticket columns (the Dock) containing one
thumbnail per fighter. Clicking a thumbnail focuses that fighter — filtering the
dock, HP bar, scene, and ticker — exactly as clicking the fighter in the arena
already does. It is a second, more discoverable entry point into the existing
focus lens, not a new piece of state.

## Context

Fighter focus already exists end to end. In `src/raid/RaidView.jsx`, `focus`
holds the focused assignee's name (or `null`) and `setFocus` updates it. It is a
presentation lens only: never mutates `view`, never persisted, not part of retro
reconstruction. `setFocus` is already threaded to `ArenaScene` (`onFocus`) and
`HpBar`; `Dock`, `HpBar`, `TruthTicker`, and the scene all filter/dim on
`focus`. Clearing happens via Esc (`RaidView` keydown handler) or an
empty-space click in the arena (`ClearBackdrop`).

The new bar drives the same `setFocus`. No new state.

## Component

New file `src/components/FighterBar.jsx`:

```jsx
<FighterBar party={party} focus={focus} onFocus={setFocus} />
```

- Rendered in `RaidView.jsx` between the `.arena` block and `<Dock>`.
- `party` is the existing `deriveParty(view)` result already computed in
  `RaidView`. Pass it down rather than re-deriving.
- One thumbnail per `party` entry (assignees with sprint tickets), in
  `deriveParty`'s existing stable order, so the bar reads left-to-right
  identically to the battle row.

Each thumbnail:

- Is a real `<button>` (keyboard focusable; the TV's rare interactions stay
  accessible).
- Renders the existing `<Avatar name={f.name} src={f.avatar} size="..." />`
  (photo via the `/api/avatar` proxy, initials fallback).
- Shows the first-name caption beneath the avatar, using the shared `firstName`
  helper (see below).
- `onClick={() => onFocus(f.name)}` — sets focus only. No toggle. Clearing stays
  via Esc / empty-space click, matching arena behavior.

Visual state mirrors the scene's treatment: when `focus` is set, the focused
thumbnail is full-opacity and the rest dim (scene uses
`focus ? (focused ? 0.95 : 0.12) : 0.5`; the bar uses comparable opacities tuned
for DOM legibility). When `focus` is `null`, all thumbnails sit at rest.

## Shared `firstName` helper

`firstNameOf` currently lives as a local function in `ArenaScene.jsx`:

```js
function firstNameOf(name) {
  const first = String(name).split(/[\s._]+/).filter(Boolean)[0] || String(name);
  return first.charAt(0).toUpperCase() + first.slice(1);
}
```

Lift it into `src/lib.js` as `export function firstName(name)` (same logic).
Update `ArenaScene.jsx` to import and use it, and have `FighterBar` import it
too. This avoids a third copy. Targeted dedupe only — no broader refactor.

## Styling

CSS under a `.fighter-bar` block in `src/index.css`:

- Dark-first, using existing variables (`--ink`, `--dim`, `--steel-3`, etc.).
- Full dock width; horizontal scroll if the party outgrows the row.
- Calm, no animation — consistent with the ambient base aesthetic.
- Caption styling echoes the on-floor first-name captions (muted, low-key).

## Testing

- New pure logic: the extracted `firstName` helper. Add a vitest case
  (multi-word, dot/underscore separators, single token, capitalization).
- `FighterBar` is plain DOM (no R3F). Verify in the browser preview: focused
  thumbnail brightens and others dim, clicking filters the whole deck, initials
  fallback renders when no avatar URL.

## Out of scope (YAGNI)

- Status tints/rings on thumbnails.
- Ticket counts on thumbnails.
- Toggle-to-clear on thumbnail click.
- A separate "unassigned" chip.
```
