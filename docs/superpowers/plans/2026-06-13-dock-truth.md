# Dock Truth (story micro-bars + carryover badges) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dock story headers gain a hairline story-wide progress bar; ticket cards gain a quiet `×N` carryover badge sourced from Jira's `closedSprints` field.

**Architecture:** Pure selectors/helpers first (`storyProgress` in `raidState.js`, `carryoverLabel`/`ordinal` in `lib.js`, `priorSprintsOf` in `shared/derive.js`), all vitest-tested. Then data plumbing: `server/jira.js` requests `closedSprints` and normalizes to `priorSprints`; `deriveSnapshot` passes it through (retro's `stateAt` spreads `...i`, so it carries for free); `server/mock.js` synthesizes veterans. Finally presentation: `Dock.jsx` meter, `Ticket.jsx` badge, `TicketModal.jsx` row — verified in browser preview per house convention (R3F/DOM components are not unit-tested here).

**Tech Stack:** Plain JSX (no TypeScript), React 18, vitest (`npm test`), CSS variables in `src/index.css` (dark-first + `steel-daylight overrides` section for light-only fixes), `npm run mock` for synthetic data.

**Spec:** `docs/superpowers/specs/2026-06-13-dock-truth-design.md`

---

### Task 1: `carryoverLabel` + `ordinal` helpers in lib

**Files:**
- Modify: `src/lib.js`
- Test: `src/__tests__/lib.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/lib.test.js` (it currently imports only `firstName` — extend the import):

```js
import { firstName, carryoverLabel, ordinal } from '../lib';

describe('carryoverLabel', () => {
  it('is null for a first-sprint ticket (no prior sprints)', () => {
    expect(carryoverLabel([])).toBeNull();
    expect(carryoverLabel(undefined)).toBeNull();
    expect(carryoverLabel(null)).toBeNull();
  });
  it('shows total sprint count: 1 prior sprint -> this is its 2nd', () => {
    expect(carryoverLabel([{ id: 41, name: 'Sprint 41' }])).toBe('×2');
  });
  it('counts multiple priors', () => {
    const priors = [{ id: 39 }, { id: 40 }, { id: 41 }];
    expect(carryoverLabel(priors)).toBe('×4');
  });
});

describe('ordinal', () => {
  it('handles 1st/2nd/3rd/4th', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
  });
  it('handles the teens', () => {
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib.test.js`
Expected: FAIL — `carryoverLabel is not a function` (or not exported).

- [ ] **Step 3: Implement in `src/lib.js`**

Append:

```js
// Carryover badge text: a ticket with N prior sprints is on its (N+1)th sprint.
// Null for first-sprint tickets — the badge only exists for veterans.
export function carryoverLabel(priorSprints) {
  const n = Array.isArray(priorSprints) ? priorSprints.length : 0;
  return n >= 1 ? `×${n + 1}` : null;
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
}
```

Note `['th','st','nd','rd'][n % 10]` is `undefined` for digits 4–9, hence the `|| 'th'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib.test.js`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib.js src/__tests__/lib.test.js
git commit -m "feat(lib): carryoverLabel + ordinal helpers for sprint-carryover badges"
```

---

### Task 2: `storyProgress` selector

**Files:**
- Modify: `src/raid/raidState.js`
- Test: `src/raid/__tests__/storyProgress.test.js` (create)

- [ ] **Step 1: Write the failing test**

Create `src/raid/__tests__/storyProgress.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { storyProgress } from '../raidState';

// Minimal issue factory: only the fields storyProgress reads.
const iss = (key, parentKey, done) => ({ key, parentKey, done });

describe('storyProgress', () => {
  it('returns an empty map for no issues', () => {
    expect(storyProgress({ issues: [] }).size).toBe(0);
  });

  it('counts done/total per parent across ALL issues (done included)', () => {
    const view = { issues: [
      iss('SB-1', 'ST-1', true),
      iss('SB-2', 'ST-1', false),
      iss('SB-3', 'ST-1', true),
      iss('SB-4', 'ST-2', false),
    ] };
    const m = storyProgress(view);
    expect(m.get('ST-1')).toEqual({ done: 2, total: 3 });
    expect(m.get('ST-2')).toEqual({ done: 0, total: 1 });
  });

  it('ignores parentless issues', () => {
    const view = { issues: [iss('SB-1', null, true), iss('SB-2', 'ST-1', false)] };
    const m = storyProgress(view);
    expect(m.size).toBe(1);
    expect(m.get('ST-1')).toEqual({ done: 0, total: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/raid/__tests__/storyProgress.test.js`
Expected: FAIL — `storyProgress` is not exported.

- [ ] **Step 3: Implement in `src/raid/raidState.js`**

Add below `groupByStory` (keeps the story selectors together):

```js
// Story-wide completion, computed over ALL sprint issues — deriveDock excludes
// done/blocked tickets, so the dock can't aggregate this itself. Feeds the
// hairline progress meter under each story sub-header. Map(parentKey -> {done, total}).
export function storyProgress(view) {
  const m = new Map();
  for (const i of view.issues) {
    if (!i.parentKey) continue;
    const p = m.get(i.parentKey) || { done: 0, total: 0 };
    p.total += 1;
    if (i.done) p.done += 1;
    m.set(i.parentKey, p);
  }
  return m;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/raid/__tests__/storyProgress.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/raid/raidState.js src/raid/__tests__/storyProgress.test.js
git commit -m "feat(raid): storyProgress selector — story-wide done/total per parent"
```

---

### Task 3: `priorSprintsOf` + snapshot passthrough in shared/derive.js

**Files:**
- Modify: `shared/derive.js`
- Test: `src/__tests__/priorSprints.test.js` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/priorSprints.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { deriveSnapshot, priorSprintsOf, DAY } from '../../shared/derive.js';
import { CONFIG } from '../../shared/config.js';

describe('priorSprintsOf', () => {
  it('returns [] for missing / non-array input', () => {
    expect(priorSprintsOf(undefined, 42)).toEqual([]);
    expect(priorSprintsOf(null, 42)).toEqual([]);
    expect(priorSprintsOf('nope', 42)).toEqual([]);
  });

  it('maps closed sprints to {id, name}', () => {
    expect(priorSprintsOf([{ id: 40, name: 'Sprint 40', state: 'closed' }], 42))
      .toEqual([{ id: 40, name: 'Sprint 40' }]);
  });

  it('excludes the current sprint (closed-fallback/retro: a closed sprint lists itself)', () => {
    const closed = [{ id: 41, name: 'Sprint 41' }, { id: 42, name: 'Sprint 42' }];
    expect(priorSprintsOf(closed, 42)).toEqual([{ id: 41, name: 'Sprint 41' }]);
  });

  it('falls back to the id when a sprint has no name', () => {
    expect(priorSprintsOf([{ id: 40 }], 42)).toEqual([{ id: 40, name: '40' }]);
  });
});

describe('deriveSnapshot priorSprints passthrough', () => {
  const columns = [
    { name: 'To Do', statusNames: ['to do'], wipLimit: null },
    { name: 'Done', statusNames: ['done'], wipLimit: null },
  ];
  const sprint = { id: 42, name: 'S42', state: 'active', startDate: 0, endDate: 10 * DAY };
  const baseIssue = {
    key: 'SB-1', summary: 'x', url: '', assignee: null, points: null,
    created: 1, statusName: 'To Do', transitions: [], flagHistory: [],
    flagged: false, blockedReason: null, sprintAddedAt: null,
  };

  it('carries priorSprints onto the output issue', () => {
    const issues = [{ ...baseIssue, priorSprints: [{ id: 41, name: 'S41' }] }];
    const snap = deriveSnapshot({ sprint, issues, columns, config: CONFIG, now: 5 * DAY });
    expect(snap.issues[0].priorSprints).toEqual([{ id: 41, name: 'S41' }]);
  });

  it('defaults to [] when the source omits it (mock issues, old payloads)', () => {
    const snap = deriveSnapshot({ sprint, issues: [{ ...baseIssue }], columns, config: CONFIG, now: 5 * DAY });
    expect(snap.issues[0].priorSprints).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/priorSprints.test.js`
Expected: FAIL — `priorSprintsOf` is not exported.

- [ ] **Step 3: Implement in `shared/derive.js`**

Add near the top (after the `ts` helper):

```js
// Jira's Agile API ships each issue's closed-sprint memberships. Everything
// before the current sprint is "carryover". String-compare ids defensively —
// the API returns numbers, but ids that round-trip through JSON/env can stringify.
export function priorSprintsOf(closedSprints, currentSprintId) {
  if (!Array.isArray(closedSprints)) return [];
  return closedSprints
    .filter((s) => s && String(s.id) !== String(currentSprintId))
    .map((s) => ({ id: s.id, name: s.name || String(s.id) }));
}
```

In `deriveSnapshot`'s `outIssues` return object (the block that already has `parentKey: raw.parentKey ?? null,`), add one line alongside those passthroughs:

```js
      priorSprints: raw.priorSprints ?? [],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/priorSprints.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the whole suite (derive.js is load-bearing)**

Run: `npm test`
Expected: all existing tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add shared/derive.js src/__tests__/priorSprints.test.js
git commit -m "feat(derive): priorSprintsOf + carry priorSprints through the snapshot"
```

---

### Task 4: Jira source requests + normalizes `closedSprints`

**Files:**
- Modify: `server/jira.js` (two one-line changes)

No unit test — `normalize` lives inside the `createJiraSource` closure; the pure logic was tested in Task 3. Verified by the mock/preview run in Task 8 plus a syntax check here.

- [ ] **Step 1: Add the field to the request**

In `server/jira.js` → `getIssues`, extend the field list (zero extra API calls — the Agile sprint-issue endpoint serves this field):

```js
    const fieldList = ['summary', 'status', 'assignee', 'created', 'updated', 'labels', 'parent', 'issuetype', 'closedSprints', f.storyPoints, f.flagged]
      .filter(Boolean)
      .join(',');
```

- [ ] **Step 2: Emit `priorSprints` from `normalize`**

Extend the import at the top of `server/jira.js`:

```js
import { deriveSnapshot, priorSprintsOf } from '../shared/derive.js';
```

In `normalize(issue, f, sprintId)`'s return object, add (next to `parentKey`):

```js
      priorSprints: priorSprintsOf(fields.closedSprints, sprintId),
```

- [ ] **Step 3: Syntax check**

Run: `node --check server/jira.js`
Expected: no output (clean parse).

- [ ] **Step 4: Commit**

```bash
git add server/jira.js
git commit -m "feat(jira): fetch closedSprints, normalize to priorSprints (carryover)"
```

---

### Task 5: Mock veterans

**Files:**
- Modify: `server/mock.js`

- [ ] **Step 1: Teach `mk` about prior sprints**

In `server/mock.js`, extend the `mk` destructured params with `prior = 0`:

```js
  const mk = ({ key, summary, pts, who, createdD, path = [], flags = [], reason = null, addedD = null, parent = null, type = 'Task', prior = 0 }) => {
```

and add to the pushed issue object (after `isSubtask`):

```js
      // Carryover: `prior` synthesizes N closed sprints before "Sprint 42".
      priorSprints: Array.from({ length: prior }, (_, k) => {
        const n = 42 - prior + k;
        return { id: n, name: `Sprint ${n}` };
      }),
```

- [ ] **Step 2: Tag a spread of veterans**

Add `prior:` to these four existing `mk` calls (a 2nd-, two 3rd+-, and a 4th-sprint ticket; two of them blocked so the badge shows in the blocked list too):

- `SB-110` (In Progress, Billing): add `prior: 1` → badge ×2
- `SB-113` (blocked, Billing): add `prior: 2` → badge ×3 (heavy)
- `SB-114` (blocked, In Review, Compliance): add `prior: 1` → badge ×2
- `SB-119` (To Do, Platform): add `prior: 3` → badge ×4 (heavy)

Example for SB-119 (same pattern for the others — append the param):

```js
  mk({ key: 'SB-119', summary: 'Archive stale workspaces job', pts: 8, who: NAMES[1], createdD: 9, parent: ST.platform, type: 'Story', prior: 3 });
```

- [ ] **Step 3: Keep `addScope` issues clean**

In `addScope()`, add to the pushed object (next to `sprintAddedAt`):

```js
      priorSprints: [],
```

(Not strictly required — derive defaults to `[]` — but keeps mock issues uniform.)

- [ ] **Step 4: Syntax check**

Run: `node --check server/mock.js`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add server/mock.js
git commit -m "feat(mock): synthesize carryover veterans for badge testing"
```

---

### Task 6: Story progress micro-bar in the dock

**Files:**
- Modify: `src/components/Dock.jsx`
- Modify: `src/index.css` (dock section ~line 484, light override in `steel-daylight overrides` at end)

- [ ] **Step 1: Compute progress once and thread it down**

In `src/components/Dock.jsx`, extend the raidState import and `Dock`:

```js
import { deriveDock, groupByStory, storyColor, storyProgress } from '../raid/raidState';

export default function Dock({ view, onSelect, focus = null }) {
  const { groups, blocked } = deriveDock(view, focus);
  // Story-wide (never focus-filtered): the meter is a fact about the objective,
  // not the person — the cards beneath already filter.
  const progress = storyProgress(view);
  return (
    <div className="dock">
      {groups.map((g) => <DockGroup key={g.idx} group={g} view={view} onSelect={onSelect} progress={progress} />)}
```

(rest of `Dock` unchanged.)

- [ ] **Step 2: Render the meter under each story sub-header**

In `DockGroup`, accept `progress` and insert the meter between `.substory` and `.subcards` (story clusters only — the "Other" cluster gets none):

```js
function DockGroup({ group, view, onSelect, progress }) {
  const { stories, other } = groupByStory(group.issues);
  return (
    <div className="dock-group" data-kind={group.kind}>
      <div className="dock-head">
        <span className="label">{group.name} · {group.issues.length}</span>
      </div>
      <div className="dock-cards">
        {stories.map((s) => {
          const p = progress.get(s.key);
          const pct = p && p.total ? (p.done / p.total) * 100 : 0;
          return (
            <div key={s.key} className="story-cluster">
              <div className="substory" style={{ '--barc': s.color, '--nmc': s.color }}>
                <span className="bar" />
                <span className="nm">{s.name}</span>
                <span className="ct">{s.issues.length}</span>
              </div>
              <div className="story-meter" style={{ '--barc': s.color }} title={p ? `${p.done}/${p.total} done` : undefined}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="subcards">
                {s.issues.map((i) => (
                  <Ticket key={i.key} issue={i} view={view} onSelect={onSelect} accent={s.color} />
                ))}
              </div>
            </div>
          );
        })}
```

(the `other` block stays exactly as it is — no meter.)

- [ ] **Step 3: CSS**

In `src/index.css`, after the `.substory .ct` rule (~line 487):

```css
/* Hairline story-wide progress under each story sub-header. Fill = done/total
   across ALL sprint issues (storyProgress), in the story's identity color.
   No count text by design. */
.story-meter { height: 2px; margin: 0.1rem 0.2rem 0.22rem; border-radius: 1px; overflow: hidden; background: color-mix(in srgb, var(--barc, var(--steel-3)) 20%, transparent); }
.story-meter > span { display: block; height: 100%; border-radius: 1px; background: var(--barc, var(--steel-3)); transition: width 0.6s ease; }
```

In the `steel-daylight overrides` section at the end of the file (matching the existing `.substory .bar` light treatment at ~line 588):

```css
html[data-theme='light'] .story-meter > span { background: color-mix(in srgb, var(--barc, var(--steel-3)) 70%, var(--ink)); }
```

- [ ] **Step 4: Verify in browser preview**

Run the mock dev server (preview_start with `npm run mock`), then:
- preview_snapshot: every multi- and single-ticket story header in every column shows a 2px bar; "Other" and the blocked list show none.
- Compliance ("SB-901") should read visibly part-done (2 of its 5 tickets are Done in mock); Billing ("SB-900") 0/3 → empty track only.
- The same story shows the identical fill in different columns.
- preview_eval `document.documentElement.dataset.theme='light'` (or the app's theme toggle) → bars deepen toward ink, still visible.
- Click a fighter chip (focus) → meters do NOT change while cards filter.
- preview_console_logs: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Dock.jsx src/index.css
git commit -m "feat(dock): hairline story-wide progress meter under story sub-headers"
```

---

### Task 7: Carryover badge on the ticket card

**Files:**
- Modify: `src/components/Ticket.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Render the badge inside the key cell**

`.ticket` is a 5-column grid (`auto 1fr auto auto auto`) — adding a sibling cell would shift the columns, so the badge nests inside `.ticket-key`. In `src/components/Ticket.jsx`:

```js
import { ageBand, fmtDays, carryoverLabel, ordinal } from '../lib';
```

and in the component body, before `return`:

```js
  const carry = carryoverLabel(issue.priorSprints);
  const nthSprint = (issue.priorSprints?.length || 0) + 1;
```

then replace the key span:

```jsx
      <span className="ticket-key">
        {issue.key}
        {carry && (
          <span
            className="ticket-carry"
            data-heavy={nthSprint >= 3 || undefined}
            title={`${ordinal(nthSprint)} sprint for this ticket`}
          >
            {carry}
          </span>
        )}
      </span>
```

- [ ] **Step 2: CSS**

In `src/index.css`, after the `.ticket-key` rule:

```css
/* Carryover scar: ×N = this ticket's Nth sprint. Quiet by design (--dim), with
   a slight ramp at 3+ sprints. Draft treatment — Bogdan's art-direction pass owns it. */
.ticket-carry { font-family: var(--font-m); font-size: 0.62rem; font-weight: 700; color: var(--dim); margin-left: 0.4em; letter-spacing: 0.02em; }
.ticket-carry[data-heavy] { color: var(--amber); }
```

(No light-theme override needed: `--dim`/`--amber` are themed vars and the card surface is themed too.)

- [ ] **Step 3: Verify in browser preview**

With the mock preview still running:
- preview_snapshot: SB-110 shows `×2`, SB-119 shows `×4`; SB-113 and SB-114 show their badges inside the blocked list cards. All other cards show no badge.
- ×2 renders dim; ×3+ (SB-113, SB-119) renders amber.
- Card grid intact: key/age/points/avatar columns unshifted on cards without a badge.
- Standup overlay (it reuses `Ticket`): open it, badge appears there too — acceptable and consistent (the card is one component; spec's "no carryover in standup" referred to standup-specific stats, not suppressing the shared card's badge).
- preview_console_logs: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Ticket.jsx src/index.css
git commit -m "feat(ticket): ×N carryover badge on the card key"
```

---

### Task 8: Sprint-history row in the ticket modal

**Files:**
- Modify: `src/components/TicketModal.jsx`

- [ ] **Step 1: Add the Meta row**

Extend the lib import:

```js
import { ageBand, fmtDays, fmtDate, ordinal } from '../lib';
```

In the `grid grid-cols-2` block, after the "In sprint since" `Meta` (and before the conditional "Completed" one), add:

```jsx
          {issue.priorSprints?.length > 0 && (
            <Meta label="Sprint history">
              <span className="mono font-bold">{ordinal(issue.priorSprints.length + 1)} sprint</span>{' '}
              <span style={{ color: 'var(--faint)' }}>
                after {issue.priorSprints.map((s) => s.name).join(', ')}
              </span>
            </Meta>
          )}
```

- [ ] **Step 2: Verify in browser preview**

- Click SB-119's card → modal shows "Sprint history — **4th sprint** after Sprint 39, Sprint 40, Sprint 41".
- Click a first-sprint ticket (e.g. SB-101) → no Sprint history row.
- preview_console_logs: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TicketModal.jsx
git commit -m "feat(modal): sprint-history row for carryover tickets"
```

---

### Task 9: Full verification + docs

**Files:**
- Modify: `CLAUDE.md` (dock paragraph in "The view")
- Modify: `docs/superpowers/specs/2026-06-13-dock-truth-design.md` (status line)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all suites PASS (including the three new test files).

- [ ] **Step 2: Visual proof**

preview_screenshot of the dock showing story meters + carryover badges (dark theme), and one of the open SB-119 modal. Share both with Bogdan — sprite/visual work is draft pending his art-direction pass.

- [ ] **Step 3: Update CLAUDE.md**

In the Raid-view dock description (the sentence about story sub-headers), append:

```
Story sub-headers carry a hairline story-wide progress meter (done/total over
ALL sprint issues — `storyProgress` in `raidState.js`, never focus-filtered);
ticket cards carry a quiet `×N` carryover badge (Nth sprint, amber at ×3+) from
Jira's `closedSprints` field, normalized to `priorSprints`
(`priorSprintsOf` in `shared/derive.js`) with full history in the ticket modal.
```

- [ ] **Step 4: Mark the spec implemented**

In `docs/superpowers/specs/2026-06-13-dock-truth-design.md`, change the status line to:

```
**Status:** implemented (see docs/superpowers/plans/2026-06-13-dock-truth.md)
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-06-13-dock-truth-design.md
git commit -m "docs: record dock-truth feature (story meters + carryover badges)"
```
