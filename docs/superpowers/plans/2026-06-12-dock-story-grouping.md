# Dock Story Grouping + Issue-Type Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each dock ticket's Jira story (parent) by sub-grouping cards within their column with a per-story accent color, and replace the staleness dot with the Jira issue-type icon.

**Architecture:** Add `parent` + `issuetype` to the Jira fetch → normalize → snapshot chain (and mock fixtures). A pure, tested `groupByStory` selector buckets a column's issues into colored story clusters (2+ tickets) vs an "Other" remainder (singletons + parentless). `Dock.jsx`/`Ticket.jsx` render the clusters; issue-type icons load via a new auth'd `/api/icon` proxy with an in-code fallback glyph.

**Tech Stack:** Node/Express server, React 18 + plain JSX, Vitest for pure logic, CSS variables for theming. No TypeScript.

---

## File Structure

- `server/mock.js` — extend `mk()` to carry `parent` + `type`; assign across fixtures (Task 1).
- `shared/derive.js` — pass `parentKey`/`parentName`/`issueType`/`issueTypeIcon`/`isSubtask` through `deriveSnapshot` (Task 2).
- `server/jira.js` — fetch `parent` + `issuetype`; normalize them (Task 3).
- `server/index.js` — new `/api/icon` Jira-authed proxy (Task 4).
- `src/raid/raidState.js` — `STORY_PALETTE`, `storyColor()`, `groupByStory()` pure helpers (Task 5).
- `src/raid/__tests__/groupByStory.test.js` — new test file (Task 5).
- `src/components/Ticket.jsx` — issue-type icon replaces dot; optional story caption + accent (Task 6).
- `src/components/Dock.jsx` — render story sub-groups + "Other"; blocked gets icon + caption (Task 7).
- `src/index.css` — `.substory`, `.story-cap`, `.itype`, stale wash, `.dock-cards` flex, remove `.age-dot` (Task 8).
- `CLAUDE.md` — update dock description (Task 9).

---

## Task 1: Mock fixtures carry parent + type

Do this first so the whole feature is exercisable with `npm run mock` before live Jira fields exist.

**Files:**
- Modify: `server/mock.js:51-69` (the `mk()` helper) and the `mk(...)` calls at `server/mock.js:72-99`.

- [ ] **Step 1: Extend the `mk()` helper to accept `parent` and `type`**

Replace the helper at `server/mock.js:51-69`:

```js
  const issues = [];
  const ISSUE_BASE = 'https://example.atlassian.net';
  const mk = ({ key, summary, pts, who, createdD, path = [], flags = [], reason = null, addedD = null, parent = null, type = 'Task' }) => {
    const created = t0 - createdD * DAY;
    const transitions = [];
    let prev = 'To Do';
    for (const [d, to] of path) {
      transitions.push({ ts: t0 - d * DAY, from: prev, to, author: who });
      prev = to;
    }
    issues.push({
      key, summary, assignee: who, points: pts, created,
      assigneeAvatar: `https://i.pravatar.cc/48?u=${encodeURIComponent(who)}`,
      statusName: prev, transitions,
      flagHistory: flags.map(([d, f]) => ({ ts: t0 - d * DAY, flagged: f, author: who })),
      flagged: flags.length ? flags[flags.length - 1][1] : false,
      blockedReason: reason,
      sprintAddedAt: addedD != null ? t0 - addedD * DAY : null,
      url: `${ISSUE_BASE}/browse/${key}`,
      // Story grouping + type. Mock has no Atlassian CDN, so issueTypeIcon is
      // null on purpose — exercises the in-code fallback glyph.
      parentKey: parent ? parent.key : null,
      parentName: parent ? parent.name : null,
      issueType: type,
      issueTypeIcon: null,
      isSubtask: type === 'Sub-task',
    });
  };

  // Mock stories (parents). Some get 2+ tickets (own cluster), some 1 (fold to Other).
  const ST = {
    billing: { key: 'SB-900', name: 'Billing v2' },
    compliance: { key: 'SB-901', name: 'Compliance gap' },
    platform: { key: 'SB-902', name: 'Platform upgrades' },
    privacy: { key: 'SB-903', name: 'Data privacy' },
    notify: { key: 'SB-904', name: 'Notifications revamp' },
  };
```

- [ ] **Step 2: Assign parents + types to the existing `mk()` calls**

Edit the `mk({...})` calls to add `parent` / `type`. Apply these exact additions (leave every other argument unchanged):

| Line | key | add |
|------|-----|-----|
| 72 | SB-101 | `, parent: ST.compliance, type: 'Story'` |
| 73 | SB-102 | `, parent: ST.platform, type: 'Bug'` |
| 74 | SB-103 | `, parent: ST.compliance, type: 'Task'` |
| 75 | SB-104 | `, parent: ST.platform, type: 'Bug'` |
| 76 | SB-105 | `, type: 'Sub-task'` |
| 79 | SB-106 | `, parent: ST.billing, type: 'Story'` |
| 80 | SB-107 | `, parent: ST.notify, type: 'Task'` |
| 81 | SB-108 | `, parent: ST.platform, type: 'Task'` |
| 82 | SB-109 | `, parent: ST.notify, type: 'Sub-task'` |
| 83 | SB-114 | `, parent: ST.compliance, type: 'Task'` |
| 86 | SB-110 | `, parent: ST.billing, type: 'Story'` |
| 87 | SB-111 | `, parent: ST.privacy, type: 'Task'` |
| 88 | SB-120 | `, parent: ST.compliance, type: 'Bug'` |
| 89 | SB-113 | `, parent: ST.billing, type: 'Task'` |
| 92 | SB-112 | `, type: 'Bug'` |
| 93 | SB-115 | `, parent: ST.platform, type: 'Story'` |
| 94 | SB-116 | `, parent: ST.platform, type: 'Task'` |
| 95 | SB-117 | `, type: 'Task'` |
| 96 | SB-118 | `, parent: ST.notify, type: 'Sub-task'` |
| 97 | SB-119 | `, parent: ST.platform, type: 'Story'` |
| 98 | SB-121 | `, parent: ST.privacy, type: 'Task'` |
| 99 | SB-122 | `, type: 'Bug'` |

Example — line 72 becomes:

```js
  mk({ key: 'SB-101', summary: 'Rotate refresh tokens on session renew', pts: 3, who: NAMES[0], createdD: 9, path: [[6.5, 'In Progress'], [5.5, 'In Review'], [4.8, 'Done']], parent: ST.compliance, type: 'Story' });
```

This gives the To Do column a multi-ticket story (Platform upgrades: SB-115/116/119), a singleton (Data privacy: SB-121), and parentless tickets (SB-112, SB-117, SB-122) — covering every grouping branch.

- [ ] **Step 3: Run the existing suite to confirm nothing broke**

Run: `npm test`
Expected: all existing tests still PASS (no test reads these new fields yet).

- [ ] **Step 4: Commit**

```bash
git add server/mock.js
git commit -m "feat(mock): carry parent story + issue type on mock tickets"
```

---

## Task 2: Pass story + type fields through derive

**Files:**
- Modify: `shared/derive.js:102-114` (the per-issue return object).

- [ ] **Step 1: Add the five fields to the derived issue**

In `shared/derive.js`, the `return { ... }` block at line 102 ends with `colHistory, flagHistory,`. Add the new fields just before `colHistory`:

```js
    return {
      key: raw.key, summary: raw.summary, url: raw.url,
      assignee: raw.assignee || null,
      assigneeAvatar: raw.assigneeAvatar || null,
      points, estimated,
      col: cur.col, colName: columns[cur.col].name,
      columnSince: cur.ts, daysInColumn: (now - cur.ts) / DAY,
      cycleDays,
      blocked,
      blockedReason: blocked ? raw.blockedReason || (inBlockedZone ? `In "${columns[cur.col].name}" column` : null) : null,
      created, addedAt, addedMidSprint,
      done, doneAt: done ? cur.ts : null,
      parentKey: raw.parentKey ?? null,
      parentName: raw.parentName ?? null,
      issueType: raw.issueType ?? null,
      issueTypeIcon: raw.issueTypeIcon ?? null,
      isSubtask: raw.isSubtask ?? false,
      colHistory, flagHistory,
    };
```

- [ ] **Step 2: Run the suite**

Run: `npm test`
Expected: all PASS (`timeMachine.test.js` and others exercise `deriveSnapshot`; the extra carried-through fields don't change existing assertions).

- [ ] **Step 3: Commit**

```bash
git add shared/derive.js
git commit -m "feat(derive): carry parent story + issue type onto derived issues"
```

---

## Task 3: Fetch + normalize parent and issuetype from Jira

**Files:**
- Modify: `server/jira.js:69-84` (`getIssues` field list) and `server/jira.js:112-127` (`normalize` return).

- [ ] **Step 1: Request `parent` and `issuetype`**

In `getIssues` (`server/jira.js:70`), extend the `fieldList`:

```js
    const fieldList = ['summary', 'status', 'assignee', 'created', 'updated', 'labels', 'parent', 'issuetype', f.storyPoints, f.flagged]
      .filter(Boolean)
      .join(',');
```

- [ ] **Step 2: Normalize the new fields**

In `normalize` (`server/jira.js`), add the five fields to the returned object (just before `_hasChangelog`):

```js
      sprintAddedAt,
      parentKey: fields.parent?.key || null,
      parentName: fields.parent?.fields?.summary || null,
      issueType: fields.issuetype?.name || null,
      issueTypeIcon: fields.issuetype?.iconUrl
        ? `/api/icon?url=${encodeURIComponent(fields.issuetype.iconUrl)}`
        : null,
      isSubtask: fields.issuetype?.subtask === true,
      _hasChangelog: histories.length > 0 || !issue.changelog,
```

Note: `issueTypeIcon` is stored as the **proxied** path (`/api/icon?...`), built here so the client never sees the raw Atlassian URL. The proxy is added in Task 4.

- [ ] **Step 3: Verify against the running suite**

Run: `npm test`
Expected: all PASS (server `jira.js` has no unit tests; this guards the shared modules it imports).

- [ ] **Step 4: Commit**

```bash
git add server/jira.js
git commit -m "feat(jira): fetch + normalize parent story and issue type"
```

---

## Task 4: `/api/icon` Jira-authenticated proxy

Jira issue-type icon URLs live on the Jira host and require Basic auth — a bare browser `<img>` would 401. Proxy them server-side with the Jira credentials, allowlisted to the configured Jira host only.

**Files:**
- Modify: `server/index.js` — add the route directly after the existing `/api/avatar` handler (after `server/index.js:80`).

- [ ] **Step 1: Add the proxy route**

Insert after the `/api/avatar` handler closes (line 80):

```js
// Issue-type icons live on the Jira host and need Basic auth — proxy them with
// the Jira creds, allowlisted to the configured base host only. Falls back to
// 404 when Jira isn't configured (mock mode), which the client renders as a glyph.
const JIRA_BASE = (process.env.JIRA_BASE_URL || '').replace(/\/+$/, '');
const JIRA_ICON_AUTH =
  process.env.JIRA_EMAIL && process.env.JIRA_API_TOKEN
    ? 'Basic ' + Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64')
    : null;
app.get('/api/icon', async (req, res) => {
  if (!JIRA_BASE || !JIRA_ICON_AUTH) return res.status(404).end();
  let url;
  try {
    url = new URL(req.query.url);
  } catch {
    return res.status(400).json({ error: 'Bad url' });
  }
  if (url.protocol !== 'https:' || url.hostname !== new URL(JIRA_BASE).hostname) {
    return res.status(403).json({ error: 'Host not allowed' });
  }
  try {
    const upstream = await fetch(url, { headers: { Authorization: JIRA_ICON_AUTH }, redirect: 'follow' });
    if (!upstream.ok) return res.status(upstream.status).end();
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});
```

- [ ] **Step 2: Verify the route loads in mock mode**

Run: `MOCK=1 node -e "import('./server/index.js').then(()=>setTimeout(()=>process.exit(0),500))"` — server boots without error.
Then with the dev server running (`npm run mock`), confirm `curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173/api/icon?url=https://x.test/a.png"` returns `404` (Jira not configured in mock) — proving the guard works and the client will fall back to the glyph.

Expected: server boots; the curl prints `404`.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(server): /api/icon proxy for Jira issue-type icons"
```

---

## Task 5: `groupByStory` + `storyColor` (pure, TDD)

**Files:**
- Create: `src/raid/__tests__/groupByStory.test.js`
- Modify: `src/raid/raidState.js` (add exports near `deriveDock`).

- [ ] **Step 1: Write the failing tests**

Create `src/raid/__tests__/groupByStory.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { groupByStory, storyColor, STORY_PALETTE } from '../raidState';

// Minimal issue factory: only the fields groupByStory reads.
const mk = (key, parentKey, parentName, columnSince) => ({
  key, parentKey, parentName, columnSince,
});

describe('storyColor', () => {
  it('is deterministic for a given parent key', () => {
    expect(storyColor('SB-900')).toBe(storyColor('SB-900'));
  });
  it('always returns a palette entry', () => {
    for (const k of ['SB-900', 'SB-901', 'AB-1', 'ZZ-9999']) {
      expect(STORY_PALETTE).toContain(storyColor(k));
    }
  });
});

describe('groupByStory', () => {
  it('makes a cluster for a story with 2+ tickets in the column', () => {
    const issues = [
      mk('A-1', 'P-1', 'Alpha', 10),
      mk('A-2', 'P-1', 'Alpha', 20),
    ];
    const { stories, other } = groupByStory(issues);
    expect(stories).toHaveLength(1);
    expect(stories[0].key).toBe('P-1');
    expect(stories[0].name).toBe('Alpha');
    expect(stories[0].color).toBe(storyColor('P-1'));
    expect(stories[0].issues.map((i) => i.key)).toEqual(['A-1', 'A-2']);
    expect(other).toHaveLength(0);
  });

  it('folds a single-ticket story into other', () => {
    const issues = [
      mk('A-1', 'P-1', 'Alpha', 10),
      mk('A-2', 'P-1', 'Alpha', 20),
      mk('B-1', 'P-2', 'Beta', 5),
    ];
    const { stories, other } = groupByStory(issues);
    expect(stories.map((s) => s.key)).toEqual(['P-1']);
    expect(other.map((i) => i.key)).toEqual(['B-1']);
  });

  it('puts parentless tickets into other', () => {
    const issues = [mk('A-1', null, null, 10), mk('A-2', null, null, 20)];
    const { stories, other } = groupByStory(issues);
    expect(stories).toHaveLength(0);
    expect(other.map((i) => i.key)).toEqual(['A-1', 'A-2']);
  });

  it('orders story clusters worst-first by their stalest member', () => {
    // smaller columnSince = entered earlier = staler
    const issues = [
      mk('A-1', 'P-1', 'Alpha', 100), mk('A-2', 'P-1', 'Alpha', 110), // stalest = 100
      mk('B-1', 'P-2', 'Beta', 50), mk('B-2', 'P-2', 'Beta', 60),     // stalest = 50
    ];
    const { stories } = groupByStory(issues);
    expect(stories.map((s) => s.key)).toEqual(['P-2', 'P-1']);
  });

  it('sorts other by staleness (columnSince asc), intermixing folded + parentless', () => {
    const issues = [
      mk('A-1', 'P-1', 'Alpha', 10), mk('A-2', 'P-1', 'Alpha', 20), // cluster
      mk('S-1', 'P-9', 'Single', 30), // folded singleton
      mk('O-1', null, null, 5),        // parentless, stalest
    ];
    const { stories, other } = groupByStory(issues);
    expect(stories.map((s) => s.key)).toEqual(['P-1']);
    expect(other.map((i) => i.key)).toEqual(['O-1', 'S-1']); // 5 before 30
  });

  it('falls back to the parent key as name when parentName is missing', () => {
    const issues = [mk('A-1', 'P-1', null, 10), mk('A-2', 'P-1', null, 20)];
    const { stories } = groupByStory(issues);
    expect(stories[0].name).toBe('P-1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/raid/__tests__/groupByStory.test.js`
Expected: FAIL — `groupByStory`/`storyColor`/`STORY_PALETTE` are not exported.

- [ ] **Step 3: Implement the helpers**

In `src/raid/raidState.js`, add after the `deriveDock` function (after line 96):

```js
// Per-story accent palette (draft — Bogdan art-directs later). Hues chosen to
// read on both themes; collisions accepted (two stories may share a hue).
export const STORY_PALETTE = ['#5fb0f2', '#c08cf0', '#62d4a8', '#f0a35f', '#e0708f', '#7dd3c0', '#b3a4f0', '#e8c45f'];

// Deterministic story key -> palette hue, stable across columns and polls.
export function storyColor(parentKey) {
  let h = 0;
  for (let i = 0; i < parentKey.length; i++) h = (Math.imul(h, 31) + parentKey.charCodeAt(i)) >>> 0;
  return STORY_PALETTE[h % STORY_PALETTE.length];
}

// Group one column's issues by parent story. A parent with 2+ tickets in this
// column becomes its own colored cluster; singletons + parentless fold into
// `other`. Clusters ordered worst-first by stalest member; `other` last and
// sorted by staleness. Pure: input order within a parent is preserved, so pass
// issues already sorted stalest-first (columnSince asc).
export function groupByStory(issues) {
  const byParent = new Map();
  const other = [];
  for (const it of issues) {
    if (!it.parentKey) { other.push(it); continue; }
    const b = byParent.get(it.parentKey) || { key: it.parentKey, name: it.parentName || it.parentKey, issues: [] };
    b.issues.push(it);
    byParent.set(it.parentKey, b);
  }
  const stories = [];
  for (const b of byParent.values()) {
    if (b.issues.length >= 2) stories.push({ key: b.key, name: b.name, color: storyColor(b.key), issues: b.issues });
    else other.push(...b.issues);
  }
  const stalest = (list) => list.reduce((m, i) => Math.min(m, i.columnSince), Infinity);
  stories.sort((a, b) => stalest(a.issues) - stalest(b.issues) || a.key.localeCompare(b.key));
  other.sort((a, b) => a.columnSince - b.columnSince);
  return { stories, other };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/raid/__tests__/groupByStory.test.js`
Expected: PASS (all cases green).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/raid/raidState.js src/raid/__tests__/groupByStory.test.js
git commit -m "feat(raid): groupByStory + deterministic story color (tested)"
```

---

## Task 6: Ticket card — issue-type icon, story caption, accent

**Files:**
- Modify: `src/components/Ticket.jsx` (whole file).

- [ ] **Step 1: Rewrite `Ticket.jsx`**

Replace the entire file with:

```jsx
import { useState } from 'react';
import Avatar from './Avatar';
import { ageBand, fmtDays } from '../lib';

// Generic fallback glyph for unknown types / mock (no iconUrl) / proxy miss.
function GenericTypeGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// Jira issue-type icon (proxied PNG) with graceful fallback to the glyph.
function IssueTypeIcon({ src, type }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return (
      <span className="itype" title={type || ''}>
        <img src={src} alt={type || 'issue'} loading="lazy" onError={() => setBroken(true)} />
      </span>
    );
  }
  return (
    <span className="itype" title={type || ''}>
      <GenericTypeGlyph />
    </span>
  );
}

// The one ticket card, used in the raid dock and the standup/retro overlays:
// type icon + key + age + face + full summary, with an optional story caption
// (for folded singletons in "Other") and an optional story-color left accent.
export default function Ticket({ issue, view, onSelect, accent = null, storyCaption = null }) {
  const band = view.flags?.noChangelog ? 'off' : ageBand(issue.daysInColumn, view.aging);
  return (
    <button
      className="ticket pop-in"
      data-age={band}
      data-unestimated={!issue.estimated}
      data-scope={issue.addedMidSprint}
      onClick={() => onSelect(issue)}
      title={`${issue.key} — ${issue.summary}`}
      style={accent ? { borderLeftColor: accent, borderLeftWidth: '3px' } : undefined}
    >
      <IssueTypeIcon src={issue.issueTypeIcon} type={issue.issueType} />
      <span className="ticket-key">{issue.key}</span>
      {band !== 'off' && <span className="ticket-age">{fmtDays(issue.daysInColumn)}</span>}
      {issue.estimated && <span className="ticket-pts">{issue.points}</span>}
      <span className="ticket-face">
        <Avatar name={issue.assignee} src={issue.assigneeAvatar} />
      </span>
      {storyCaption && (
        <span className="story-cap" style={{ '--capc': storyCaption.color }}>{storyCaption.name}</span>
      )}
      <span className="ticket-summary">{issue.summary}</span>
    </button>
  );
}
```

- [ ] **Step 2: Verify the suite still passes**

Run: `npm test`
Expected: all PASS (no test imports `Ticket.jsx`; this guards the modules it imports).

- [ ] **Step 3: Commit**

```bash
git add src/components/Ticket.jsx
git commit -m "feat(dock): issue-type icon replaces staleness dot; optional story caption + accent"
```

---

## Task 7: Dock renders story sub-groups

**Files:**
- Modify: `src/components/Dock.jsx` (whole file).

- [ ] **Step 1: Rewrite `Dock.jsx`**

Replace the entire file with:

```jsx
// src/components/Dock.jsx
// The data half of the command deck: real tickets, grouped by board column and,
// within each column, sub-grouped by story (the Jira parent). Stories with 2+
// tickets get a colored sub-header; singletons + parentless tickets fold into a
// quiet "Other" cluster (folded singletons keep their story name inline).
import Ticket from './Ticket';
import { deriveDock, groupByStory, storyColor } from '../raid/raidState';

export default function Dock({ view, onSelect, focus = null }) {
  const { groups, blocked } = deriveDock(view, focus);
  return (
    <div className="dock">
      {groups.map((g) => <DockGroup key={g.idx} group={g} view={view} onSelect={onSelect} />)}
      <div className="dock-group dock-blocked" data-occupied={blocked.length > 0}>
        <div className="dock-head">
          <span className="label" style={{ color: blocked.length ? 'var(--red)' : 'var(--faint)' }}>
            {blocked.length ? `⚑ Blocked · ${blocked.length}` : 'No blockers'}
          </span>
        </div>
        <div className="dock-cards">
          {blocked.map((i) => (
            <div key={i.key} className="dock-blocked-card">
              <Ticket
                issue={i}
                view={view}
                onSelect={onSelect}
                storyCaption={i.parentKey ? { name: i.parentName || i.parentKey, color: storyColor(i.parentKey) } : null}
              />
              <span className="dock-reason">{i.blockedReason || 'Flagged'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DockGroup({ group, view, onSelect }) {
  const { stories, other } = groupByStory(group.issues);
  return (
    <div className="dock-group" data-kind={group.kind}>
      <div className="dock-head">
        <span className="label">{group.name} · {group.issues.length}</span>
      </div>
      <div className="dock-cards">
        {stories.map((s) => (
          <div key={s.key} className="story-cluster">
            <div className="substory" style={{ '--barc': s.color, '--nmc': s.color }}>
              <span className="bar" />
              <span className="nm">{s.name}</span>
              <span className="ct">{s.issues.length}</span>
            </div>
            <div className="subcards">
              {s.issues.map((i) => (
                <Ticket key={i.key} issue={i} view={view} onSelect={onSelect} accent={s.color} />
              ))}
            </div>
          </div>
        ))}
        {other.length > 0 && (
          <div className="story-cluster">
            {stories.length > 0 && (
              <div className="substory">
                <span className="bar" style={{ background: 'var(--steel-3)' }} />
                <span className="nm" style={{ color: 'var(--faint)' }}>Other</span>
                <span className="ct">{other.length}</span>
              </div>
            )}
            <div className="subcards">
              {other.map((i) => (
                <Ticket
                  key={i.key}
                  issue={i}
                  view={view}
                  onSelect={onSelect}
                  storyCaption={i.parentKey ? { name: i.parentName || i.parentKey, color: storyColor(i.parentKey) } : null}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the suite**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Dock.jsx
git commit -m "feat(dock): sub-group tickets by story within each column"
```

---

## Task 8: CSS — sub-headers, captions, icon, staleness without the dot

**Files:**
- Modify: `src/index.css` — ticket block (`129-158`), dock block (`388-407`).

- [ ] **Step 1: Replace the `age-dot` rules with issue-type icon + story caption**

In `src/index.css`, replace lines 144-145 (the two `.age-dot` rules):

```css
.age-dot { width: 0.45rem; height: 0.45rem; border-radius: 50%; background: var(--age-c, var(--faint)); flex: none; }
.ticket[data-age='stale'] .age-dot { width: 0.6rem; height: 0.6rem; }
```

with:

```css
.itype { width: 0.95rem; height: 0.95rem; display: grid; place-items: center; flex: none; color: var(--faint); }
.itype img, .itype svg { width: 100%; height: 100%; display: block; object-fit: contain; }
.story-cap { grid-column: 1 / -2; font-family: var(--font-m); font-size: 0.59rem; letter-spacing: 0.04em; color: var(--capc, var(--faint)); margin-bottom: 0.02rem; }
```

- [ ] **Step 2: Make the age value bold and add the stale-card wash**

In `src/index.css`, change `.ticket-age` (line 153) to weight 700 and append the wash rule. Replace line 153:

```css
.ticket-age { font-family: var(--font-m); font-size: 0.7rem; font-weight: 600; color: var(--age-c, var(--dim)); }
```

with:

```css
.ticket-age { font-family: var(--font-m); font-size: 0.7rem; font-weight: 700; color: var(--age-c, var(--dim)); }
.ticket[data-age='stale'] { background: color-mix(in srgb, var(--red) 7%, var(--panel-2)); }
```

- [ ] **Step 3: Switch dock cards to a single-column flow and add sub-group styles**

In `src/index.css`, replace the `.dock-cards` rule (lines 400-405):

```css
.dock-cards {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 0.3rem; align-content: start; min-height: 0;
  overflow-y: auto; padding-right: 0.15rem;
  scrollbar-width: thin; scrollbar-color: var(--line-2) transparent;
}
```

with:

```css
/* grouped columns read as vertical story clusters, so cards are single-column */
.dock-cards {
  display: flex; flex-direction: column; gap: 0.3rem; min-height: 0;
  overflow-y: auto; padding-right: 0.15rem;
  scrollbar-width: thin; scrollbar-color: var(--line-2) transparent;
}
.story-cluster { display: flex; flex-direction: column; }
.subcards { display: flex; flex-direction: column; gap: 0.3rem; margin: 0.1rem 0 0.45rem; }
.story-cluster:last-child .subcards { margin-bottom: 0; }
.substory { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.2rem 0.06rem; }
.substory .bar { width: 0.18rem; height: 0.82rem; border-radius: 2px; background: var(--barc, var(--steel-3)); flex: none; }
.substory .nm { font-size: 0.66rem; font-weight: 600; color: var(--nmc, var(--dim)); min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.substory .ct { font-family: var(--font-m); font-size: 0.6rem; color: var(--faint); flex: none; }
```

- [ ] **Step 4: Verify in the browser preview (mock)**

Ensure the mock dev server is running (`npm run mock` / preview_start `sprint-boss-mock`). Reload the preview.
- `preview_console_logs` (level error): no new errors.
- `preview_snapshot`: confirm a working column (e.g. TO DO) shows story sub-headers (e.g. "Platform upgrades · 3") with cards beneath, an "Other" cluster at the bottom, and that cards lead with an issue-type glyph (the generic square in mock) instead of the old dot.
- `preview_screenshot`: capture the dock for the user.

Expected: sub-headers render with colored bars, "Other" holds singletons (with inline story caption) + parentless, stale cards carry a faint red wash, every card leads with the type glyph.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat(dock): story sub-header + caption styles; type icon; staleness wash (drop dot)"
```

---

## Task 9: Update CLAUDE.md dock description

**Files:**
- Modify: `CLAUDE.md` (the Raid dock description, ~line 13-16).

- [ ] **Step 1: Update the dock sentence**

In `CLAUDE.md`, find the dock description (currently):

```
  dock (`Dock.jsx`): real tickets grouped by board column — every column
  (queue, working, and blocked) shows the full card for all of its issues and
  scrolls internally rather than truncating; blocked also carries its reason.
```

Replace with:

```
  dock (`Dock.jsx`): real tickets grouped by board column and, within each
  column, sub-grouped by **story** (the Jira parent) — a story with 2+ tickets
  in that column gets a colored sub-header (`groupByStory`/`storyColor` in
  `raidState.js`, tested), while singletons + parentless tickets fold into a
  quiet "Other" cluster (folded singletons keep their story name inline). Every
  column shows the full card for all of its issues and scrolls internally rather
  than truncating; blocked also carries its reason. Each card leads with the
  Jira **issue-type icon** (proxied via `/api/icon`, in-code glyph fallback)
  instead of a staleness dot — staleness now reads from the bold age value plus
  a faint red wash on stale cards.
```

- [ ] **Step 2: Note the new fetch fields in the data-layer section**

In `CLAUDE.md`, the architecture bullet listing Jira fields — add `parent` and `issuetype` awareness. Find the avatars/proxy bullet and add a sibling note near it:

```
- Issue-type icons render from Jira's `issuetype.iconUrl` via the auth'd
  `/api/icon` proxy (Jira-host-allowlisted; falls back to a generic glyph and to
  404 in mock). Story = each issue's `parent` (`parentKey`/`parentName`), fetched
  alongside `issuetype` and carried through `derive.js`.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: dock story sub-grouping + issue-type icons"
```

---

## Self-Review Notes

- **Spec coverage:** data layer (Tasks 1-3), icon proxy (Task 4), grouping logic + color + tests (Task 5), rendering incl. icon/caption/accent (Tasks 6-7), blocked column gets icon + caption no sub-headers (Task 7), CSS incl. layout tradeoff + staleness relocation (Task 8), docs (Task 9). All spec sections map to a task.
- **Type consistency:** `groupByStory` returns `{ stories: [{key,name,color,issues}], other }` — consumed exactly so in `Dock.jsx`. `storyColor(parentKey)` used in `Dock.jsx` for blocked + folded captions and inside `groupByStory` for clusters. `Ticket` props `accent` + `storyCaption:{name,color}` match both call sites. Derived field names (`parentKey`, `parentName`, `issueType`, `issueTypeIcon`, `isSubtask`) are identical across `mock.js`, `jira.js`, `derive.js`, `raidState.js`, `Ticket.jsx`, `Dock.jsx`.
- **Degradation:** mock has `issueTypeIcon: null` → glyph; `/api/icon` 404s without Jira config → glyph on `onError`; parentless → "Other" with no caption; whole-column-`other` → no header.
```
