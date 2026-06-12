// Jira Cloud client. Normalizes Agile-API data into the shape derive.js expects.

import { CONFIG, applyWipDefaults, FALLBACK_COLUMNS } from '../shared/config.js';
import { deriveSnapshot } from '../shared/derive.js';

export function createJiraSource(env) {
  const base = (env.JIRA_BASE_URL || '').replace(/\/+$/, '');
  const boardId = env.JIRA_BOARD_ID;

  if (!base || !env.JIRA_EMAIL || !env.JIRA_API_TOKEN || !boardId) {
    return {
      async getSnapshot() {
        throw new Error(
          'Missing Jira config — set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BOARD_ID in .env (or run with MOCK=1).'
        );
      },
    };
  }

  const auth = 'Basic ' + Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString('base64');

  async function get(path) {
    const res = await fetch(base + path, { headers: { Authorization: auth, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Jira ${res.status} ${res.statusText} on ${path}`);
    return res.json();
  }

  // Story points live in a per-instance custom field; "Flagged" is one too.
  let fieldIds = null;
  async function discoverFields() {
    if (fieldIds) return fieldIds;
    const fields = await get('/rest/api/3/field');
    const sp = fields.find((f) => /^story points?$/i.test(f.name) || /story point estimate/i.test(f.name));
    const fl = fields.find((f) => /^flagged$/i.test(f.name));
    fieldIds = { storyPoints: sp?.id || null, flagged: fl?.id || null };
    return fieldIds;
  }

  async function getColumns() {
    try {
      const [conf, statuses] = await Promise.all([
        get(`/rest/agile/1.0/board/${boardId}/configuration`),
        get('/rest/api/3/status'),
      ]);
      const nameById = new Map(statuses.map((s) => [s.id, s.name]));
      const cols = (conf.columnConfig?.columns || [])
        .map((c) => ({
          name: c.name,
          statusNames: c.statuses.map((s) => nameById.get(s.id)).filter(Boolean).map((n) => n.toLowerCase()),
          wipLimit: c.max ?? null,
        }))
        .filter((c) => c.statusNames.length);
      if (cols.length >= 2) return applyWipDefaults(cols);
    } catch (e) {
      console.warn('[sprint-boss] board configuration unavailable, using fallback columns:', e.message);
    }
    return applyWipDefaults(FALLBACK_COLUMNS.map((c) => ({ ...c })));
  }

  async function getSprint() {
    const active = await get(`/rest/agile/1.0/board/${boardId}/sprint?state=active`);
    if (active.values?.length) return { sprint: active.values[0], closedFallback: false };
    // Degrade: offer the most recent closed sprint (retro mode).
    const closed = await get(`/rest/agile/1.0/board/${boardId}/sprint?state=closed&maxResults=50`);
    const last = closed.values?.length ? closed.values[closed.values.length - 1] : null;
    return { sprint: last, closedFallback: !!last };
  }

  async function getIssues(sprintId, f) {
    const fieldList = ['summary', 'status', 'assignee', 'created', 'updated', 'labels', 'parent', 'issuetype', f.storyPoints, f.flagged]
      .filter(Boolean)
      .join(',');
    const all = [];
    let startAt = 0;
    for (;;) {
      const page = await get(
        `/rest/agile/1.0/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=50&expand=changelog&fields=${fieldList}`
      );
      all.push(...(page.issues || []));
      startAt += page.issues?.length || 0;
      if (!page.issues?.length || startAt >= page.total) break;
    }
    return all;
  }

  function normalize(issue, f, sprintId) {
    const fields = issue.fields || {};
    const histories = issue.changelog?.histories || [];

    const transitions = [];
    const flagHistory = [];
    let sprintAddedAt = null;
    for (const h of histories) {
      for (const item of h.items || []) {
        if (item.field === 'status') {
          transitions.push({ ts: h.created, from: item.fromString, to: item.toString, author: h.author?.displayName || null });
        } else if (item.field === 'Flagged') {
          flagHistory.push({ ts: h.created, flagged: !!item.toString, author: h.author?.displayName || null });
        } else if (item.field === 'Sprint') {
          const ids = String(item.to || '').split(/,\s*/);
          if (ids.includes(String(sprintId)) && !sprintAddedAt) sprintAddedAt = h.created;
        }
      }
    }

    const labels = fields.labels || [];
    const flaggedField = f.flagged ? fields[f.flagged] : null;
    const flagged =
      (Array.isArray(flaggedField) ? flaggedField.length > 0 : !!flaggedField) ||
      labels.some((l) => /^blocked$/i.test(l));

    return {
      key: issue.key,
      summary: fields.summary || issue.key,
      url: `${base}/browse/${issue.key}`,
      assignee: fields.assignee?.displayName || null,
      assigneeAvatar: fields.assignee?.avatarUrls?.['48x48'] || null,
      points: f.storyPoints && fields[f.storyPoints] != null ? Number(fields[f.storyPoints]) : null,
      created: fields.created,
      statusName: fields.status?.name || '',
      transitions,
      flagHistory,
      flagged,
      blockedReason: flagged ? (labels.find((l) => /^blocked/i.test(l)) || 'Flagged as impediment') : null,
      sprintAddedAt,
      parentKey: fields.parent?.key || null,
      parentName: fields.parent?.fields?.summary || null,
      issueType: fields.issuetype?.name || null,
      issueTypeIcon: fields.issuetype?.iconUrl
        ? `/api/icon?url=${encodeURIComponent(fields.issuetype.iconUrl)}`
        : null,
      isSubtask: fields.issuetype?.subtask === true,
      _hasChangelog: histories.length > 0 || !issue.changelog,
    };
  }

  return {
    async getSnapshot() {
      const [f, columns, { sprint, closedFallback }] = await Promise.all([
        discoverFields(),
        getColumns(),
        getSprint(),
      ]);
      if (!sprint) {
        return deriveSnapshot({ sprint: null, issues: [], columns, config: CONFIG, source: 'live' });
      }
      const rawIssues = await getIssues(sprint.id, f);
      const issues = rawIssues.map((i) => normalize(i, f, sprint.id));
      // If Jira returned no changelogs at all, age/cycle data would be wrong — flag it
      // so the client hides aging colors instead of lying (spec: degrade gracefully).
      const noChangelog = issues.length > 0 && issues.every((i) => !(i.transitions.length || i._hasChangelog));
      return deriveSnapshot({
        sprint, issues, columns, config: CONFIG, source: 'live',
        meta: { flags: { noChangelog, noEstimates: issues.every((i) => i.points == null) }, closedFallback },
      });
    },
  };
}
