// src/raid/raidState.js
import { ageBand } from '../lib';

// One fighter per assignee with issues in the sprint.
// Status priority: down (any blocked) > exhausted (open work, all stale)
// > fighting (open work) > resting (all done).
export function deriveParty(view) {
  const agingOn = !view.flags?.noChangelog;
  const byName = new Map();
  for (const issue of view.issues) {
    const name = issue.assignee;
    if (!name) continue;
    const f = byName.get(name) || {
      name, avatar: issue.assigneeAvatar || null,
      open: 0, done: 0, stale: 0, blocked: 0, issues: [],
    };
    f.issues.push(issue);
    if (!f.avatar && issue.assigneeAvatar) f.avatar = issue.assigneeAvatar;
    if (issue.done) f.done += 1;
    else {
      f.open += 1;
      if (issue.blocked) f.blocked += 1;
      else if (agingOn && ageBand(issue.daysInColumn, view.aging) === 'stale') f.stale += 1;
    }
    byName.set(name, f);
  }
  const party = [...byName.values()].map((f) => ({
    ...f,
    status:
      f.blocked > 0 ? 'down'
      : f.open === 0 ? 'resting'
      : f.stale === f.open ? 'exhausted'
      : 'fighting',
  }));
  // Stable order so the battle row doesn't reshuffle every poll.
  party.sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
  return party;
}

export const MINION_CAP = 6;

// Open mid-sprint additions stand beside the boss; overflow clusters as a horde.
export function deriveMinions(view) {
  const adds = view.issues.filter((i) => i.addedMidSprint && !i.done);
  return { minions: adds.slice(0, MINION_CAP), horde: Math.max(0, adds.length - MINION_CAP) };
}

// Live pulses -> scene actions. Fighter index -1 = hit lands with no visible attacker.
export function pulseActions(pulses, party) {
  const actions = [];
  for (const p of pulses) {
    if (p.type === 'done') {
      actions.push({
        id: p.id, kind: 'attack',
        fighter: party.findIndex((f) => f.name === p.actor),
        points: p.points || 1,
      });
    } else if (p.type === 'scope-added') {
      actions.push({ id: p.id, kind: 'summon', points: p.points || 1 });
    }
  }
  return actions;
}
