# Standup Fighter Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In standup mode, show a full-height fighter card beside the moved/parked board with the selected person's live animated sprite, name, class, and 6 stats.

**Architecture:** A new presentational `FighterCard` renders a small standalone R3F `<Canvas>` reusing the arena's exact fighter rig (`FighterArtRig`/`FighterSprite`), which self-animates idle/shadow-boxing off the render clock. `StandupOverlay` computes `deriveParty(snap)`, finds the selected person's fighter, and lays the card to the left of the existing board in a two-column flex. Pure stat/label logic lives in a tested helper module.

**Tech Stack:** React 18, @react-three/fiber v8, vitest, CSS variables.

---

## File Structure

- **Create** `src/raid/fighterCard.js` — pure helpers `cardStats`, `weaponClassLabel` (tested).
- **Create** `src/raid/__tests__/fighterCard.test.js` — vitest spec for the helpers.
- **Create** `src/raid/FighterCard.jsx` — the card component + its mini R3F scene (verified in preview).
- **Modify** `src/raid/sprites/roster.js` — add a `weaponFor(name)` export.
- **Modify** `src/components/Modes.jsx` — compute party, restructure `.su-board` into a two-column body, mount `<FighterCard>`.
- **Modify** `src/index.css` — add `.su-body`, `.fighter-card`, `.fc-*` styles.

---

## Task 1: Roster weapon accessor

**Files:**
- Modify: `src/raid/sprites/roster.js` (add export beside `artScaleFor`, ~line 94)

- [ ] **Step 1: Add the `weaponFor` export**

In `src/raid/sprites/roster.js`, directly after the `artScaleFor` export (around line 94), add:

```javascript
// Weapon class for a person ('sword' | 'hammer' | 'bow' | 'staff' | 'daggers').
// Unknown assignees resolve through __recruit__ (which is 'sword').
export const weaponFor = (name) => personOf(name).weapon;
```

- [ ] **Step 2: Commit**

```bash
git add src/raid/sprites/roster.js
git commit -m "feat(roster): export weaponFor accessor"
```

---

## Task 2: Pure card helpers (TDD)

**Files:**
- Create: `src/raid/fighterCard.js`
- Test: `src/raid/__tests__/fighterCard.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/raid/__tests__/fighterCard.test.js`:

```javascript
// src/raid/__tests__/fighterCard.test.js
import { describe, it, expect } from 'vitest';
import { cardStats, weaponClassLabel } from '../fighterCard';

describe('cardStats', () => {
  const f = { done: 3, open: 5, stale: 2, blocked: 1, status: 'fighting' };

  it('returns the five numeric cells in order', () => {
    const stats = cardStats(f, 4);
    expect(stats.map((s) => s.label)).toEqual([
      'Completed', 'Moved 24h', 'In flight', 'Stale', 'Blocked',
    ]);
  });

  it('maps values from the fighter and the moved count', () => {
    const stats = cardStats(f, 4);
    expect(stats.map((s) => s.value)).toEqual([3, 4, 5, 2, 1]);
  });

  it('tones only the done/stale/blocked cells', () => {
    const byKey = Object.fromEntries(cardStats(f, 4).map((s) => [s.key, s.tone]));
    expect(byKey).toEqual({
      done: 'done', moved: null, open: null, stale: 'stale', blocked: 'blocked',
    });
  });
});

describe('weaponClassLabel', () => {
  it('maps known weapons to role names', () => {
    // Andrei Scheau = bow, Cristina Stanica = staff, Calin Nicoara = hammer,
    // Alex Preda = daggers, Serban Chiricescu = sword (from ROSTER).
    expect(weaponClassLabel('Andrei Scheau')).toBe('Archer');
    expect(weaponClassLabel('Cristina Stanica')).toBe('Mage');
    expect(weaponClassLabel('Calin Nicoara')).toBe('Breaker');
    expect(weaponClassLabel('Alex Preda')).toBe('Rogue');
    expect(weaponClassLabel('Serban Chiricescu')).toBe('Swordfighter');
  });

  it('falls back to the recruit weapon (sword) for unknown names', () => {
    expect(weaponClassLabel('Nobody At All')).toBe('Swordfighter');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- fighterCard`
Expected: FAIL — cannot resolve import `../fighterCard`.

- [ ] **Step 3: Write the implementation**

Create `src/raid/fighterCard.js`:

```javascript
// src/raid/fighterCard.js
// Pure presentation logic for the standup FighterCard: the stat grid and the
// weapon→role label. Kept separate from the R3F component so it's unit-tested
// (the component itself is verified in the browser preview).
import { weaponFor } from './sprites/roster';

// The five numeric cells, in display order. The sixth fact (status) is shown as
// the badge over the art, not as a grid cell.
export function cardStats(fighter, movedCount) {
  return [
    { key: 'done',    label: 'Completed', value: fighter.done,    tone: 'done' },
    { key: 'moved',   label: 'Moved 24h', value: movedCount,      tone: null },
    { key: 'open',    label: 'In flight', value: fighter.open,    tone: null },
    { key: 'stale',   label: 'Stale',     value: fighter.stale,   tone: 'stale' },
    { key: 'blocked', label: 'Blocked',   value: fighter.blocked, tone: 'blocked' },
  ];
}

const WEAPON_ROLE = {
  sword:   'Swordfighter',
  daggers: 'Rogue',
  bow:     'Archer',
  staff:   'Mage',
  hammer:  'Breaker',
};

// Draft wording — Bogdan's art-direction pass owns the final names.
export function weaponClassLabel(name) {
  return WEAPON_ROLE[weaponFor(name)] || 'Swordfighter';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- fighterCard`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/raid/fighterCard.js src/raid/__tests__/fighterCard.test.js
git commit -m "feat(standup): pure cardStats + weaponClassLabel helpers"
```

---

## Task 3: FighterCard component

**Files:**
- Create: `src/raid/FighterCard.jsx`

No unit test — R3F components are verified in the browser preview (project convention). Built here, wired in Task 4, verified in Task 6.

- [ ] **Step 1: Write the component**

Create `src/raid/FighterCard.jsx`:

```jsx
// src/raid/FighterCard.jsx
// Standup-only: a full-height card showing one fighter live (idle +
// shadow-boxing), their name/class, and a stat grid. The art stage is a small
// standalone R3F canvas that reuses the arena's exact rig selection, so the
// figure matches the battle. Pure logic lives in fighterCard.js; this file is
// verified in the browser preview.
import { Canvas } from '@react-three/fiber';
import FighterSprite from './FighterSprite';
import FighterArtRig from './FighterArtRig';
import { artSlugFor } from './sprites/roster';
import { LITE } from './ArenaScene';
import { cardStats, weaponClassLabel } from './fighterCard';

const STATUS = {
  fighting:  { label: 'Fighting',  tone: 'fighting' },
  resting:   { label: 'Resting',   tone: 'resting' },
  exhausted: { label: 'Exhausted', tone: 'exhausted' },
  down:      { label: 'Down',      tone: 'down' },
};

// Fighter art is ~2.2 world units tall with feet at y=0. Drop the rig by ~half
// its height so the body centres on the origin the camera looks at.
const FIGHTER_DROP = -1.05;

function CardScene({ fighter }) {
  const art = artSlugFor(fighter.name);
  const Comp = art ? FighterArtRig : FighterSprite;
  return (
    <Canvas
      dpr={LITE ? 1 : [1, 1.75]}
      gl={{ alpha: true, antialias: !LITE }}
      camera={{ fov: 30, position: [0, 0, 4.2] }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[-4, 5, 4]} intensity={50} color="#7fe7ff" />
      <pointLight position={[4.5, 4, 2]} intensity={45} color="#ff9d5c" />
      <Comp
        fighter={fighter}
        art={art}
        lite={LITE}
        phase={0}
        attack={null}
        onStrike={() => {}}
        beaconHeat={fighter.status === 'down' ? 1 : 0}
        tableau={null}
        focus={null}
        onFocus={() => {}}
        position={[0, FIGHTER_DROP, 0]}
      />
    </Canvas>
  );
}

export default function FighterCard({ fighter, movedCount }) {
  const status = STATUS[fighter.status] || STATUS.fighting;
  const stats = cardStats(fighter, movedCount);
  return (
    <div className="fighter-card">
      <div className="fc-art">
        <span className="fc-badge" data-tone={status.tone}>{status.label}</span>
        <CardScene fighter={fighter} />
        <div className="fc-shadow" />
      </div>
      <div className="fc-name">
        <div className="fc-n">{fighter.name}</div>
        <div className="fc-role">{weaponClassLabel(fighter.name)}</div>
      </div>
      <div className="fc-stats">
        {stats.map((s) => (
          <div key={s.key} className="fc-stat" data-tone={s.tone || undefined}>
            <div className="fc-v">{s.value}</div>
            <div className="fc-l">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/raid/FighterCard.jsx
git commit -m "feat(standup): FighterCard component with live sprite + stats"
```

---

## Task 4: Wire the card into StandupOverlay

**Files:**
- Modify: `src/components/Modes.jsx` (imports at top; `StandupOverlay` body, lines 93-180)

- [ ] **Step 1: Add imports**

At the top of `src/components/Modes.jsx`, after the existing imports (line 4), add:

```javascript
import FighterCard from '../raid/FighterCard';
import { deriveParty } from '../raid/raidState';
```

- [ ] **Step 2: Derive the party and look up the selected fighter**

In `StandupOverlay`, just after the existing `const person = ...` line (line 96), add:

```javascript
const party = useMemo(() => deriveParty(snap), [snap]);
const fighter = person ? party.find((f) => f.name === person.name) : null;
```

- [ ] **Step 3: Restructure the person panel into a two-column body**

Replace the panel block — from `{person && (` (line 127) through the avatar+name header `</div>` (line 135) — with the two-column wrapper that drops the redundant name header (the card now headlines the name) and keeps the meta line on the board:

Replace this:

```jsx
      {person && (
        <div className="panel su-board">
          <div className="flex items-center gap-3 mb-2">
            <Avatar name={person.name} src={person.avatar} size="2.2rem" />
            <span className="text-[1.05rem] font-semibold">{person.name}</span>
            <span className="label label-faint ml-auto">
              {person.moved.length} moved · {person.still.length} parked
            </span>
          </div>

          <div className="label mb-1" style={{ color: 'var(--teal)' }}>Moved yesterday</div>
```

with this:

```jsx
      {person && (
        <div className="su-body">
          {fighter && <FighterCard fighter={fighter} movedCount={person.moved.length} />}
          <div className="panel su-board">
          <div className="flex items-center mb-2">
            <span className="label label-faint ml-auto">
              {person.moved.length} moved · {person.still.length} parked
            </span>
          </div>

          <div className="label mb-1" style={{ color: 'var(--teal)' }}>Moved yesterday</div>
```

- [ ] **Step 4: Close the new wrapper div**

The replaced block opened one extra wrapper (`.su-body`) around the existing `.su-board`. Find the closing of the panel — the `</div>` that currently closes `<div className="panel su-board">` (line 176, just before the `)}` that closes the `{person && (` block) — and add one more `</div>` to close `.su-body`. The end of the block should read:

```jsx
          ))}
          </div>
        </div>
      )}
```

(The first `</div>` closes `.su-board`, the second closes `.su-body`.)

- [ ] **Step 5: Verify it compiles**

Run: `npm test -- fighterCard` (sanity — helpers still pass) and confirm no import errors. Full visual check happens in Task 6.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Modes.jsx
git commit -m "feat(standup): mount FighterCard beside the moved/parked board"
```

---

## Task 5: Card styles

**Files:**
- Modify: `src/index.css` (append near the existing `.standup` / `.su-*` rules)

- [ ] **Step 1: Add the CSS**

Append to `src/index.css` (next to the other `.su-*` rules):

```css
/* ── standup fighter card ──────────────────────────────────────── */
.su-body {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  width: 100%;
}
.fighter-card {
  flex: none;
  width: 280px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--panel-2), var(--panel));
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
.fc-art {
  position: relative;
  height: 300px;
  border-bottom: 1px solid var(--line);
  background: radial-gradient(120% 90% at 50% 18%, #20303b 0%, #0d1319 70%);
}
.fc-art canvas { display: block; width: 100% !important; height: 100% !important; }
.fc-shadow {
  position: absolute;
  bottom: 26px;
  left: 50%;
  width: 120px;
  height: 18px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  filter: blur(5px);
  pointer-events: none;
}
.fc-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2em 0.6em;
  border-radius: 6px;
  border: 1px solid var(--teal);
  color: var(--teal);
  background: rgba(0, 0, 0, 0.3);
}
.fc-badge[data-tone="resting"]   { color: var(--dim); border-color: var(--dim); }
.fc-badge[data-tone="exhausted"] { color: var(--gold); border-color: var(--gold); }
.fc-badge[data-tone="down"]      { color: var(--red); border-color: var(--red); }
.fc-name { padding: 0.85rem 1rem 0.25rem; }
.fc-n { font-size: 1.25rem; font-weight: 700; }
.fc-role { font-size: 0.7rem; color: var(--dim); letter-spacing: 0.05em; }
.fc-stats {
  padding: 0.6rem 1rem 1.1rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
.fc-stat {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
}
.fc-v { font-size: 1.35rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.fc-l { font-size: 0.6rem; color: var(--faint); text-transform: uppercase; letter-spacing: 0.06em; }
.fc-stat[data-tone="done"] .fc-v    { color: var(--teal); }
.fc-stat[data-tone="stale"] .fc-v   { color: var(--gold); }
.fc-stat[data-tone="blocked"] .fc-v { color: var(--red); }
```

> Note: this uses CSS variables `--panel-2`, `--line`, `--teal`, `--gold`, `--red`, `--dim`, `--faint`. Confirm these names exist in `:root` in `src/index.css`; if a name differs (e.g. `--panel2`), match the existing spelling. (`--panel-2` is the spelling used in `ArenaScene.jsx`'s `cssVar('--panel-2', …)`.)

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "style(standup): fighter card layout and stat grid"
```

---

## Task 6: Preview verification

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server (mock data has multiple assignees + movement)**

Run: `npm run mock`
Then use the preview tools: `preview_start`, navigate to the app.

- [ ] **Step 2: Enter standup and inspect the card**

Switch to standup mode (Header segmented control). Use `preview_snapshot` + `preview_screenshot`. Confirm:
- The fighter card sits left of the moved/parked board.
- The sprite renders and is animated (idle bob / occasional shadow-box swing).
- Name + class label show; the 6 facts read correctly (5 grid cells + status badge), and match the board's meta counts.
- Arrow keys switch person → the card swaps fighter.

Check `preview_console_logs` for WebGL / R3F errors.

- [ ] **Step 3: Tune framing if needed**

If the fighter is mis-framed (cropped feet/head or off-centre), adjust `camera.position`, `fov`, or `FIGHTER_DROP` in `src/raid/FighterCard.jsx` and re-check. Commit any tuning:

```bash
git add src/raid/FighterCard.jsx
git commit -m "style(standup): tune fighter card framing"
```

- [ ] **Step 4: Check the `?lite` path**

Reload with `?lite` in the URL (`preview_eval: window.location.search='?lite'` or navigate). Confirm the second canvas (card) + arena canvas underneath don't visibly choke. If it stutters badly, escalate to Bogdan with the two documented fallbacks (unmount arena during standup, or static rasterized sprite under lite) — do not pick one silently.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all pass (including the new `fighterCard` spec).

---

## Notes for the implementer

- **No `Date.now()` in scene code** — the card's animation comes entirely from the rig's render-clock-driven idle/flourish. Don't add timers.
- **Data matches the battle** — the card uses `deriveParty(snap)`, the same selector the arena uses, so numbers are consistent by construction.
- **Art is draft** — class-label wording and sprite art are Bogdan's call; ship the mechanism, flag visual decisions.
- **CLAUDE.md** — if this lands, the standup section of `CLAUDE.md` should gain a line about the fighter card (do it in the same session per the "Keep this file current" rule).
