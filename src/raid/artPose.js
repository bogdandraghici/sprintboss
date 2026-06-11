// src/raid/artPose.js
// Pure animation math for painted (art-path) fighters. Mirrors the matrix
// fighters' 5-segment ATK timeline (FighterSprite.jsx) so strikes land at the
// same moment and hit-stop/shake/sparks fire unchanged. Angles in radians
// (positive z-rot = lean away from the boss, who stands at +x); x in world
// units; sy is a feet-anchored vertical scale.
export const STRIKE_AT = 0.22;
export const ATK_TOTAL = 0.6;

const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

// Pose at t seconds into a swing; null once fully recovered (caller idles).
// { x, rot, sy, strike } — strike is true only during the impact segment.
export function attackPose(t) {
  if (t >= ATK_TOTAL) return null;
  if (t < 0.12) { const k = t / 0.12; return { x: lerp(0, -0.1, k), rot: lerp(0, 0.12, k), sy: lerp(1, 0.96, k), strike: false }; }
  if (t < STRIKE_AT) { const k = (t - 0.12) / 0.1; return { x: lerp(-0.1, -0.18, k), rot: lerp(0.12, 0.16, k), sy: lerp(0.96, 0.93, k), strike: false }; }
  if (t < 0.32) return { x: 0.55, rot: -0.1, sy: 1.04, strike: true };
  if (t < 0.44) { const k = (t - 0.32) / 0.12; return { x: lerp(0.55, 0.5, k), rot: lerp(-0.1, -0.06, k), sy: lerp(1.04, 1, k), strike: false }; }
  const k = easeOut((t - 0.44) / 0.16);
  return { x: lerp(0.5, 0, k), rot: lerp(-0.06, 0, k), sy: 1, strike: false };
}

// Calm idle: breath + faint sway, phase-offset so the line doesn't sync up.
export function idlePose(t, phase = 0, speed = 1) {
  return { rot: 0.01 * Math.sin(t * 0.9 * speed + phase), sy: 1 + 0.012 * Math.sin(t * 1.7 * speed + phase) };
}

// Victory hop: bounce with a squash on each landing.
export function victoryPose(t, phase = 0) {
  const c = Math.abs(Math.sin(t * 3 + phase));
  return { y: 0.22 * c, sy: c < 0.12 ? 0.94 : 1 + 0.05 * c };
}

// Blocked: laid out, rotated away from the fight. Exhausted/defeat: a slump.
export const DOWN_ROT = 1.31; // ≈75°
export const SLUMP = { rot: 0.07, sy: 0.97 };
