// Generated sprint data for MOCK=1 — realistic enough to exercise every
// mechanic: aging colors, a Review jam, blocked tickets, scope creep,
// recent done events, and (by default) a forecast that misses the deadline.

import { CONFIG, applyWipDefaults } from '../shared/config.js';
import { deriveSnapshot, DAY, HOUR } from '../shared/derive.js';

const NAMES = ['Ana Petrescu', 'Mihai Ionescu', 'Ioana Radu', 'Tudor Vasile', 'Elena Dobre', 'Radu Stancu'];

const SCOPE_POOL = [
  'Customer-reported: export hangs on large workspaces',
  'Hotfix follow-up: add regression tests',
  'Urgent: rotate leaked staging credentials',
  'Sales ask: per-seat usage breakdown',
  'Support escalation: webhook retries duplicate events',
  'Add missing index on events table',
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMockSource({ scenario = 'doomed', evolve = true } = {}) {
  const t0 = Date.now();
  const start = t0 - 7 * DAY - 2 * HOUR;
  const end = t0 + 3 * DAY - 2 * HOUR;
  const rnd = mulberry32(1337);
  let seq = 123;

  const sprint = {
    id: 42, name: 'Sprint 42 · Ironclad', state: 'active',
    goal: 'Ship billing v2 + close the compliance gap',
    startDate: start, endDate: end,
  };

  const columns = applyWipDefaults([
    { name: 'To Do', statusNames: ['to do'] },
    { name: 'In Progress', statusNames: ['in progress'] },
    { name: 'In Review', statusNames: ['in review'] },
    { name: 'Done', statusNames: ['done'] },
  ]);

  const issues = [];
  const mk = ({ key, summary, pts, who, createdD, path = [], flags = [], reason = null, addedD = null }) => {
    const created = t0 - createdD * DAY;
    const transitions = [];
    let prev = 'To Do';
    for (const [d, to] of path) {
      transitions.push({ ts: t0 - d * DAY, from: prev, to, author: who });
      prev = to;
    }
    issues.push({
      key, summary, assignee: who, points: pts, created,
      assigneeAvatar: `https://i.pravatar.cc/48?u=${encodeURIComponent(who)}`,
      statusName: prev, transitions,
      flagHistory: flags.map(([d, f]) => ({ ts: t0 - d * DAY, flagged: f, author: who })),
      flagged: flags.length ? flags[flags.length - 1][1] : false,
      blockedReason: reason,
      sprintAddedAt: addedD != null ? t0 - addedD * DAY : null,
      url: `https://example.atlassian.net/browse/${key}`,
    });
  };

  // --- Done ---
  mk({ key: 'SB-101', summary: 'Rotate refresh tokens on session renew', pts: 3, who: NAMES[0], createdD: 9, path: [[6.5, 'In Progress'], [5.5, 'In Review'], [4.8, 'Done']] });
  mk({ key: 'SB-102', summary: 'Fix flaky pipeline cache step', pts: 5, who: NAMES[1], createdD: 9.5, path: [[6.8, 'In Progress'], [5.9, 'In Review'], [4.2, 'Done']] });
  mk({ key: 'SB-103', summary: 'Add audit log export (CSV)', pts: 2, who: NAMES[2], createdD: 8.5, path: [[6.0, 'In Progress'], [5.0, 'In Review'], [3.6, 'Done']] });
  mk({ key: 'SB-104', summary: 'Patch CVE in base image layer', pts: 3, who: NAMES[3], createdD: 8, path: [[4.0, 'In Progress'], [2.5, 'In Review'], [1.4, 'Done']] });
  mk({ key: 'SB-105', summary: 'Empty-state copy for reports page', pts: 1, who: NAMES[4], createdD: 8, path: [[2.0, 'In Progress'], [1.2, 'In Review'], [0.6, 'Done']] });

  // --- In Review (4 on belt + 1 blocked → 5/3 = jam) ---
  mk({ key: 'SB-106', summary: 'Migrate billing webhooks to v2 signatures', pts: 5, who: NAMES[5], createdD: 10, path: [[6.9, 'In Progress'], [4.6, 'In Review']] });
  mk({ key: 'SB-107', summary: 'Refactor notification fan-out worker', pts: 3, who: NAMES[0], createdD: 9, path: [[6.2, 'In Progress'], [3.9, 'In Review']] });
  mk({ key: 'SB-108', summary: 'Rate-limit the public search endpoint', pts: 2, who: NAMES[1], createdD: 8, path: [[5.0, 'In Progress'], [2.1, 'In Review']] });
  mk({ key: 'SB-109', summary: 'Dark-mode tokens for email templates', pts: 3, who: NAMES[2], createdD: 8, path: [[3.0, 'In Progress'], [0.4, 'In Review']] });
  mk({ key: 'SB-114', summary: 'GDPR data-residency matrix', pts: 3, who: NAMES[2], createdD: 9, path: [[5.5, 'In Progress'], [3.2, 'In Review']], flags: [[2.4, true]], reason: 'Legal sign-off pending' });

  // --- In Progress (3 on belt + 1 blocked = 4/4, full but not jammed) ---
  mk({ key: 'SB-110', summary: 'Bulk import: streaming CSV parser', pts: 5, who: NAMES[3], createdD: 8, path: [[5.2, 'In Progress']] });
  mk({ key: 'SB-111', summary: 'Session replay sampling config', pts: 3, who: NAMES[4], createdD: 8, path: [[1.6, 'In Progress']] });
  mk({ key: 'SB-120', summary: 'URGENT: enterprise SSO cert rotation', pts: 5, who: NAMES[0], createdD: 4.2, path: [[3.9, 'In Progress']], addedD: 4.2 });
  mk({ key: 'SB-113', summary: 'Payment provider sandbox flow', pts: 5, who: NAMES[1], createdD: 9, path: [[4.5, 'In Progress']], flags: [[3.1, true]], reason: 'Waiting on vendor API keys' });

  // --- To Do ---
  mk({ key: 'SB-112', summary: 'Fix timezone drift in scheduler', pts: null, who: NAMES[5], createdD: 8 });
  mk({ key: 'SB-115', summary: 'Self-serve workspace deletion', pts: 3, who: NAMES[3], createdD: 9 });
  mk({ key: 'SB-116', summary: 'Upgrade Node 20 → 22 across services', pts: 5, who: NAMES[4], createdD: 9 });
  mk({ key: 'SB-117', summary: 'Consolidate feature-flag SDKs', pts: 2, who: NAMES[5], createdD: 8.5 });
  mk({ key: 'SB-118', summary: 'Error budget dashboard tile', pts: null, who: NAMES[0], createdD: 8 });
  mk({ key: 'SB-119', summary: 'Archive stale workspaces job', pts: 8, who: NAMES[1], createdD: 9 });
  mk({ key: 'SB-121', summary: 'Customer-requested: API key scopes UI', pts: 3, who: NAMES[4], createdD: 1.8, addedD: 1.8 });
  mk({ key: 'SB-122', summary: 'Hotfix follow-up: cache invalidation tests', pts: 2, who: NAMES[3], createdD: 0.12, addedD: 0.12 });

  if (scenario === 'healthy') {
    // Land enough recent work that the rolling velocity clears the deadline.
    const finish = { 'SB-106': 1.9, 'SB-107': 1.4, 'SB-110': 1.0, 'SB-115': 0.7, 'SB-116': 0.4, 'SB-119': 0.2 };
    for (const it of issues) {
      const d = finish[it.key];
      if (d == null) continue;
      if (it.statusName === 'To Do') it.transitions.push({ ts: t0 - (d + 1.5) * DAY, from: 'To Do', to: 'In Progress', author: it.assignee });
      if (it.statusName !== 'In Review') it.transitions.push({ ts: t0 - (d + 0.5) * DAY, from: 'In Progress', to: 'In Review', author: it.assignee });
      it.transitions.push({ ts: t0 - d * DAY, from: 'In Review', to: 'Done', author: it.assignee });
      it.statusName = 'Done';
    }
  }

  // --- live-ish mutations so the ambient display has a pulse ---
  const byStatus = (s) => issues.filter((i) => i.statusName === s && !i.flagged);

  function completeOne() {
    const pick = byStatus('In Review')[0] || byStatus('In Progress')[0];
    if (!pick) return null;
    if (pick.statusName === 'In Progress') {
      pick.transitions.push({ ts: Date.now() - 1000, from: 'In Progress', to: 'In Review', author: pick.assignee });
    }
    pick.transitions.push({ ts: Date.now(), from: 'In Review', to: 'Done', author: pick.assignee });
    pick.statusName = 'Done';
    return pick.key;
  }

  function addScope() {
    const key = `SB-${++seq}`;
    const nowTs = Date.now();
    issues.push({
      key,
      summary: SCOPE_POOL[Math.floor(rnd() * SCOPE_POOL.length)],
      assignee: NAMES[Math.floor(rnd() * NAMES.length)],
      points: [2, 3, 5][Math.floor(rnd() * 3)],
      created: nowTs, statusName: 'To Do', transitions: [],
      flagHistory: [], flagged: false, blockedReason: null,
      sprintAddedAt: nowTs,
      url: `https://example.atlassian.net/browse/${key}`,
    });
    return key;
  }

  function moveOne() {
    const todo = byStatus('To Do')[0];
    if (todo) {
      todo.transitions.push({ ts: Date.now(), from: 'To Do', to: 'In Progress', author: todo.assignee });
      todo.statusName = 'In Progress';
      return todo.key;
    }
    return null;
  }

  function blockOne() {
    const pick = byStatus('In Progress')[0] || byStatus('In Review')[0];
    if (!pick) return null;
    pick.flagHistory.push({ ts: Date.now(), flagged: true, author: pick.assignee });
    pick.flagged = true;
    pick.blockedReason = 'Flagged during mock evolution';
    return pick.key;
  }

  function unblockOne() {
    const pick = issues.find((i) => i.flagged);
    if (!pick) return null;
    pick.flagHistory.push({ ts: Date.now(), flagged: false, author: pick.assignee });
    pick.flagged = false;
    return pick.key;
  }

  // ~one event every 4 polls — lively enough to demo, calm enough to
  // leave running on a TV all day without the mock sprint finishing itself.
  function tick() {
    if (!evolve) return;
    const r = rnd();
    if (r < 0.1) moveOne();
    else if (r < 0.17) completeOne();
    else if (r < 0.21) addScope();
    else if (r < 0.26) (rnd() < 0.5 ? blockOne : unblockOne)();
  }

  return {
    tick, completeOne, addScope, moveOne, blockOne, unblockOne,
    async getSnapshot() {
      return deriveSnapshot({ sprint, issues, columns, config: CONFIG, now: Date.now(), source: 'mock' });
    },
  };
}
