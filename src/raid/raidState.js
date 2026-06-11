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
      // Route by issue key, NOT p.actor: the transition author may be a reviewer or
      // automation — not necessarily the assignee. Fighters are keyed by the issues
      // they own, so the owning fighter (not the closer) should swing.
      actions.push({
        id: p.id, kind: 'attack',
        fighter: party.findIndex((f) => f.issues.some((i) => i.key === p.key)),
        points: p.points ?? 1,
      });
    } else if (p.type === 'scope-added') {
      actions.push({ id: p.id, kind: 'summon', points: p.points ?? 1 });
    }
  }
  return actions;
}

// HP fraction -> boss damage stage. 0 pristine, 1..3 crack levels, 4 dead.
export function bossStage(stats) {
  if (!stats.total) return 0;
  const f = stats.remaining / stats.total;
  return f <= 0 ? 4 : f <= 0.25 ? 3 : f <= 0.5 ? 2 : f <= 0.75 ? 1 : 0;
}

// Dock groups mirror the board: working columns only (Done and blocked-zone
// columns never appear); blocked issues drain into one Blocked list, exactly
// like Factory's maintenance bay. Stalest-first within each group.
export function deriveDock(view, focus = null) {
  const doneIdx = view.columns.length - 1;
  const mine = (it) => !focus || it.assignee === focus;
  const lanes = view.columns
    .map((c, idx) => ({ name: c.name, idx, isBlockedZone: c.isBlockedZone }))
    .filter((c) => c.idx !== doneIdx && !c.isBlockedZone);
  const groups = lanes.map((c, i) => ({
    name: c.name,
    idx: c.idx,
    kind: i === 0 ? 'queue' : 'work',
    issues: view.issues
      .filter((it) => it.col === c.idx && !it.blocked && !it.done && mine(it))
      .sort((a, b) => a.columnSince - b.columnSince),
  }));
  const blocked = view.issues
    .filter((i) => i.blocked && !i.done && mine(i))
    .sort((a, b) => a.columnSince - b.columnSince);
  return { groups, blocked };
}

// End-of-fight tableau: 'victory' (boss dead), 'defeat' (sprint over, hp left).
export function deriveTableau(view) {
  if (view.stats.total > 0 && view.stats.remaining <= 0) return 'victory';
  if (view.now > view.sprint.end && view.stats.remaining > 0) return 'defeat';
  return null;
}
