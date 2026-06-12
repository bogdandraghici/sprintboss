# Dock story grouping + issue-type icons — design

**Date:** 2026-06-12
**View:** Raid (dock only)

## Goal

Surface each ticket's **story** (its Jira parent) in the dock, and show each
ticket's **issue type** (Bug / Task / Sub-task / Story / …) on the card. Today
the dock groups tickets only by board column and the leading glyph is a
staleness dot; neither the story nor the issue type is visible anywhere.

Constraint the user set: this is necessary information, but the dock is a dense
wall display — be mindful of clutter.

## Two changes, one feature

1. **Story sub-grouping inside each column** — tickets cluster under their
   story, with a per-story accent color.
2. **Issue-type icon replaces the staleness dot** — the leading glyph becomes
   the Jira issue type; staleness moves to the age value + a stale-card wash.

The board-**column** structure is preserved in both cases — a column still maps
to a real board state (which the app treats as sacred). Story and type ride
along *inside* the existing columns; we never regroup the dock by story across
columns.

## Data layer

Story and issue-type data are **not** in the snapshot today and must be added.

### `server/jira.js`

- Add `parent` and `issuetype` to the requested `fieldList` (currently
  `summary, status, assignee, created, updated, labels, storyPoints, flagged`).
  Both are standard fields — one extra field each, negligible fetch cost.
- In `normalize()`, extract onto each issue:
  - `parentKey` — `fields.parent?.key ?? null`
  - `parentName` — `fields.parent?.fields?.summary ?? null`
  - `issueType` — `fields.issuetype?.name ?? null` (e.g. `"Bug"`, `"Task"`,
    `"Sub-task"`, `"Story"`)
  - `issueTypeIcon` — the **proxied** form of `fields.issuetype?.iconUrl`
    (see "Icon proxy" below), or `null`
  - `isSubtask` — `fields.issuetype?.subtask === true`

### `shared/derive.js`

- Pass `parentKey`, `parentName`, `issueType`, `issueTypeIcon`, `isSubtask`
  through `deriveSnapshot` onto each derived issue object, alongside the existing
  fields. No transformation — they are carried verbatim.

### `server/mock.js`

- Extend the `mk()` fixture helper to accept `parent` (`{key, name}`) and
  `type` (issue-type name). Assign parents + types across the mock issues so
  that `npm run mock` exercises: multi-ticket stories, single-ticket stories,
  parentless tickets, and all four common types. Mock `issueTypeIcon` is `null`
  (mock has no Atlassian CDN) → the in-code generic-glyph fallback renders, which
  is itself worth seeing in mock.

### Icon proxy

`issuetype.iconUrl` points at the Atlassian host, which needs the same
auth/CORS handling as avatars. Route it through the **existing avatar proxy**
mechanism (`/api/avatar`, host-allowlisted) rather than a new endpoint — same
host, same allowlist. The server stores the proxied URL in `issueTypeIcon`.
If the proxy/image fails to load, the card falls back to a generic in-code glyph
(see Rendering). This keeps the dock resilient when an icon 404s or auth lapses.

> Note: unlike fighter-head avatars, dock icons render only as DOM `<img>`, never
> as WebGL textures — so the proxy here is about auth + host uniformity, not
> texture tainting. The fallback glyph means a proxy miss degrades gracefully.

## Grouping logic — `src/raid/raidState.js` (pure, vitest-tested)

A new pure selector groups one column's issues by story. It is a pure function
of the issue list (no `Date.now()`, no React) so it is unit-tested and works
identically in live and retro.

### Signature & shape

```
groupByStory(issues) -> {
  stories: [ { key, name, color, issues: [...] } ],   // 2+ tickets each
  other:   [ ...issues ]                               // singletons + parentless
}
```

### Rules

- **Qualifying story:** a `parentKey` with **2+ tickets in this column** becomes
  its own `stories[]` cluster. This threshold is **per column**, so the same
  story can have a colored header in one column (3 tickets) and fold into
  `other` in another (1 ticket). This is intentional — it groups where grouping
  pays off and stays quiet where it would just add headers.
- **`other`:** every ticket whose story has only 1 ticket in this column, plus
  every parentless ticket (`parentKey == null`). A column where no story reaches
  2 collapses to just `other` — zero sub-headers.
- **Ordering:**
  - Within a story cluster, tickets keep the column's existing sort
    (stalest first / by `columnSince`).
  - Story clusters are ordered worst-first by their **stalest member**, so the
    column still reads urgency-first.
  - `other` always renders **last**.
  - Within `other`, keep the existing sort; folded-singleton and parentless
    tickets intermix by staleness (no sub-ordering by story).

### Color assignment

- `color` is a deterministic function of `parentKey`: hash the key into a small
  **curated palette** of accent hues (defined as CSS variables, dark- and
  light-theme aware). Same parent key → same hue in every column and across
  renders/polls. Collisions (more distinct stories than palette entries) are
  accepted — two stories may share a hue; the name disambiguates.
- The palette is **draft quality** pending Bogdan's art-direction pass.
- Folded singletons in `other` use their story's hue for the inline caption text
  (so a single-ticket story is still color-consistent with its multi-ticket
  appearances elsewhere).

## Rendering — `Dock.jsx`, `Ticket.jsx`, CSS

### `DockGroup` (`Dock.jsx`)

- Call `groupByStory` on the column's issues.
- Render each `stories[]` entry as a **story sub-header** (`.substory`: a thin
  accent bar in the story color + the story name in that color + a muted ticket
  count) followed by its cards. Each card gets a **left-edge tint** in the story
  color.
- Render `other` as a plain run of cards under a muted **"Other"** sub-header
  (neutral steel bar, faint label) — but only when at least one real story
  cluster exists. If the whole column is `other`, render the cards directly under
  the column head with no "Other" header (avoids a pointless single header).
- Folded singletons in `other` show an **inline story caption** on the card
  (story name in its hue); parentless tickets show no caption.

### `Ticket.jsx`

- **Remove** the `age-dot` element entirely.
- **Add** a leading issue-type glyph:
  - If `issueTypeIcon` is set, render `<img>` (proxied URL) at dot-size,
    `alt={issueType}`. On `onError`, swap to the generic in-code glyph.
  - If `issueTypeIcon` is null, render the generic in-code glyph immediately.
  - The generic glyph is a small neutral SVG (so unknown/custom types and mock
    always have something). We are **not** hand-drawing per-type SVGs — the real
    Jira PNG is the source of type identity; the generic glyph is only a fallback.
- Add the optional inline story caption (`.story-cap`), rendered only when the
  parent passes a caption prop (used for folded singletons in `other`).
- The `data-age` attribute stays on the card and continues to drive the age
  value's color and the new stale-card background wash.

### CSS (`index.css`)

- New: `.substory` (bar + name + count), card `border-left` story tint,
  `.story-cap` inline caption, `.dock-cards` adjusted to a single-column flow of
  clusters (see Layout tradeoff).
- Staleness without the dot:
  - `.ticket-age` becomes the primary staleness signal — bold, always colored by
    `--age-c` (the existing per-band color var).
  - `.ticket[data-age='stale']` gets a faint red background wash
    (`color-mix(... var(--red) ~7% ...)`) so a rotting card still jumps out.
- Remove `.age-dot` rules (and the stale-dot size bump).

### Layout tradeoff (accepted)

Today `.dock-cards` is a multi-column auto-fill grid (`repeat(auto-fill,
minmax(13rem, 1fr))`) — wide columns flow cards into 2+ sub-columns. Story
sub-grouping requires the cards to read as **vertical clusters**, so a grouped
column becomes a **single-column** flow (taller, more internal scroll on a wide
column). This was surfaced during brainstorming and accepted as the cost of
explicit grouping. Columns still scroll internally as they do now.

## Blocked column

The blocked zone (`.dock-blocked`, fixed ~15rem, carries each card's blocked
reason) keeps its current flat structure — **no** story sub-headers (it is narrow
and already information-dense). It does gain, for consistency:

- the issue-type icon on each card (same as everywhere), and
- an inline story caption on each blocked card (story name in its hue) when the
  ticket has a parent.

## Interactions & other surfaces (unchanged)

- **Fighter focus:** focusing a fighter still filters the dock to their tickets;
  `groupByStory` simply runs over the filtered list. No special handling.
- **Retro / time-machine:** `parentKey`/`parentName`/`issueType` are static
  per ticket (a ticket's parent and type don't change over a sprint in practice),
  so reconstructing a past moment carries them unchanged. No afterglow/decay
  applies to story or type. If a parent is genuinely missing at a past `ts`, the
  ticket simply renders in `other` — no crash, graceful.
- **Standup / retro overlays** reuse `Ticket.jsx`, so they inherit the issue-type
  icon automatically. They do **not** get story sub-grouping (out of scope; they
  are not the dock).

## Out of scope

- Regrouping the dock by story *across* columns (rejected: breaks the
  column-as-board-state metaphor).
- Per-type hand-drawn SVG icon set (rejected: real Jira PNG is the source of
  truth; generic glyph is the only in-code icon, as a fallback).
- Epic-vs-Story distinction in the label (we show whatever the `parent`'s
  summary is; we do not relabel by parent type).
- A finalized color palette (draft now; Bogdan art-directs later).

## Testing

- `groupByStory` gets vitest coverage: multi-ticket story clusters, the 2+
  threshold, singleton folding into `other`, parentless into `other`,
  whole-column-is-`other`, worst-first cluster ordering, `other`-last, and
  deterministic/stable color assignment for a given `parentKey`.
- R3F/DOM rendering (icons, sub-headers, wash) verified in the browser preview
  against this spec's mockups (the contract mockups live in
  `.superpowers/brainstorm/`).
