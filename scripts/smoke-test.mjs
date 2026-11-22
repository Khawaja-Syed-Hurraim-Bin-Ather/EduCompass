/**
 * smoke-test.mjs — Integration Smoke Tests
 *
 * Verifies all major API routes and the main static SPA frontend on localhost.
 * Run: node scripts/smoke-test.mjs
 */

const API = 'http://localhost:4000';
const WEB = 'http://localhost:5173';
const WEB_MIRROR = 'http://localhost:3000';
const TIMEOUT_MS = 8000;

const TESTS = [
  // ── API Health ──────────────────────────────────────────────────────────
  { label: 'API /health', url: `${API}/health`, expectStatus: 200 },
  { label: 'API /api/v1/health', url: `${API}/api/v1/health`, expectStatus: 200 },

  // ── FYP routes ──────────────────────────────────────────────────────────
  { label: 'API GET /api/v1/fyp (list)', url: `${API}/api/v1/fyp?pageSize=5`, expectStatus: 200 },
  { label: 'API GET /api/v1/fyp/team-ideas', url: `${API}/api/v1/fyp/team-ideas`, expectStatus: 200 },

  // ── Careers ──────────────────────────────────────────────────────────────
  { label: 'API GET /api/v1/careers', url: `${API}/api/v1/careers`, expectStatus: 200 },

  // ── Prereq ───────────────────────────────────────────────────────────────
  { label: 'API GET /api/v1/prereq/graph', url: `${API}/api/v1/prereq/graph`, expectStatus: 200 },

  // ── Professors ───────────────────────────────────────────────────────────
  { label: 'API GET /api/v1/professors', url: `${API}/api/v1/professors`, expectStatus: 200 },

  // ── Planner ──────────────────────────────────────────────────────────────
  { label: 'API GET /api/v1/planner/template', url: `${API}/api/v1/planner/template`, expectStatus: 200 },

  // ── Auth-protected route (should 401 without token) ────────────────────
  { label: 'API GET /api/v1/account/profile (must 401)', url: `${API}/api/v1/account/profile`, expectStatus: 401 },
  { label: 'API GET /api/v1/admin/queue (must 401)', url: `${API}/api/v1/admin/queue`, expectStatus: 401 },

  // ── Security: unknown routes return 404 ────────────────────────────────
  { label: 'API 404 on /api/v1/unknown', url: `${API}/api/v1/unknown-route`, expectStatus: 404 },

  // ── Main Frontend (Static Demo SPA on 5173) ─────────────────────────────
  { label: 'FRONTEND / (landing page on 5173)', url: `${WEB}/`, expectStatus: 200 },
  { label: 'FRONTEND /styles.css', url: `${WEB}/styles.css`, expectStatus: 200 },
  { label: 'FRONTEND /app.js', url: `${WEB}/app.js`, expectStatus: 200 },
  { label: 'FRONTEND /data.js', url: `${WEB}/data.js`, expectStatus: 200 },
  { label: 'FRONTEND /engines.js', url: `${WEB}/engines.js`, expectStatus: 200 },
  { label: 'FRONTEND /data/career_tracks.json', url: `${WEB}/data/career_tracks.json`, expectStatus: 200 },
  { label: 'FRONTEND /data/ned_cse_course_catalog.json', url: `${WEB}/data/ned_cse_course_catalog.json`, expectStatus: 200 },
  { label: 'FRONTEND Mirror / (landing page on 3000)', url: `${WEB_MIRROR}/`, expectStatus: 200 },
];

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res.status;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') return null; // timeout
    return null; // connection refused / not started
  }
}

async function main() {
  console.log('\n🔍  EduCompass Smoke Tests\n' + '─'.repeat(60));
  console.log(`  API:            ${API}`);
  console.log(`  MAIN FRONTEND:  ${WEB}`);
  console.log(`  FRONTEND MIRROR:${WEB_MIRROR}\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const test of TESTS) {
    const status = await fetchWithTimeout(test.url, TIMEOUT_MS);
    const ok = status === test.expectStatus;

    if (ok) {
      passed++;
      console.log(`  ✅  ${test.label.padEnd(50)} [${status}]`);
    } else {
      failed++;
      const got = status === null ? 'TIMEOUT/UNREACHABLE' : status;
      console.log(`  ❌  ${test.label.padEnd(50)} [got: ${got}, want: ${test.expectStatus}]`);
      failures.push({ label: test.label, got, want: test.expectStatus });
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`  Total: ${TESTS.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);

  if (failures.length > 0) {
    console.log('\n  Failed tests:');
    for (const f of failures) {
      console.log(`    - ${f.label}: got ${f.got}, expected ${f.want}`);
    }
    process.exit(1);
  } else {
    console.log('\n  🎉 All smoke tests passed! EduCompass is fully operational.\n');
  }
}

main().catch(err => {
  console.error('Fatal error running smoke tests:', err);
  process.exit(1);
});
