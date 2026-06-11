// Pure layout math for the art-driven boss — no THREE, unit-tested in node.
// Keeps bossArt.js (which imports THREE) out of the test path.

// Fit an image of imgW×imgH into a plane of fixed world height, preserving
// aspect. Returns [worldW, worldH]. Falls back to a square if height is 0.
export function fitPlane(imgW, imgH, targetH) {
  const w = imgH > 0 ? targetH * (imgW / imgH) : targetH;
  return [w, targetH];
}

// stage 1..3 → that many glowing crack streaks at deterministic spots on a
// w×h plane (fractions of the plane, so they scale with any sprite size).
// Replaces the matrix-composited CRACK overlays, which can't apply to a raster.
const CRACK_SEEDS = [
  { fx: 0.16, fy: 0.14, rot: 0.5, len: 0.4 },
  { fx: -0.2, fy: -0.04, rot: -0.6, len: 0.5 },
  { fx: 0.03, fy: -0.26, rot: 0.18, len: 0.34 },
];
export function crackSpecs(stage, w, h) {
  const n = Math.max(0, Math.min(3, stage | 0));
  return CRACK_SEEDS.slice(0, n).map((s) => ({
    x: s.fx * w,
    y: s.fy * h,
    rot: s.rot,
    len: s.len * h,
  }));
}
