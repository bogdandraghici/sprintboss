# Mechanic Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Explain every invented game mechanic (enrage, carryover, staleness, scope scars, HEAL, fighter statuses…) with succinct themed tooltips, per `docs/superpowers/specs/2026-06-13-mechanic-tooltips-design.md`.

**Architecture:** One `data-tip` attribute API rendered by a single root-mounted `TooltipLayer` (fixed-position bubble — dock columns scroll internally, so per-element CSS bubbles would clip). All tip strings come from pure formatters in `src/tipCopy.js` (vitest-tested). Every native `title` in touched components migrates to `data-tip`; the enrage button is the one exception (its hover math panel gains a definition footer instead).

**Tech Stack:** React 18 (plain JSX, no TS), vitest, CSS vars in `src/index.css`. No new dependencies.

**Conventions that bind this plan:** commits go directly to `main`; `npm test` runs vitest; DOM/R3F components are verified in the browser preview, pure logic gets unit tests. Run all commands from the repo root (`/Users/bogdandraghici/Desktop/vibes/Sprint Boss`).

---

### Task 1: `tipCopy.js` formatters (TDD)

**Files:**
- Create: `src/tipCopy.js`
- Test: `src/__tests__/tipCopy.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/tipCopy.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { fmtDate } from '../lib';
import {
  ageTip, carryTip, scopeTip, hpSegTip, bossHpTip, scarStripTip, scarTip,
  creepTip, logTagTip, LOG_TAG_TIPS, storyMeterTip, statusTip, STATUS_TIPS,
  chipTip, staleCountTip, beaconTip, unestimatedTip,
} from '../tipCopy';

const AGING = { freshDays: 1, warmDays: 3 };

describe('ageTip', () => {
  it('is null when aging is off or band is off', () => {
    expect(ageTip(5, 'stale', null)).toBeNull();
    expect(ageTip(5, 'off', AGING)).toBeNull();
  });
  it('fresh names the fresh threshold', () => {
    expect(ageTip(0.5, 'fresh', AGING)).toBe('12h in this column — fresh (≤1d).');
  });
  it('warm names the stale threshold', () => {
    expect(ageTip(2, 'warm', AGING)).toBe('2d in this column — warm; stale past 3d.');
  });
  it('stale explains the threshold it crossed', () => {
    expect(ageTip(12, 'stale', AGING)).toBe('12d in this column — stale (past 3d without moving).');
  });
});

describe('carryTip', () => {
  it('is null for first-sprint tickets', () => {
    expect(carryTip([])).toBeNull();
    expect(carryTip(undefined)).toBeNull();
  });
  it('2nd sprint: ordinal + carry count, no amber clause', () => {
    expect(carryTip([{ id: 41 }])).toBe('2nd sprint for this ticket — carried over 1×.');
  });
  it('3rd+ sprint adds the amber clause', () => {
    expect(carryTip([{ id: 40 }, { id: 41 }]))
      .toBe('3rd sprint for this ticket — carried over 2×. Amber from ×3.');
  });
});

describe('hpSegTip', () => {
  const base = { key: 'MT-1', points: 3, done: false, blocked: false, addedMidSprint: false };
  it('base segment: key + size', () => {
    expect(hpSegTip(base, 'pts')).toBe('MT-1 · 3 pts');
  });
  it('appends done, blocked, and scope flags', () => {
    expect(hpSegTip({ ...base, done: true }, 'pts')).toBe('MT-1 · 3 pts · done');
    expect(hpSegTip({ ...base, blocked: true }, 'tickets')).toBe('MT-1 · 3 tickets · blocked');
    expect(hpSegTip({ ...base, done: true, addedMidSprint: true }, 'pts'))
      .toBe('MT-1 · 3 pts · done · joined mid-sprint (scope)');
  });
});

describe('scarTip', () => {
  it('lists up to 6 keys then counts the rest', () => {
    const g = { ts: 1750000000000, pts: 9, keys: ['A', 'B'] };
    expect(scarTip(g, 'pts')).toBe(`${fmtDate(g.ts)} · +9 pts joined mid-sprint: A, B`);
    const big = { ts: g.ts, pts: 9, keys: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] };
    expect(scarTip(big, 'pts'))
      .toBe(`${fmtDate(g.ts)} · +9 pts joined mid-sprint: A, B, C, D, E, F +2 more`);
  });
});

describe('creepTip', () => {
  it('interpolates count and unit', () => {
    expect(creepTip(48, 'tickets')).toBe('48 tickets joined after sprint start — the boss healed.');
  });
});

describe('logTagTip', () => {
  it('covers exactly the five damage-log event types', () => {
    expect(Object.keys(LOG_TAG_TIPS).sort())
      .toEqual(['blocked', 'done', 'reopened', 'scope-added', 'unblocked']);
  });
  it('HEAL explains the counterintuitive direction', () => {
    expect(logTagTip('scope-added')).toBe('Scope added — the boss regains HP.');
  });
  it('unknown type is null', () => {
    expect(logTagTip('nope')).toBeNull();
  });
});

describe('statusTip', () => {
  it('covers exactly the four fighter statuses', () => {
    expect(Object.keys(STATUS_TIPS).sort()).toEqual(['down', 'exhausted', 'fighting', 'resting']);
  });
  it('exhausted explains the all-stale derivation', () => {
    expect(statusTip('exhausted')).toBe('Exhausted — every open ticket has gone stale.');
  });
  it('unknown status falls back to fighting', () => {
    expect(statusTip('???')).toBe(STATUS_TIPS.fighting);
  });
});

describe('chipTip', () => {
  it('idle chip invites focus, using the first name', () => {
    expect(chipTip('ada lovelace', false)).toBe('Ada — click to focus the deck on their tickets.');
  });
  it('active chip explains the clear toggle', () => {
    expect(chipTip('Ada Lovelace', true)).toBe('Ada — click again to clear focus.');
  });
});

describe('storyMeterTip', () => {
  it('is null without progress', () => {
    expect(storyMeterTip(null)).toBeNull();
  });
  it('explains the all-columns count', () => {
    expect(storyMeterTip({ done: 4, total: 9 }))
      .toBe("4/9 of this story's sprint tickets done — counts every column.");
  });
});

describe('staleCountTip', () => {
  it('names the threshold; null when aging off', () => {
    expect(staleCountTip(AGING)).toBe('Parked past the stale threshold (3d).');
    expect(staleCountTip(null)).toBeNull();
  });
});

describe('unestimatedTip', () => {
  it('pts mode: assumed value', () => {
    expect(unestimatedTip(3, 'pts')).toBe('No estimate — assumed 3 pts.');
  });
  it('tickets mode: counted, singular/plural', () => {
    expect(unestimatedTip(1, 'tickets')).toBe('No estimate — counted as 1 ticket.');
    expect(unestimatedTip(2, 'tickets')).toBe('No estimate — counted as 2 tickets.');
  });
});

describe('static tips', () => {
  it('exist and are non-empty', () => {
    for (const t of [scopeTip(), bossHpTip(), scarStripTip(), beaconTip()]) {
      expect(typeof t).toBe('string');
      expect(t.length).toBeGreaterThan(10);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/__tests__/tipCopy.test.js`
Expected: FAIL — cannot resolve `../tipCopy`.

- [ ] **Step 3: Implement `src/tipCopy.js`**

```js
// src/tipCopy.js
// Tooltip copy for every explained mechanic — "metaphor + plain meaning" voice.
// Pure formatters only; components set the result as data-tip and the shared
// TooltipLayer renders it. Dynamic thresholds (aging, ordinals, counts) are
// always interpolated, never vague.
import { fmtDays, fmtDate, ordinal, firstName } from './lib';

export function ageTip(days, band, aging) {
  if (!aging || band === 'off') return null;
  const d = fmtDays(days);
  if (band === 'fresh') return `${d} in this column — fresh (≤${aging.freshDays}d).`;
  if (band === 'warm') return `${d} in this column — warm; stale past ${aging.warmDays}d.`;
  return `${d} in this column — stale (past ${aging.warmDays}d without moving).`;
}

export function carryTip(priorSprints) {
  const n = Array.isArray(priorSprints) ? priorSprints.length : 0;
  if (n < 1) return null;
  const base = `${ordinal(n + 1)} sprint for this ticket — carried over ${n}×.`;
  return n + 1 >= 3 ? `${base} Amber from ×3.` : base;
}

export const scopeTip = () => 'Joined mid-sprint — scope creep.';

export function hpSegTip(issue, unit) {
  let t = `${issue.key} · ${issue.points} ${unit}`;
  if (issue.done) t += ' · done';
  if (issue.blocked) t += ' · blocked';
  if (issue.addedMidSprint) t += ' · joined mid-sprint (scope)';
  return t;
}

export const bossHpTip = () =>
  'Boss HP = open work. One segment per ticket — it drains as tickets land; gold burned in the last ~2h.';

export const scarStripTip = () =>
  'Scope scars — each ✚ marks tickets that joined after the sprint started.';

export function scarTip(group, unit) {
  const keys = group.keys.slice(0, 6).join(', ') +
    (group.keys.length > 6 ? ` +${group.keys.length - 6} more` : '');
  return `${fmtDate(group.ts)} · +${group.pts} ${unit} joined mid-sprint: ${keys}`;
}

export function creepTip(n, unit) {
  return `${n} ${unit} joined after sprint start — the boss healed.`;
}

// Keyed by event type (matches LOG_TYPES in components/hud.jsx).
export const LOG_TAG_TIPS = {
  done: 'Ticket landed — the boss takes damage.',
  'scope-added': 'Scope added — the boss regains HP.',
  blocked: 'Ticket flagged blocked — its fighter goes down.',
  unblocked: 'Block lifted — the fighter is back up.',
  reopened: 'Done ticket reopened — its damage is undone.',
};
export const logTagTip = (type) => LOG_TAG_TIPS[type] || null;

export function storyMeterTip(p) {
  if (!p) return null;
  return `${p.done}/${p.total} of this story's sprint tickets done — counts every column.`;
}

// Keyed by fighter status (matches deriveParty in raid/raidState.js).
export const STATUS_TIPS = {
  fighting: 'Fighting — has fresh work in flight.',
  resting: 'Resting — nothing open right now.',
  exhausted: 'Exhausted — every open ticket has gone stale.',
  down: 'Down — has a blocked ticket.',
};
export const statusTip = (status) => STATUS_TIPS[status] || STATUS_TIPS.fighting;

export function chipTip(name, active) {
  return active
    ? `${firstName(name)} — click again to clear focus.`
    : `${firstName(name)} — click to focus the deck on their tickets.`;
}

export function staleCountTip(aging) {
  return aging ? `Parked past the stale threshold (${aging.warmDays}d).` : null;
}

export const beaconTip = () => 'Blocked — the beacon cools as the block ages (~24h).';

export function unestimatedTip(points, unit) {
  if (unit === 'pts') return `No estimate — assumed ${points} pts.`;
  return `No estimate — counted as ${points} ticket${points === 1 ? '' : 's'}.`;
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: all tests PASS (new file + existing suites untouched).

- [ ] **Step 5: Commit**

```bash
git add src/tipCopy.js src/__tests__/tipCopy.test.js
git commit -m "feat(tooltips): tipCopy formatters for every explained mechanic"
```

---

### Task 2: TooltipLayer + CSS + mount

**Files:**
- Create: `src/components/TooltipLayer.jsx`
- Modify: `src/index.css` (append a `tooltip layer` section)
- Modify: `src/App.jsx` (mount the layer)

No unit test — DOM components are preview-verified per project convention (Task 6).

- [ ] **Step 1: Create `src/components/TooltipLayer.jsx`**

```jsx
// src/components/TooltipLayer.jsx
// The one tooltip in the app. Any DOM element can declare data-tip="…" and
// this root-mounted layer renders it as a single fixed-position bubble — a
// pseudo-element approach would be clipped by the dock's internally-scrolling
// columns. Nested [data-tip] resolves to the innermost (closest()). Hover-only
// by design: the TV has no pointer, so the wall display never sees it.
import { useEffect, useRef, useState } from 'react';

const SHOW_DELAY = 150; // ms before the bubble appears
const TOP_FLIP = 64; // px — anchors above this line get the bubble below them
const EDGE = 150; // px — keep the bubble's center clear of the viewport edges

export default function TooltipLayer() {
  const [tip, setTip] = useState(null); // { text, x, y, below }
  const timer = useRef(null);
  const anchor = useRef(null);

  useEffect(() => {
    const hide = () => {
      clearTimeout(timer.current);
      anchor.current = null;
      setTip(null);
    };
    const onOver = (e) => {
      const el = e.target instanceof Element ? e.target.closest('[data-tip]') : null;
      if (el === anchor.current) return;
      clearTimeout(timer.current);
      anchor.current = el;
      setTip(null);
      if (!el) return;
      timer.current = setTimeout(() => {
        if (!el.isConnected) return hide();
        const text = el.getAttribute('data-tip');
        if (!text) return;
        const r = el.getBoundingClientRect();
        const below = r.top < TOP_FLIP;
        setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom : r.top, below });
      }, SHOW_DELAY);
    };
    // pointerover covers anchor-to-anchor moves; pointerout only matters when
    // the cursor leaves the window entirely (no further over events fire).
    const onOut = (e) => {
      if (!e.relatedTarget) hide();
    };
    const onKey = (e) => e.key === 'Escape' && hide();
    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('scroll', hide, true);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!tip) return null;
  const x = Math.max(EDGE, Math.min(window.innerWidth - EDGE, tip.x));
  return (
    <div
      className="tipbox mono"
      aria-hidden="true"
      data-below={tip.below || undefined}
      style={{ left: x, top: tip.y }}
    >
      {tip.text}
    </div>
  );
}
```

- [ ] **Step 2: Append the CSS section to `src/index.css`**

At the end of the main (theme-independent) section — BEFORE the
`steel-daylight overrides` block at the end of the file, since `.tipbox` uses
themed vars and needs no light-mode override:

```css
/* ── tooltip layer (shared bubble for all data-tip elements) ───── */
.tipbox {
  position: fixed; z-index: 80; pointer-events: none;
  transform: translate(-50%, calc(-100% - 0.45rem));
  max-width: 280px; padding: 0.35rem 0.6rem;
  background: var(--panel-2); border: 1px solid var(--line-2); border-radius: 6px;
  color: var(--ink); font-size: 0.72rem; line-height: 1.4;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  animation: tip-in 120ms ease-out;
}
.tipbox[data-below] { transform: translate(-50%, 0.45rem); }
@keyframes tip-in { from { opacity: 0; } }
```

(z-80 sits above the modal backdrop at z-60 and the standup overlay at z-50.)

- [ ] **Step 3: Mount in `src/App.jsx`**

Add the import:

```js
import TooltipLayer from './components/TooltipLayer';
```

and render it last inside the `.app` div, after the TicketModal line:

```jsx
      {selected && <TicketModal issue={selected} view={view} onClose={() => setSelected(null)} />}
      <TooltipLayer />
```

- [ ] **Step 4: Sanity-run the suite**

Run: `npm test`
Expected: PASS (nothing imports the new component in tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/TooltipLayer.jsx src/index.css src/App.jsx
git commit -m "feat(tooltips): shared TooltipLayer bubble driven by data-tip"
```

---

### Task 3: HUD migrations (`hud.jsx`)

**Files:**
- Modify: `src/components/hud.jsx`

- [ ] **Step 1: Import the formatters**

```js
import { bossHpTip, hpSegTip, creepTip, scarStripTip, scarTip, logTagTip } from '../tipCopy';
```

- [ ] **Step 2: Enrage math panel — definition footer (NOT a data-tip)**

In `EnrageTimer`, inside `<span className="enrage-math">`, after the last
`<span>` (the slack/miss line), add:

```jsx
        <span style={{ color: 'var(--faint)' }}>enraged = projected finish past sprint end</span>
```

The `.enrage` button gets no `data-tip` anywhere — its hover already opens this panel.

- [ ] **Step 3: HpBar — label, creep counter, segments**

The "Boss HP" label:

```jsx
        <span className="label" data-tip={bossHpTip()}>Boss HP</span>
```

The creep counter span:

```jsx
          {s.scopeAddedPts > 0 && (
            <span style={{ color: 'var(--lime)' }} data-tip={creepTip(s.scopeAddedPts, unit)}> (+{s.scopeAddedPts} creep)</span>
          )}
```

Each `.hpseg` button: replace the `title={...}` line with:

```jsx
            data-tip={hpSegTip(issue, unit)}
```

- [ ] **Step 4: ScarTimeline — strip + scars**

The `.scarline` div:

```jsx
      <div className="scarline" data-tip={scarStripTip()}>
```

Each `.scar` span: replace its `title={...}` line with:

```jsx
            data-tip={scarTip(g, unit)}
```

`ScarTimeline` doesn't currently know the unit — give it the same derivation
HpBar uses, near the top of the component:

```js
  const unit = view.stats.anyEstimated ? 'pts' : 'tickets';
```

(Nesting is correct by design: hovering a scar shows the scar's own tip — the
TooltipLayer resolves the innermost `[data-tip]`.)

- [ ] **Step 5: DamageLog — tags**

```jsx
          <span className="dlog-tag" data-t={e.type} data-tip={logTagTip(e.type)}>{LOG_TYPES[e.type]}</span>
```

- [ ] **Step 6: Verify no `title=` remains in hud.jsx, run suite, commit**

Run: `grep -n "title=" src/components/hud.jsx` → expected: no matches.
Run: `npm test` → expected: PASS.

```bash
git add src/components/hud.jsx
git commit -m "feat(tooltips): HUD — boss HP, creep, scars, damage-log tags; enrage math footer"
```

---

### Task 4: Cards, dock, modal migrations

**Files:**
- Modify: `src/components/Ticket.jsx`
- Modify: `src/components/Dock.jsx`
- Modify: `src/components/TicketModal.jsx`

- [ ] **Step 1: `Ticket.jsx` — card, icon, key/scope, age, carryover**

Import:

```js
import { ageTip, carryTip, scopeTip } from '../tipCopy';
```

In `IssueTypeIcon`, both `<span className="itype" title={type || ''}>`
occurrences become:

```jsx
    <span className="itype" data-tip={type || undefined}>
```

In `Ticket`, the card button: replace `title={`${issue.key} — ${issue.summary}`}`
with:

```jsx
      data-tip={`${issue.key} — ${issue.summary}`}
```

The key span carries the scope-creep concept when the card is a mid-sprint add
(the lime `+` glyph is CSS on this element):

```jsx
      <span className="ticket-key" data-tip={issue.addedMidSprint ? scopeTip() : undefined}>
```

The carryover badge: replace its `title={...}` line with:

```jsx
            data-tip={carryTip(issue.priorSprints)}
```

(`nthSprint` stays — `data-heavy` still uses it.)

The age numeral:

```jsx
      {band !== 'off' && (
        <span className="ticket-age" data-tip={ageTip(issue.daysInColumn, band, view.aging)}>
          {fmtDays(issue.daysInColumn)}
        </span>
      )}
```

- [ ] **Step 2: `Dock.jsx` — story meter**

Import:

```js
import { storyMeterTip } from '../tipCopy';
```

Replace the `.story-meter` div's `title={p ? `${p.done}/${p.total} done` : undefined}` with:

```jsx
              <div className="story-meter" style={{ '--barc': s.color }} data-tip={storyMeterTip(p)}>
```

- [ ] **Step 3: `TicketModal.jsx` — UNESTIMATED chip + blocked alert**

Import:

```js
import { unestimatedTip, beaconTip } from '../tipCopy';
```

The UNESTIMATED chip:

```jsx
          {!issue.estimated && (
            <span className="chip" style={{ color: 'var(--amber)', borderStyle: 'dashed' }} data-tip={unestimatedTip(issue.points, unit)}>
              UNESTIMATED
            </span>
          )}
```

The blocked alert div (the whole strip is the hover target, not the tiny dot) —
add to its existing props:

```jsx
            data-tip={beaconTip()}
```

- [ ] **Step 4: Verify, run, commit**

Run: `grep -rn "title=" src/components/Ticket.jsx src/components/Dock.jsx src/components/TicketModal.jsx` → expected: no matches.
Run: `npm test` → expected: PASS.

```bash
git add src/components/Ticket.jsx src/components/Dock.jsx src/components/TicketModal.jsx
git commit -m "feat(tooltips): cards, dock and modal — age, carryover, scope, story meter, unestimated, beacon"
```

---

### Task 5: Fighters, ticker, retro marks

**Files:**
- Modify: `src/components/FighterBar.jsx`
- Modify: `src/raid/FighterCard.jsx`
- Modify: `src/components/TruthTicker.jsx`
- Modify: `src/components/Modes.jsx` (retro mark title migration only)

- [ ] **Step 1: `FighterBar.jsx` — chips**

Import:

```js
import { chipTip } from '../tipCopy';
```

Replace the chip's `title={f.name}` with:

```jsx
            data-tip={chipTip(f.name, active)}
```

- [ ] **Step 2: `FighterCard.jsx` — status badge**

Import:

```js
import { statusTip } from '../tipCopy';
```

(`FighterCard.jsx` lives in `src/raid/`, so `../tipCopy` resolves to `src/tipCopy.js`.)

```jsx
        <span className="fc-badge" data-tone={status.tone} data-tip={statusTip(fighter.status)}>{status.label}</span>
```

- [ ] **Step 3: `TruthTicker.jsx` — stale counts**

Import:

```js
import { staleCountTip } from '../tipCopy';
```

```jsx
            {stale > 0 && <i className="ticker-stale" data-tip={staleCountTip(view.aging)}> {stale} stale</i>}
```

- [ ] **Step 4: `Modes.jsx` — retro mark title migrates verbatim**

Line ~243: replace `title={`${e.key} · ${fmtDate(e.ts)}`}` with:

```jsx
              data-tip={`${e.key} · ${fmtDate(e.ts)}`}
```

- [ ] **Step 5: Verify, run, commit**

Run: `grep -rn "title=" src/components src/raid` → expected: no matches
(if any other stragglers show up, migrate them the same way — `data-tip`
verbatim — and note it in the commit).
Run: `npm test` → expected: PASS.

```bash
git add src/components/FighterBar.jsx src/raid/FighterCard.jsx src/components/TruthTicker.jsx src/components/Modes.jsx
git commit -m "feat(tooltips): fighter chips, standup status badge, ticker stale, retro marks"
```

---

### Task 6: Browser verification + docs

**Files:**
- Modify: `CLAUDE.md` (new convention)
- Modify: `docs/superpowers/specs/2026-06-13-mechanic-tooltips-design.md` (only if reality diverged)

- [ ] **Step 1: Verify in the browser preview**

Use the running preview server (`sprint-boss-live` on port 5173, or start
`sprint-boss-mock`). Check, via hover + screenshot:

1. "Boss HP" label → bubble appears after ~150 ms, flips BELOW (top band).
2. An HP segment → key/points/flags bubble; segment click still opens the modal.
3. A scar on the scar strip → per-scar tip (not the strip tip); strip background → strip tip.
4. A damage-log HEAL tag → "Scope added — the boss regains HP."
5. A card's age numeral deep in a scrolled dock column → bubble NOT clipped by the column.
6. A ×N carryover badge → ordinal + amber clause on a ×3+ card.
7. A fighter chip → focus invitation; click it → tip hides on pointerdown, focus engages; hover again → "click again to clear focus."
8. Open a ticket modal with a blocked issue → blocked strip tip renders ABOVE the modal (z-80 > z-60); UNESTIMATED chip tip.
9. Standup mode → status badge tip on the fighter card.
10. Enrage button hover → math panel opens with the new footer line, NO tooltip bubble.
11. Toggle light theme → bubble is white-panel/ink, readable.
12. Esc, scroll, and click each hide the bubble.

- [ ] **Step 2: Update `CLAUDE.md`**

In "Architecture rules", add one bullet:

```markdown
- **Tooltips**: any DOM element explains itself via a `data-tip` attribute,
  rendered by the single root-mounted `TooltipLayer`
  (`src/components/TooltipLayer.jsx`, bubble styled as `.tipbox`); copy comes
  from pure formatters in `src/tipCopy.js` (tested) in a "metaphor + plain
  meaning" voice. Never use native `title` attrs (double bubble); nested
  `data-tip` resolves to the innermost. The enrage button is the one exception
  (its hover math panel carries the definition). The 3D arena gets no tooltips —
  concepts are explained on their DOM counterparts.
```

- [ ] **Step 3: Final suite + commit**

Run: `npm test` → expected: PASS.

```bash
git add CLAUDE.md docs/superpowers/specs/2026-06-13-mechanic-tooltips-design.md
git commit -m "docs: record data-tip/TooltipLayer tooltip convention"
```
