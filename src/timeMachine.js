import { computeStats, DAY } from '../shared/derive.js';

// Reconstruct the snapshot as it looked at time t — powers retro mode.
// Works entirely from colHistory / flagHistory shipped with each issue.
export function stateAt(snap, t) {
  const doneIdx = snap.doneIdx;

  const issues = [];
  for (const i of snap.issues) {
    if (Math.min(i.addedAt, i.created) > t) continue; // not in the sprint yet
    const hist = i.colHistory.filter((h) => h.ts <= t);
    if (!hist.length) continue;
    const cur = hist[hist.length - 1];
    const lastFlag = (i.flagHistory || []).filter((f) => f.ts <= t).pop();
    const done = cur.col === doneIdx;
    issues.push({
      ...i,
      col: cur.col,
      colName: snap.columns[cur.col].name,
      columnSince: cur.ts,
      daysInColumn: (t - cur.ts) / DAY,
      done,
      doneAt: done ? cur.ts : null,
      blocked: !done && !!lastFlag?.flagged,
      addedMidSprint: i.addedMidSprint && i.addedAt <= t,
    });
  }

  const columns = snap.columns.map((c, idx) => {
    const inCol = issues.filter((it) => it.col === idx);
    return {
      ...c,
      count: inCol.length,
      points: inCol.reduce((s, it) => s + it.points, 0),
      jammed: c.wipLimit != null && inCol.length > c.wipLimit,
    };
  });

  const stats = computeStats(issues, {
    start: snap.sprint.start,
    end: snap.sprint.end,
    config: { velocityWindowDays: snap.velocityWindowDays || 3 },
    now: t,
  });

  return {
    ...snap,
    now: t,
    timeTravel: true,
    issues,
    columns,
    stats,
    events: snap.events.filter((e) => e.ts <= t),
  };
}
