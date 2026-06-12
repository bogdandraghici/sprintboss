// src/raid/flourish.js
// Ambient "shadow-boxing": idle fighters occasionally run their attack swing
// so the line never freezes into a static row between real ticket completions.
// Pure decoration — a flourish carries NO strike (no damage number, no boss
// hit, no hit-stop/shake); only completed tickets deal real damage.
//
// Driven off the render clock via accumulated dt (like the existing sway),
// never Date.now()/Math.random — the cadence is a deterministic function of the
// fighter's seed, so it's reproducible and respects the scene's purity rule.

export const FLOURISH_MIN = 11;  // seconds — soonest a fighter flourishes again
export const FLOURISH_MAX = 24; // ...and latest; each fighter draws its own gap

// Deterministic pseudo-random in [0,1) from two numbers (GLSL-style hash) —
// stands in for Math.random so the schedule stays reproducible.
export function hash01(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Gap (seconds) before a fighter's `count`-th flourish. `seed` separates
// fighters (pass the per-fighter phase) so the line never flourishes in sync.
export function flourishGap(seed, count) {
  return FLOURISH_MIN + hash01(seed + 1, count + 1) * (FLOURISH_MAX - FLOURISH_MIN);
}

// Who shadow-boxes: anyone still in the fight. Excluded: the downed and the
// exhausted (individually spent — they slump), and the victory tableau (its own
// celebratory hop owns the moment). Defeat/overrun does NOT suppress it: the
// team is still grinding, and a frozen slumped line is the deadness we're
// fixing — a defiant swing reads as "still swinging despite being behind".
export function flourishEligible(status, tableau) {
  if (status === 'down' || status === 'exhausted') return false;
  if (tableau === 'victory') return false;
  return true;
}

// Fresh scheduler state. Each fighter owns one (in a ref).
export const newFlourish = () => ({ phase: 'wait', timer: 0, count: 0 });

// Advance the scheduler by dt. Returns the local swing time (0..atkTotal) while
// a flourish is playing, else null. `enabled` gates it to the calm battle state
// (false when down/resting/exhausted/victory/defeat) and resets a swing in
// progress so a fighter never flourishes through a state change.
export function stepFlourish(s, dt, seed, atkTotal, enabled) {
  if (!enabled) {
    s.phase = 'wait';
    s.timer = 0;
    return null;
  }
  s.timer += dt;
  if (s.phase === 'play') {
    if (s.timer < atkTotal) return s.timer;
    s.phase = 'wait';
    s.timer = 0;
    s.count += 1;
    return null;
  }
  if (s.timer >= flourishGap(seed, s.count)) {
    s.phase = 'play';
    s.timer = 0;
    return 0;
  }
  return null;
}
