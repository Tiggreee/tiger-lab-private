#!/usr/bin/env node

const baseUrl = new URL(process.env.PRODUCTION_DASHBOARD_URL || 'https://tiger-dashboard-production.up.railway.app');
const timeoutMs = Number(process.env.PRODUCTION_DASHBOARD_SMOKE_TIMEOUT_MS || 15000);
const invalidCampaignId = `smoke-${Date.now()}`;

function fail(step, details) {
  const error = new Error(`${step}: ${details}`);
  error.step = step;
  throw error;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal, headers: { 'cache-control': 'no-store', ...(options.headers || {}) } });
  } finally {
    clearTimeout(timer);
  }
}

async function readJsonResponse(url, options = {}) {
  const response = await fetchWithTimeout(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { response, text, json };
}

const checks = [];

async function runCheck(name, fn) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    checks.push({ name, status: 'PASS', elapsedMs: Date.now() - startedAt, ...result });
  } catch (error) {
    checks.push({
      name,
      status: 'FAIL',
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

await runCheck('dashboard-home', async () => {
  const { response, text } = await readJsonResponse(new URL('/command-center/index.html', baseUrl));
  if (!response.ok) fail('dashboard-home', `expected 200, got ${response.status}`);
  if (!text.includes('Tiger Command Center')) fail('dashboard-home', 'missing Tiger Command Center title');
  return { url: '/command-center/index.html', statusCode: response.status };
});

await runCheck('dashboard-ui-version', async () => {
  const { response, text } = await readJsonResponse(new URL('/command-center/app.js', baseUrl));
  if (!response.ok) fail('dashboard-ui-version', `expected 200, got ${response.status}`);
  if (!text.includes('Read-only operations console')) {
    fail('dashboard-ui-version', 'deployed app.js is stale (missing read-only console marker); dashboard service did not pick up the latest build');
  }
  return { url: '/command-center/app.js', statusCode: response.status };
});

await runCheck('dashboard-telemetry', async () => {
  const { response, json } = await readJsonResponse(new URL('/runtime/telemetry', baseUrl));
  if (!response.ok) fail('dashboard-telemetry', `expected 200, got ${response.status}`);
  if (!json || typeof json !== 'object') fail('dashboard-telemetry', 'response was not valid JSON');
  if (typeof json.checkedAt !== 'string') fail('dashboard-telemetry', 'missing checkedAt');
  if (typeof json.mode !== 'string') fail('dashboard-telemetry', 'missing mode');
  if (typeof json.agentsTotal !== 'number') fail('dashboard-telemetry', 'missing agentsTotal');
  return { url: '/runtime/telemetry', statusCode: response.status, mode: json.mode, agentsTotal: json.agentsTotal };
});

await runCheck('campaign-index', async () => {
  const { response, json } = await readJsonResponse(new URL('/runtime/campaigns/index.json', baseUrl));
  if (!response.ok) fail('campaign-index', `expected 200, got ${response.status}`);
  if (!json || !Array.isArray(json.campaigns)) fail('campaign-index', 'missing campaigns array');
  if (json.campaigns.length === 0) fail('campaign-index', 'campaigns array is empty');
  return { url: '/runtime/campaigns/index.json', statusCode: response.status, campaigns: json.campaigns.length };
});

for (const endpoint of ['/runtime/campaigns/approve', '/runtime/campaigns/reject']) {
  await runCheck(endpoint, async () => {
    const { response, json, text } = await readJsonResponse(new URL(endpoint, baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: invalidCampaignId, reason: 'smoke' })
    });
    if (response.status !== 404) fail(endpoint, `expected 404 for invalid campaign id, got ${response.status}`);
    const errorText = typeof json?.error === 'string' ? json.error : text;
    if (!String(errorText).toLowerCase().includes('campaign not found')) {
      fail(endpoint, 'missing campaign-not-found error');
    }
    return { url: endpoint, statusCode: response.status, invalidCampaignId };
  });
}

const failed = checks.filter((check) => check.status === 'FAIL');
const summary = {
  baseUrl: baseUrl.toString(),
  checkedAt: new Date().toISOString(),
  invalidCampaignId,
  passCount: checks.length - failed.length,
  failCount: failed.length,
  checks
};

console.log(JSON.stringify(summary, null, 2));

if (failed.length > 0) {
  process.exitCode = 1;
}