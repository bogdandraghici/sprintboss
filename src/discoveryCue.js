// src/discoveryCue.js
// Discovery cue: a gentle, recurring nudge that the standup view exists. Pure
// cadence below; thin hook at the bottom. Presentation-only — reads UI `mode`
// and wall-clock elapsed, never touches `view` or retro reconstruction.
import { useEffect, useRef, useState } from 'react';

export const CUE_PERIOD_MS = 80_000; // one cue window every ~80s of ambient
export const CUE_WINDOW_MS = 7_000;  // each window lasts ~7s
export const STANDUP_HINT = "↑ Standup — each fighter's day at a glance";

// Is the cue showing at this elapsed time? The window sits at the END of each
// period, so elapsed 0 (just entered ambient) is quiet — no flash on arrival.
export function discoveryPhase(elapsedMs, { periodMs, windowMs }) {
  if (!(periodMs > 0)) return false;
  const w = Math.max(0, Math.min(windowMs, periodMs));
  return (elapsedMs % periodMs) >= (periodMs - w);
}

// Returns true only during a cue window while in ambient mode. Resets its
// elapsed clock whenever ambient is (re-)entered; ticks ~1s (window is 7s, so
// 1s granularity is plenty — the CSS animation carries the smoothness).
export function useDiscoveryCue(mode) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (mode !== 'ambient') { setElapsed(0); return undefined; }
    start.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Date.now() - start.current), 1000);
    return () => clearInterval(id);
  }, [mode]);
  return mode === 'ambient'
    && discoveryPhase(elapsed, { periodMs: CUE_PERIOD_MS, windowMs: CUE_WINDOW_MS });
}
