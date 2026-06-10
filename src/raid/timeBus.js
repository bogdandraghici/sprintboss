// Module-level hit-stop: writers add freeze seconds, TimeKeeper (ArenaScene)
// drains once per frame, everyone else just asks "are we frozen?".
// Mirrors shakeBus.
let freeze = 0;
export const addFreeze = (s) => { freeze = Math.min(0.25, freeze + s); };
export const drainFreeze = (dt) => { freeze = Math.max(0, freeze - dt); };
export const frozen = () => freeze > 0;
export const freezeLeft = () => freeze;
