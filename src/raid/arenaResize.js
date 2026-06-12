// src/raid/arenaResize.js
// Bounds for the user-draggable arena height so neither the scene nor the
// ticket columns can be crushed. Pure — tested in arenaResize.test.js.
export const MIN_ARENA_PX = 120;
export const MAX_ARENA_FRACTION = 0.7;

export function clampArenaHeight(px, viewportH) {
  const max = viewportH * MAX_ARENA_FRACTION;
  return Math.max(MIN_ARENA_PX, Math.min(px, max));
}
