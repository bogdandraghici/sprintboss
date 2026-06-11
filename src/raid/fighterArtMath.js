// Pure helpers for the art-driven fighters — no THREE, unit-tested in node.
export { fitPlane } from './bossArtMath';

// Stable per-name pick into [0, count) so a given teammate always wears the
// same body variant (deterministic — no Math.random, retro-safe).
export function pickVariant(name, count) {
  if (!count) return 0;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(h, 31) + name.charCodeAt(i)) | 0;
  return ((h % count) + count) % count;
}
