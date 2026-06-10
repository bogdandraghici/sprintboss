// Module-level "trauma" accumulator: writers add, the camera rig drains per-frame.
let trauma = 0;
export const addShake = (amt) => { trauma = Math.min(1, trauma + amt); };
export const drainShake = (dt) => {
  const t = trauma;
  trauma = Math.max(0, trauma - dt * 1.4);
  return t * t; // squared: small hits whisper, big hits thump
};
