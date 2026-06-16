# Boss sprite — drop generated art here

The raid boss renders from `idle.png` in this folder if it exists. No file →
the app falls back to the in-code pixel matrix (`src/raid/sprites/boss.js`).
Drop a PNG in and reload; it auto-upgrades. Loader: `src/raid/bossArt.js`.

## Files

| File | Required | Purpose |
|---|---|---|
| `idle.png` | yes | The boss, standing. Used for idle + every reaction. |
| `cast.png` | optional | A "summoning / arms-raised" pose, shown briefly on scope-creep. Omit it and the idle sprite rears up via a scale stretch instead. |

## File requirements

- **Transparent background** (PNG with alpha). No baked drop-shadow, no ground, no text, no frame/border.
- **One creature, centered**, full body in frame with a little padding. The bottom of the sprite = where it meets the floor line.
- **Crisp pixels** — it's rendered with nearest-neighbor filtering. Export at a clean pixel scale (e.g. draw at 128–256px tall, export at 1×–4× integer scale). Avoid anti-aliased / feathered edges; they'll look muddy.
- **Square-ish or taller** canvas is fine — the loader fits to a fixed world height and derives width from the image's aspect ratio, so any proportion works.
- `cast.png`, if used, should be the **same canvas size and footing** as `idle.png` so the swap doesn't jump.

## What the engine still does (don't bake these in)

Generate a **calm, neutral** boss. The scene adds, in code:

- **Enrage** → a red tint over the whole sprite.
- **Hit flash** → a white flash on each ticket completed.
- **HP damage stages** → glowing orange cracks overlaid at 75 / 50 / 25% HP.
- **Death** → sink + fade on a cleared sprint.
- **Breathing**, knockback, orbiting debris shards.

So: don't draw it already-red, already-cracked, or mid-animation. One clean idle pose.

> **Current shipped boss runs hot (June 2026).** The active `idle.png` is a
> crowned magma golem that already carries heavy baked-in lava veins and flame.
> To stop the engine overlays from doubling into mush, the enrage tint and the
> HP-stage crack streaks were **softened** in `src/raid/BossSprite.jsx` (tint
> ≈1.08/0.93/0.91, crack opacity 0.4), and the enrage read now leans on the
> scene's red rim light + embers. If you later swap back to a genuinely **calm**
> boss, bump those back up (the original values were tint 1.18/0.82/0.78, crack
> opacity 0.85) or the damage/enrage escalation will barely show.

## Generation prompt (pixel-art)

Paste into your image generator. Tuned to match the scene (dark slate hall, ember light, HD-2D):

> Pixel-art sprite of a menacing fantasy boss monster, full body, front-facing
> with a slight low camera angle so it looms. A hulking, hunched creature of
> fractured dark slate-blue stone and shadow — asymmetric jagged silhouette,
> broad uneven shoulders, long heavy arms ending in clawed stone fists, a small
> low-set head sunk between the shoulders. Two burning orange ember eyes are the
> only bright feature; thin veins of molten orange glow through the cracks in
> its body. Cold rim light from the upper-left, deep shadow elsewhere, ominous
> and powerful. Limited cohesive palette: slate blues/greys (#33384a, #4e5468,
> #727b91) with orange ember accents (#ff6033, #ff9d3d). Detailed clean pixel
> art, HD-2D game boss, crisp pixels, no anti-aliasing. Centered, isolated on a
> fully transparent background, no ground shadow, no text.

For `cast.png`, append: *"same creature, same scale and footing, both arms wrenched upward overhead in a summoning pose, eyes and body cracks flaring brighter."*

### Tips
- If your tool won't do true transparency, generate on a flat magenta/green background and key it out, or ask for "transparent background, alpha channel."
- Generate a few; pick the one with the most aggressive, asymmetric silhouette — that's what reads as "monster" from across the room.
- Keep the head small and the shoulders huge; that single proportion does most of the menace.
