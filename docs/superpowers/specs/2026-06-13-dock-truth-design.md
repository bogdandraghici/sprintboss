# Dock truth: story progress micro-bars + carryover badges

**Date:** 2026-06-13
**Status:** approved design, pending implementation plan

## Why

Two facts the team asks about constantly that Jira buries:

1. **How far along is each story?** Jira parent progress means opening every
   epic individually. The dock already groups tickets by story with a stable
   color — but says nothing about story-level completion.
2. **How long has this ticket been dragging across sprints?** Jira surfaces a
   ticket's sprint history nowhere visible. For an overrun-heavy board,
   carryover is the single most damning hidden number.

Both land on existing surfaces (dock story headers, ticket cards). No new
panels, no forecasting, no judgment colors — quiet facts only (Bogdan's call:
micro-bar with **no count text**; carryover as a **card badge**, not a ticker
aggregate).

## Feature 1: story progress micro-bar

### Data

New pure selector in `src/raid/raidState.js`:

```js
// storyProgress(view) -> Map(parentKey -> { done, total })
```

Computed over **all** `view.issues` (the dock's `deriveDock` excludes done and
blocked tickets, so this is a separate aggregation). Issues without
`parentKey` are ignored. Vitest-tested alongside `groupByStory`.

### Render

In `src/components/Dock.jsx` → `DockGroup`, each story sub-header
(`.substory`) gains a hairline progress bar:

- Full header width, ~2px tall. Whether it sits under the existing header
  rule or replaces it is an art-direction call (default for the first cut:
  under the rule).
- Fill = `done / total` in the story's existing `storyColor`; track = same hue
  at low opacity. **No count text, no verdict tone.**
- The same story shows the same bar in every column it appears in — story-wide
  truth, repetition reads as the story's signature.
- The "Other" cluster and the flat blocked list get **no bar**.
- Fighter focus does **not** filter the bar: it shows story-wide progress
  always (a fact about the objective, not the person); the cards beneath
  already filter.
- `total = 0` cannot occur (a story only renders because it has issues), but
  the selector returns `{done: 0, total: 0}` safely if queried.

Styling lives with the existing `.substory` CSS in `index.css`; exact
weight/opacity is Bogdan's art-direction pass. Light theme: bar uses the same
deepened story hues the headers already use.

## Feature 2: carryover badge

### Data

**Source: the Agile API `closedSprints` field** (one extra name in the
existing `getIssues` field list in `server/jira.js` — zero extra API calls).
Chosen over parsing changelog Sprint-field history: changelogs truncate on
long-lived tickets, and the oldest tickets — exactly the ones we care
about — are the ones most at risk of bad data.

- `normalize()` emits `priorSprints: [{ id, name }]` = entries of
  `fields.closedSprints` with `id !== currentSprintId` (guards the
  closed-fallback/retro case, where the viewed sprint is itself closed and
  appears in its own `closedSprints`).
- `shared/derive.js` carries it through to each output issue as
  `priorSprints` (array) — count derives from `.length`.
- `server/mock.js` synthesizes 2–3 veteran tickets (`priorSprints` of 1–3
  fake sprints) so mock mode exercises the badge.
- Missing field / non-array → `[]` (badge absent, never wrong).

### Render

- `src/components/Ticket.jsx`: tickets with `priorSprints.length >= 1` show a
  small mono badge — `×2`, `×3` — meaning "this is its **N**th sprint"
  (N = prior + current). Quiet scar, not alarm: `--dim` ink, with a slight
  emphasis ramp at ×3+ (treatment = art-direction pass). First-sprint tickets
  render nothing.
- `src/components/TicketModal.jsx`: one new `Meta` row — "Sprint history:
  3rd sprint" plus prior sprint names when available.
- Label math (`carryoverLabel(priorSprints)` → `'×3'` / ordinal text / null)
  is a pure helper in `src/lib.js`, unit-tested.

## Out of scope (YAGNI)

- No truth-ticker aggregate ("7 veterans").
- No per-story on-track/at-risk forecast.
- No carryover marks on the HP bar or in standup mode.
- No story progress in the quest-log/HUD band.

## Testing

- Pure logic (`storyProgress`, `carryoverLabel`, normalize's
  `priorSprints` filtering) — vitest (`npm test`).
- Dock header bar + card badge + modal row — browser preview verification
  (`npm run mock`), per house convention.
