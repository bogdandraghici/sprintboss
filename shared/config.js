// Tuning knobs for Sprint Boss. Everything visual derives from these numbers.
export const CONFIG = {
  // How often the server re-pulls Jira and the client re-pulls the server.
  pollMs: 60_000,

  // Aging WIP thresholds (days in current column).
  // <= freshDays: teal · <= warmDays: amber · beyond: red.
  aging: { freshDays: 1, warmDays: 3 },

  // WIP limits by column name. Jira board "max" constraints win when present.
  // null = no limit. Columns not listed get fallbackWip unless first/last.
  wipLimits: {
    'To Do': null,
    'In Progress': 4,
    'In Review': 3,
  },
  fallbackWip: 4,

  // Issues without a story-point estimate count as this many points
  // and are rendered with an "unestimated" treatment.
  unestimatedPoints: 1,

  // Rolling window (days) for the velocity forecast that drives enrage.
  velocityWindowDays: 3,
};

// Fill in WIP limits for columns that have none configured anywhere.
// First (intake) and last (done) columns never get a default limit.
export function applyWipDefaults(columns) {
  return columns.map((c, i) => ({
    ...c,
    wipLimit:
      c.wipLimit ??
      CONFIG.wipLimits[c.name] ??
      (i === 0 || i === columns.length - 1 ? null : CONFIG.fallbackWip),
  }));
}

export const FALLBACK_COLUMNS = [
  { name: 'To Do', statusNames: ['to do', 'open', 'backlog', 'selected for development'] },
  { name: 'In Progress', statusNames: ['in progress'] },
  { name: 'In Review', statusNames: ['in review', 'review', 'code review', 'qa', 'testing'] },
  { name: 'Done', statusNames: ['done', 'closed', 'resolved'] },
];
