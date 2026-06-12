// Turns normalized issue data into the snapshot the UI renders.
// Shared by the server (mock + live Jira) and the client (retro time travel).

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

const ts = (v) => (typeof v === 'number' ? v : +new Date(v));

/**
 * @param sprint  {id, name, goal?, state, startDate, endDate}
 * @param issues  normalized: {key, summary, url, assignee, points|null, created,
 *                statusName, transitions:[{ts, from, to, author}],
 *                flagHistory:[{ts, flagged, author}], flagged, blockedReason,
 *                sprintAddedAt|null}
 * @param columns [{name, statusNames:[lowercase], wipLimit}] — last column is Done
 */
export function deriveSnapshot({ sprint, issues, columns, config, now = Date.now(), source = 'live', meta = {} }) {
  if (!sprint) {
    return { source, now, pollMs: config.pollMs, sprint: null, ...meta };
  }

  const start = ts(sprint.startDate);
  const end = ts(sprint.endDate);
  const doneIdx = columns.length - 1;

  const statusToCol = new Map();
  columns.forEach((c, i) => c.statusNames.forEach((s) => statusToCol.set(s.toLowerCase(), i)));
  const colOf = (name) => statusToCol.get(String(name || '').toLowerCase()) ?? 0;

  // Some boards model blockage as a column ("Blocked", "On Hold") rather than
  // the Flagged field. Treat those columns as blocked zones: their issues
  // belong in the maintenance bay, not on the belt.
  const blockedZone = columns.map((c, i) => i !== doneIdx && /block|on hold/i.test(c.name));

  const events = [];
  const dwell = columns.map(() => ({ totalMs: 0, visits: 0 }));

  const outIssues = issues.map((raw) => {
    const created = ts(raw.created);
    const trans = (raw.transitions || [])
      .map((t) => ({ ...t, ts: ts(t.ts) }))
      .sort((a, b) => a.ts - b.ts);

    // Column history: where the issue sat, from creation to now.
    const firstCol = trans.length ? colOf(trans[0].from) : colOf(raw.statusName);
    const colHistory = [{ ts: created, col: firstCol, author: null }];
    for (const t of trans) {
      const col = colOf(t.to);
      if (col !== colHistory[colHistory.length - 1].col) {
        colHistory.push({ ts: t.ts, col, author: t.author || null });
      }
    }
    const cur = colHistory[colHistory.length - 1];
    const done = cur.col === doneIdx;

    const points = raw.points ?? config.unestimatedPoints;
    const estimated = raw.points != null;
    const addedAt = raw.sprintAddedAt ? ts(raw.sprintAddedAt) : created;
    const addedMidSprint = addedAt > start + HOUR; // 1h grace for sprint-start shuffling

    for (let i = 1; i < colHistory.length; i++) {
      const prev = colHistory[i - 1];
      const h = colHistory[i];
      const type =
        h.col === doneIdx ? 'done'
        : prev.col === doneIdx ? 'reopened'
        : blockedZone[h.col] ? 'blocked'
        : blockedZone[prev.col] ? 'unblocked'
        : 'moved';
      events.push({
        type, ts: h.ts, key: raw.key, points,
        actor: h.author, from: columns[prev.col].name, to: columns[h.col].name,
      });
    }

    const flagHistory = (raw.flagHistory || [])
      .map((f) => ({ ...f, ts: ts(f.ts) }))
      .sort((a, b) => a.ts - b.ts);
    for (const f of flagHistory) {
      events.push({ type: f.flagged ? 'blocked' : 'unblocked', ts: f.ts, key: raw.key, points, actor: f.author || null });
    }
    const inBlockedZone = blockedZone[cur.col];
    const blocked =
      !done && (inBlockedZone || (flagHistory.length ? flagHistory[flagHistory.length - 1].flagged : !!raw.flagged));

    if (addedMidSprint) {
      events.push({ type: 'scope-added', ts: addedAt, key: raw.key, points, actor: raw.assignee || null });
    }

    for (let i = 0; i < colHistory.length; i++) {
      const leave = i + 1 < colHistory.length ? colHistory[i + 1].ts : now;
      const c = colHistory[i].col;
      if (c !== doneIdx) {
        dwell[c].totalMs += Math.max(0, leave - colHistory[i].ts);
        dwell[c].visits += 1;
      }
    }

    const started = colHistory.find((h) => h.col > 0 && h.col !== doneIdx) || (firstCol > 0 ? colHistory[0] : null);
    const cycleDays = started ? Math.max(0, ((done ? cur.ts : now) - started.ts) / DAY) : 0;

    return {
      key: raw.key, summary: raw.summary, url: raw.url,
      assignee: raw.assignee || null,
      assigneeAvatar: raw.assigneeAvatar || null,
      points, estimated,
      col: cur.col, colName: columns[cur.col].name,
      columnSince: cur.ts, daysInColumn: (now - cur.ts) / DAY,
      cycleDays,
      blocked,
      blockedReason: blocked ? raw.blockedReason || (inBlockedZone ? `In "${columns[cur.col].name}" column` : null) : null,
      created, addedAt, addedMidSprint,
      done, doneAt: done ? cur.ts : null,
      parentKey: raw.parentKey ?? null,
      parentName: raw.parentName ?? null,
      issueType: raw.issueType ?? null,
      issueTypeIcon: raw.issueTypeIcon ?? null,
      isSubtask: raw.isSubtask ?? false,
      colHistory, flagHistory,
    };
  });

  events.sort((a, b) => a.ts - b.ts);

  const stats = computeStats(outIssues, { start, end, config, now });

  const colsOut = columns.map((c, i) => {
    const inCol = outIssues.filter((it) => it.col === i);
    const d = dwell[i];
    return {
      name: c.name,
      wipLimit: c.wipLimit ?? null,
      isBlockedZone: blockedZone[i],
      count: inCol.length,
      points: inCol.reduce((s, it) => s + it.points, 0),
      avgDwellDays: d.visits ? d.totalMs / d.visits / DAY : null,
      jammed: c.wipLimit != null && inCol.length > c.wipLimit,
    };
  });

  return {
    source, now, pollMs: config.pollMs,
    aging: config.aging,
    velocityWindowDays: config.velocityWindowDays,
    flags: meta.flags || {},
    closedFallback: meta.closedFallback || false,
    sprint: { id: sprint.id, name: sprint.name, goal: sprint.goal || null, state: sprint.state, start, end },
    doneIdx,
    columns: colsOut,
    issues: outIssues,
    stats,
    events,
  };
}

// Sprint-level numbers. Also used client-side by retro time travel.
export function computeStats(issues, { start, end, config, now }) {
  const total = issues.reduce((s, i) => s + i.points, 0);
  const doneIssues = issues.filter((i) => i.done);
  const completed = doneIssues.reduce((s, i) => s + i.points, 0);
  const remaining = total - completed;

  const elapsedDays = Math.max(0.25, (now - start) / DAY);
  const throughput = doneIssues.length / elapsedDays;

  const winDays = config.velocityWindowDays;
  const recentPts = doneIssues
    .filter((i) => i.doneAt >= now - winDays * DAY)
    .reduce((s, i) => s + i.points, 0);
  const velocity = recentPts / winDays;

  const daysLeft = (end - now) / DAY;
  const daysNeeded = remaining <= 0 ? 0 : velocity > 0 ? remaining / velocity : Infinity;
  const willFinish = remaining <= 0 || daysNeeded <= daysLeft;
  const projectedFinish = remaining > 0 && Number.isFinite(daysNeeded) ? now + daysNeeded * DAY : null;

  return {
    total, completed, remaining,
    throughput, velocity,
    daysLeft, daysNeeded, willFinish,
    enraged: !willFinish,
    projectedFinish,
    scopeAddedPts: issues.filter((i) => i.addedMidSprint).reduce((s, i) => s + i.points, 0),
    elapsedDays,
    anyEstimated: issues.some((i) => i.estimated),
  };
}
