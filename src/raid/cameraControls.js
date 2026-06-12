// src/raid/cameraControls.js
// Pure math for the interactive battle-camera (pan + zoom). The CameraRig in
// ArenaScene composes these with the ambient sway + hit-stop shake; input
// handlers feed them. Presentation-only — nothing here touches `view`.

export const ZOOM_MIN = 1;        // default framing (can't zoom out past it)
export const ZOOM_MAX = 3;        // closest inspect
export const IDLE_RETURN_S = 6;   // seconds idle before easing back home
export const DRAG_THRESHOLD = 8;  // px before a press counts as a pan (not a click)

// World bounds the camera's look-point may travel to — the whole cast plus the
// boss, with a little air around the edges. Fighters run ~-16.5..+2.4 and the
// boss/minions sit out to ~+6.5, so you can center on any of them.
export const CONTENT = { xMin: -18.5, xMax: 8.5, yMin: 0.5, yMax: 2.7 };
// Where the camera looks at rest (pan offsets are measured from here).
export const HOME = { x: 0, y: 1.65 };

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

// Clamp the look-point to the content span so you can center on any fighter
// (even an edge one, which may show a little space beyond it) but can't drift
// off into empty world. Pan is an offset from HOME.
export function clampPan(pan, content = CONTENT, home = HOME) {
  return {
    x: clamp(pan.x, content.xMin - home.x, content.xMax - home.x),
    y: clamp(pan.y, content.yMin - home.y, content.yMax - home.y),
  };
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
