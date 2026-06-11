# Fighter focus filter — design

**Date:** 2026-06-11
**View:** Raid

## Goal

Let the user click a fighter in the battle scene to "focus" them. While a
fighter is focused, the whole Raid view becomes a lens on that person: the
dock columns, the boss HP bar, the battle scene, and the truth ticker all
respond to show / spotlight only that fighter's tickets.

## Selection & clearing

- **Select:** click a fighter's sprite in the 3D scene → that fighter is focused.
- **Switch:** click a different fighter → focus moves to them.
- **Clear:** click empty scene space (a click that hits no fighter) **or** press `Esc`.
- There is **no** toggle-off on the same fighter and **no** "show all" chip
  (explicitly declined during brainstorming).
- Each fighter sprite gets an **oversized invisible hit-box plane** so the
  small, camera-swaying sprite is easy to click on a TV / touch.

## Core architecture: focus is a presentation lens, not a data mutation

A single `focus` value — the focused assignee's **name** (string), or `null` —
lives in `RaidView`, the one parent shared by the scene, HP bar, dock, and
ticker. Each surface receives `focus` and applies it to its own rendering.

We **never** shrink `view.issues`. The boss's HP total, `remaining`, enrage
timer, and all sprint stats stay computed over the whole sprint — the boss is
still the whole sprint; focusing a fighter only spotlights their slice. This is
why a filtered-`view` approach was rejected: it would corrupt the boss HP total
and prevent the HP bar / scene from *dimming* (rather than deleting) other
fighters' content.

`focus` is ephemeral UI state:

- Not persisted (no `sb-*` localStorage key).
- Not part of `timeMachine` / retro reconstruction — retro is unaffected.
- Survives the 60s snapshot poll as ordinary React state.
- **Auto-clears** if, after a poll, the focused name no longer matches any
  fighter in the derived party (the person has no issues in the sprint).

## What each surface does when a fighter is focused

1. **Battle scene** (`ArenaScene` / `FighterSprite`)
   - Non-focused fighters dim (reuse the existing brightness lever already used
     for `exhausted` / `resting`; compose with it, don't overwrite it).
   - The focused fighter stays full-bright and gains a **subtle ground ring**
     as the selection cue.
   - Boss and minions are unchanged.

2. **Boss HP bar** (`HpBar` in `hud.jsx`)
   - Segments owned by *other* assignees drop in opacity; the focused fighter's
     segments stay vivid.
   - The "Boss HP — remaining / total" text is unchanged.

3. **Dock** (`Dock.jsx` + `deriveDock` in `raidState.js`)
   - Every column shows only the focused fighter's tickets.
   - Column headers keep the column name with the **filtered** count
     (e.g. `In Progress · 2`). The blocked column is filtered too.
   - An empty column renders its header with count 0 and no cards.

4. **Truth ticker** (`TruthTicker.jsx`)
   - Per-column counts and the stale / blocked entries recompute over the
     focused fighter's tickets.

## Interaction with existing ticket-click (unchanged)

`onSelect(issue)` everywhere (dock cards, HP segments, ticker blockers) still
opens the `TicketModal`. Selecting a fighter is a *separate* gesture (clicking a
sprite). The two never conflict: sprite clicks call the new focus handler;
card / segment clicks call the existing `onSelect`.

## Pure logic (unit-tested)

- `deriveDock(view, focus)` — gains an optional second arg. When `focus` is a
  non-null name, each group's `issues` and the `blocked` list are additionally
  filtered to `issue.assignee === focus`. When `focus` is null/undefined,
  behavior is identical to today (backward compatible).
- `focusColumnCounts(view, focus)` — small helper in `raidState.js` returning
  per-column ticket counts for the focused assignee, consumed by the ticker.
  Unit-tested.
- Sprite dimming and HP-segment dimming are a simple `name === focus`
  comparison — presentation only, no new pure logic.

## Implementation surface (files)

- `src/raid/RaidView.jsx` — `focus` state; `Esc` keydown handler (clear);
  auto-clear effect when focus leaves the party; thread `focus` + `onFocus`
  callback to `ArenaScene`, `HpBar`, `Dock`, `TruthTicker`.
- `src/raid/ArenaScene.jsx` — `<Canvas onPointerMissed={() => onFocus(null)}>`;
  pass `focus` + `onFocus` to fighters.
- `src/raid/FighterSprite.jsx` — oversized invisible hit-box mesh with
  `onClick` (stopPropagation) → `onFocus(fighter.name)`; dim when
  `focus && fighter.name !== focus`; ground ring when focused.
- `src/components/hud.jsx` (`HpBar`) — accept `focus`; dim non-focused segments.
- `src/components/Dock.jsx` — pass `focus` into `deriveDock`.
- `src/raid/raidState.js` — `deriveDock(view, focus)` filter.
- `src/components/TruthTicker.jsx` — accept `focus`; recompute counts.
- `src/index.css` — non-focused HP-segment dim style, selection ring (if any
  CSS needed; the ring itself is a 3D mesh), focused-state niceties.
- `src/raid/__tests__/raidState.test.js` — cases for `deriveDock(view, focus)`
  and the column-count helper.

## Edge cases

- **Unassigned tickets:** hidden from the dock while a fighter is focused (they
  belong to no fighter).
- **Empty column when focused:** header + count 0, no cards.
- **Focused fighter is blocked / resting / exhausted:** still focusable; their
  tickets still filter; scene dim composes with their status dim.
- **Focused fighter leaves the party after a poll:** focus auto-clears.
- **Retro / time-travel:** focus is UI-only and does not affect reconstruction.

## Out of scope (YAGNI)

- Multi-select (focusing several fighters at once).
- Persisting focus across reloads.
- A roster strip or any added HTML chrome in the scene.
- Filtering the Factory / Standup views (Raid only).
