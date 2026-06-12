// src/raid/cameraControls.js
// Pure math for the interactive battle-camera (pan + zoom). The CameraRig in
// ArenaScene composes these with the ambient sway + hit-stop shake; input
// handlers feed them. Presentation-only — nothing here touches `view`.

export const ZOOM_MIN = 1;        // default framing (can't zoom out past it)
export const ZOOM_MAX = 3;        // closest inspect
export const IDLE_RETURN_S = 4;   // seconds idle before easing back home
export const DRAG_THRESHOLD = 8;  // px before a press counts as a pan (not a click)

// Half-span (world units) of content the camera may center on, measured from
// the home target. Fighters run ~-16.5..+2.4 and the boss sits at +4.6, so the
// reachable extent is a touch wider than the fighter line on each side.
export const PAN_EXTENT = { x: 12, y: 3.2 };

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const clampZoom = (z) => clamp(z, ZOOM_MIN, ZOOM_MAX);

// Frame-rate-independent exponential ease of `current` toward `target`.
// tau is the time-constant in seconds (smaller = snappier).
export function ease(current, target, dt, tau = 0.18) {
  if (dt <= 0) return current;
  const k = 1 - Math.exp(-dt / tau);
  return current + (target - current) * k;
}

// Half-extents of the view at the target plane for a given zoom.
// vFov in radians, dist = eye→target distance at zoom 1, aspect = width/height.
export function viewHalf(vFov, dist, aspect, zoom) {
  const halfH = Math.tan(vFov / 2) * (dist / Math.max(zoom, ZOOM_MIN));
  return { halfH, halfW: halfH * aspect };
}

// Keep pan within bounds so panning never reveals empty space past the content.
// At zoom 1 the whole line fits, so the reachable range collapses to 0.
export function clampPan(pan, half, extent = PAN_EXTENT) {
  const maxX = Math.max(0, extent.x - half.halfW);
  const maxY = Math.max(0, extent.y - half.halfH);
  return { x: clamp(pan.x, -maxX, maxX), y: clamp(pan.y, -maxY, maxY) };
}

// Adjust pan so the world point under the cursor stays put across a zoom step
// (zoom-to-cursor). ndc components in [-1,1], y up. Pass the view half-extents
// before and after the zoom change.
export function cursorZoomPan(pan, ndc, oldHalf, newHalf) {
  return {
    x: pan.x + ndc.x * (oldHalf.halfW - newHalf.halfW),
    y: pan.y + ndc.y * (oldHalf.halfH - newHalf.halfH),
  };
}

// World translation for a screen-space drag (pixels) at the current view.
// Dragging right pulls content right → camera pans left, hence the negated dx;
// screen y is down, world y is up, so dy is negated too.
export function dragToPan(pan, dxPx, dyPx, half, viewportW, viewportH) {
  const perPxX = (2 * half.halfW) / viewportW;
  const perPxY = (2 * half.halfH) / viewportH;
  return { x: pan.x - dxPx * perPxX, y: pan.y + dyPx * perPxY };
}

// How much the ambient sway should contribute, given how far the camera is from
// home. Full sway at rest (zoom 1, no pan); fades to 0 as the user engages.
export function swayFactor(pan, zoom) {
  const engaged = (zoom - ZOOM_MIN) + (Math.abs(pan.x) + Math.abs(pan.y)) * 0.25;
  return clamp(1 - engaged, 0, 1);
}
