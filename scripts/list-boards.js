// Lists Jira boards visible to your credentials so you can pick JIRA_BOARD_ID.
// Usage: npm run boards [-- search-term]
import 'dotenv/config';

const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
if (!JIRA_BASE_URL || JIRA_BASE_URL.includes('YOUR-ORG') || !JIRA_API_TOKEN || JIRA_API_TOKEN.startsWith('PASTE')) {
  console.error('Fill in JIRA_BASE_URL and JIRA_API_TOKEN in .env first.');
  process.exit(1);
}

const base = JIRA_BASE_URL.replace(/\/+$/, '');
const auth = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const filter = process.argv[2] ? `&name=${encodeURIComponent(process.argv[2])}` : '';

const boards = [];
let startAt = 0;
for (;;) {
  const res = await fetch(`${base}/rest/agile/1.0/board?startAt=${startAt}&maxResults=50${filter}`, {
    headers: { Authorization: auth, Accept: 'application/json' },
  });
  if (!res.ok) {
    console.error(`Jira responded ${res.status} ${res.statusText} — check base URL / email / token.`);
    process.exit(1);
  }
  const page = await res.json();
  boards.push(...(page.values || []));
  startAt += page.values?.length || 0;
  if (page.isLast || !page.values?.length) break;
}

if (!boards.length) {
  console.log('No boards visible to this account' + (filter ? ' matching that search.' : '.'));
  process.exit(0);
}
console.log(`${boards.length} board(s):\n`);
for (const b of boards) {
  console.log(`  ${String(b.id).padStart(5)}  ${b.type.padEnd(7)}  ${b.name}${b.location?.projectName ? `  (${b.location.projectName})` : ''}`);
}
console.log('\nPut the id you want into JIRA_BOARD_ID in .env, then: npm run dev');
