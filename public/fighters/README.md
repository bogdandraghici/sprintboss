# Fighter bodies — drop generated art here

The party renders generated bodies from this folder if present, else falls back
to the in-code pixel matrix. Each teammate's avatar photo is pinned on top as
the head — so the bodies are **headless**. Loader: `src/raid/fighterArt.js`.

## Files

Name them `body-1.png`, `body-2.png`, … up to `body-6.png`. Each is a distinct
**class variant** (e.g. warrior / mage / rogue / cleric). Drop in as many as you
make; the loader picks up whatever exists. Each teammate is assigned a variant
by a stable hash of their name (`pickVariant`) — same person, same body every
time. Start with 3.

| File | Required | Purpose |
|---|---|---|
| `body-1.png` | yes (≥1) | A class-variant body. |
| `body-2.png` … | optional | More variants for visual variety across the party. |

## File requirements (important — these make the head pin correctly)

- **HEADLESS.** No head. End the figure at a short **neck stub, centered at the
  top** of the canvas. The avatar disc sits just above that stub.
- **Transparent background** (PNG with alpha). No baked shadow, ground, text, or frame.
- **Front-facing, standing idle pose**, arms relaxed, holding a weapon/tool is fine. Symmetric-ish footing.
- **Centered horizontally; feet at the bottom edge** of the canvas (the engine
  plants the bottom on the floor — keep the feet at the bottom, neck at the top).
- **Same canvas size, scale, and footing across all variants**, so they line up
  as a row and the head socket lands right on each. A tall portrait canvas
  (e.g. 768×1024) works well — body fills it head-stub to feet.
- **Crisp-ish, transparent edges.** Painted is fine (rendered with smooth
  filtering to match the boss); avoid a white matte halo. If your tool bakes a
  white background, run `python3 scripts/key-art.py in.png out.png --crop 64`
  (flood-fills the white out and trims to the feet).

## What the engine does (don't bake these in)

Generate a **calm, neutral, full-body idle**. The scene drives, in code:

- **Idle bob**, an **attack lunge** forward when the owner completes a ticket,
  and a **downed slump** (rotate + drop) when their ticket is blocked.
- **Dim** when the person is resting/exhausted; a **kill aura** ring at the feet.
- The **avatar head** pinned at the neck and riding all of the above.

So: one clean standing pose per variant. No mid-swing, no head, no effects.

## Generation prompt (paint to match the boss)

> Pixel-inflected painted sprite of a fantasy adventurer, **headless** — the
> figure ends at a short neck stub at the very top, no head/face. Full body,
> front-facing, standing idle, feet flat at the bottom of the frame, arms
> relaxed. Sturdy heroic build in worn armor and cloth. Cohesive grounded
> palette (slate, leather, steel) so it reads next to a dark stone arena and a
> rock-golem boss. Dramatic cool rim light from the upper-left, deep shadow.
> Centered, isolated on a fully transparent background, no ground shadow, no
> text. [VARIANT].

Swap `[VARIANT]` per file, keeping the same body scale, pose, and neck position:
- body-1: *"heavy warrior, broad shoulders, sword and round shield"*
- body-2: *"hooded mage, long robe, staff with a faint ember crystal"*
- body-3: *"lean rogue, light leather, twin daggers, hood down"*
- body-4: *"armored cleric, tabard, mace, small lantern at the belt"*

### Tips
- Generate each variant from the **same seed/base prompt** so scale and the neck
  position match — that keeps the avatar head landing correctly on all of them.
- Keep the neck stub small and dead-centre at the top; the photo disc covers it.
- If the head sits too high/low once it's in the scene, tell me — I tune one
  socket constant (`ART_SOCKET_Y` in `FighterSprite.jsx`) and the body height
  (`ART_H`); no re-generation needed.
