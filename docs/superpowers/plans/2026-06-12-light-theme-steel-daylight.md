# Steel-Daylight Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the warm bone/manila light theme with a cool blue-gray "steel daylight" palette; pin every 3D canvas to the dark palette in both themes; give the arena a framed-viewport seam in light mode. Dark mode stays byte-identical.

**Architecture:** All changes are CSS tokens plus re-pointing six `cssVar()` reads in `ArenaScene.jsx` from themed vars to new theme-independent `--scene-*` tokens declared in `:root`. No logic, no state, no data-layer changes. Spec: `docs/superpowers/specs/2026-06-12-light-theme-redo-design.md`.

**Tech Stack:** Plain CSS custom properties in `src/index.css`, React 18 + @react-three/fiber v8 (read-only touch), vitest (must stay green), browser preview for visual verification.

**Context for a fresh engineer:**

- Theme is toggled by setting `data-theme="dark" | "light"` on `<html>` (see `src/App.jsx` `useTheme`, persisted in localStorage key `sb-theme`). All theming is CSS variables defined in two blocks at the top of `src/index.css`.
- The arena is a Three.js scene (`src/raid/ArenaScene.jsx`) that reads CSS variables once at mount via `cssVar(name, fallback)` (`src/raid/cssVar.js` — reads computed style off `document.documentElement`). It is the ONLY scene file that reads themed vars; `Environment.jsx`, `FighterCard.jsx`, sprites etc. already use hardcoded dark hex values.
- The standup fighter card's mini-canvas (`src/raid/FighterCard.jsx`) has a transparent Canvas over the `.fc-art` CSS gradient, which is already hardcoded dark — it needs no JS change.
- `npm test` runs vitest (pure logic only — nothing in this plan touches it, but it must stay green). `npm run mock` starts the app with synthetic data for visual checks.
- **Do not modify anything inside the `html[data-theme='dark']` block or any dark-mode-visible value.**

---

### Task 1: Pin the 3D scenes to the dark palette (`--scene-*` tokens)

This task is behavior-neutral in dark mode (the new tokens equal the dark values) and makes the arena render identically in light mode.

**Files:**
- Modify: `src/index.css:8-18` (the `:root` block)
- Modify: `src/raid/ArenaScene.jsx:179` (floor texture), `:266` (fighter name colors), `:395-396` (background + fog)
- Modify: `src/index.css:374` (`.arena` background)

- [ ] **Step 1: Add scene tokens to `:root` in `src/index.css`**

Append to the existing `:root` block (after the `--ember` line):

```css
  /* 3D scene tokens — every canvas (arena, fighter card) is pinned to the
     dark palette in BOTH themes; scenes read these, never the themed vars. */
  --scene-bg: #0a0e13;
  --scene-panel: #0c1219;
  --scene-ink: #e8eef4;
  --scene-dim: #8da0b3;
```

- [ ] **Step 2: Re-point the six `cssVar()` reads in `src/raid/ArenaScene.jsx`**

Line 179 (inside `Floor`):

```jsx
    () => floorTexture(cssVar('--scene-bg', '#0a0e13'), cssVar('--scene-panel', '#0c1219')),
```

Line 266 (inside `FighterNames`):

```jsx
            <meshBasicMaterial color={focused ? cssVar('--scene-ink', '#e8eef4') : cssVar('--scene-dim', '#8da0b3')}
```

Lines 395–396 (inside the `Canvas`):

```jsx
      <color attach="background" args={[cssVar('--scene-bg', '#0a0e13')]} />
      <fog attach="fog" args={[cssVar('--scene-bg', '#0a0e13'), 12, 25]} />
```

- [ ] **Step 3: Pin the `.arena` container background**

In `src/index.css` line 374, change `background: var(--bg)` to `background: var(--scene-bg)` so the strip behind/around the canvas is dark in both themes (identical value in dark mode):

```css
.arena { position: relative; flex: 0 1 22vh; min-height: 0; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; background: var(--scene-bg); }
```

- [ ] **Step 4: Run the test suite**

Run: `npm test`
Expected: all tests PASS (no logic touched).

- [ ] **Step 5: Visual check in preview (both themes)**

Start the preview with `npm run mock` (or the preview tools). In dark mode confirm the arena is pixel-identical to before. Toggle the sun/moon button in the header to light mode (current warm light theme — Task 2 replaces it) and confirm the arena scene, floor, fog, and fighter name captions stay dark while the chrome goes light.

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/raid/ArenaScene.jsx
git commit -m "feat(theme): pin 3D scenes to dark palette via :root --scene-* tokens"
```

---

### Task 2: Rebuild the light token block (steel daylight)

**Files:**
- Modify: `src/index.css:42-67` (the entire `html[data-theme='light']` block)

- [ ] **Step 1: Replace the `html[data-theme='light']` block**

Replace the whole block (currently warm bone/manila, lines 42–67) with:

```css
html[data-theme='light'] {
  /* steel daylight — the night-shift floor with the lights on */
  color-scheme: light;
  --bg: #dfe4e9;
  --bg-grid: rgba(50, 80, 110, 0.07);
  --panel: #f6f8fa;
  --panel-2: #eef1f4;
  --inset: #e2e7ec;
  --line: #c3ccd6;
  --line-2: #a4b2c0;
  --ink: #1c2733;
  --dim: #5d6f81;
  --faint: #8c9aa8;
  --steel: #8a9aab;
  --steel-2: #64798d;
  --steel-3: #d3dae1;
  --eye: #0c9e8d;
  --belt: #d4dbe2;
  --belt-stripe: rgba(180, 122, 10, 0.55);
  --glow-red: rgba(210, 51, 65, 0.14);
  --hatch-dark: rgba(28, 39, 51, 0.22);
  --teal: #0d9488;
  --amber: #b07c08;
  --red: #d23341;
  --lime: #65a30d;
  --ember: #d8521f;
}
```

Note: signals are darkened for contrast on light ground (same approach as the old block) but retuned cooler — amber less brown, red less brick. These are starting values; the verification task tunes them live with Bogdan.

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: PASS (CSS-only change).

- [ ] **Step 3: Visual check in preview**

In light mode, sweep the deck: header, HP bar + scars, fighter roster bar, dock columns (including a blocked card and a stale card), ticker, standup overlay, enrage chip. Confirm cool steel ground everywhere, readable ink, signals legible on light panels. Toggle to dark and confirm it is unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): rebuild light theme as steel daylight (cool blue-gray)"
```

---

### Task 3: Light-scoped overrides — shadows, overlays, framed arena seam

Hardcoded colors in `src/index.css` that were tuned for dark ground get `html[data-theme='light']` overrides. Dark values are untouched.

**Files:**
- Modify: `src/index.css` (the two existing light overrides at lines 288 and 307, plus new overrides appended in a dedicated section)

- [ ] **Step 1: Update the two existing light overrides in place**

Line 288 — modal backdrop (was warm `rgba(60, 58, 48, 0.4)`):

```css
html[data-theme='light'] .backdrop { background: rgba(28, 39, 51, 0.4); }
```

Line 307 — standup overlay scrim (was warm `rgba(231, 228, 220, 0.88)`):

```css
html[data-theme='light'] .standup { background: rgba(223, 228, 233, 0.88); }
```

- [ ] **Step 2: Add a light-overrides section**

Append at the end of `src/index.css`:

```css
/* ── steel-daylight overrides ───────────────────────────────────────
   Hardcoded colors tuned for dark ground, re-tuned for light. Shadows go
   softer and bluer (ink-steel, not black). Dark mode is untouched. */

html[data-theme='light'] body {
  /* the room vignette: black is too heavy on steel daylight */
  background:
    radial-gradient(120% 90% at 50% -10%, transparent 60%, rgba(28, 39, 51, 0.12)),
    linear-gradient(var(--bg-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--bg-grid) 1px, transparent 1px),
    var(--bg);
  background-size: 100% 100%, 3rem 3rem, 3rem 3rem, 100% 100%;
}

html[data-theme='light'] .panel { box-shadow: 0 0.4rem 1.4rem rgba(28, 39, 51, 0.14); }
html[data-theme='light'] .enrage-math { box-shadow: 0 0.8rem 2rem rgba(28, 39, 51, 0.25); }
html[data-theme='light'] .avatar { border-color: rgba(28, 39, 51, 0.25); }
html[data-theme='light'] .fc-stat { background: rgba(28, 39, 51, 0.035); }

/* framed viewport: the dark arena is a monitor on the light deck — panel
   border language plus a thin dark inner keyline so the seam is deliberate */
html[data-theme='light'] .arena {
  border-color: #9fb0c0;
  box-shadow: inset 0 0 0 1px rgba(10, 14, 19, 0.65), 0 2px 10px rgba(28, 39, 51, 0.18);
}
```

- [ ] **Step 3: Run the test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Visual check in preview**

Light mode: open the ticket modal (backdrop tint), the standup overlay (scrim + fighter card stat cells + dark mini-canvas), hover the enrage timer (popover shadow), and look at the arena seam (border + keyline reads as a framed monitor). Dark mode: confirm nothing moved — every override is scoped to `html[data-theme='light']`.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): light-scoped shadow/overlay overrides + framed arena viewport"
```

---

### Task 4: Full verification pass and Bogdan's tuning round

**Files:** none created — this is verification plus possible token nudges in `src/index.css`.

- [ ] **Step 1: Test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Structured preview sweep (both themes)**

With `npm run mock` running, verify in **light** mode:

1. Boot/no-sprint screens — `BossFigure` SVG golem reads CSS vars (`--eye`, `--steel-2`, `--dim`, `--inset`); confirm it reads cleanly on light ground.
2. Command deck — HP bar (live, depleted, scope-hatched, blocked-ringed segments), scar timeline, enrage timer + hover math.
3. Arena — dark scene, framed seam, combat log overlay legible over the dark scene, floor name captions still dim steel (scene tokens).
4. Fighter roster bar — chip hover/active/dimmed states.
5. Dock — story sub-headers, stale red wash, blocked column with reason text.
6. Ticker, focus lens (click a fighter), Esc to clear.
7. Standup overlay — person chips, moved/parked board, fighter card (dark mini-canvas, badge tones, stat tones).
8. Enrage ambience if reachable in mock (`.app[data-enraged='true']` room glow uses `--glow-red`).

Then toggle **dark** and spot-check the same surfaces are unchanged.

- [ ] **Step 3: Screenshot for Bogdan**

Capture light-mode screenshots of the command deck and standup overlay and present them. Bogdan is a designer and the spec marks token values as starting points — apply his nudges directly to the `html[data-theme='light']` block / overrides section and re-verify.

- [ ] **Step 4: Update CLAUDE.md**

Add to the Constraints & conventions section of `CLAUDE.md` (per its "keep this file current" rule), after the theming sentence in the first bullet:

```markdown
- Light theme is "steel daylight" (cool blue-gray, same steel family as dark).
  Every 3D canvas is pinned to the dark palette via theme-independent
  `--scene-*` tokens in `:root` (`index.css`) — scene code reads those, never
  themed vars; in light mode the arena renders as a framed dark viewport.
  Light-only fixes live in the `steel-daylight overrides` section at the end of
  `index.css`, all scoped to `html[data-theme='light']`.
```

- [ ] **Step 5: Final commit**

```bash
git add src/index.css CLAUDE.md
git commit -m "docs: record steel-daylight light theme + scene-token convention"
```

---

## Self-review notes

- Spec coverage: §1 token block → Task 2; §2 scene pinning + framed seam → Tasks 1 and 3; §3 hardcoded sweep → Task 3; §4 scope surfaces + BossFigure check → Task 4 sweep; testing section → every task runs `npm test` + Task 4 visual pass.
- No TDD test-writing steps: the change is CSS tokens and constant re-pointing with zero logic; verification is the existing suite staying green plus structured browser checks (consistent with the project's "R3F components are verified in the browser preview" convention).
- Dark-mode safety: Task 1's re-pointed values equal the dark theme's values; Tasks 2–3 only touch the light block or `html[data-theme='light']`-scoped rules.
