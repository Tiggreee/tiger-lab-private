#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_REPO = process.env.GITHUB_REPOSITORY || 'Tigre-Labs/tiger-lab-private';
const ACTIONS_CAP_50 = 25000;
const STARTUP_BUDGET_CAP_50 = 4982.40;

function parseArgs(argv) {
  const options = {
    repo: DEFAULT_REPO,
    outDir: 'ops/runtime',
    maxPages: 8
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }

    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      continue;
    }

    if (key === 'repo') {
      options.repo = value;
      index += 1;
      continue;
    }

    if (key === 'outDir') {
      options.outDir = value;
      index += 1;
      continue;
    }

    if (key === 'maxPages') {
      options.maxPages = Number.parseInt(value, 10) || options.maxPages;
      index += 1;
    }
  }

  return options;
}

function getMonthRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = now;
  return { start, end };
}

function minutesBetween(start, end) {
  const ms = Math.max(0, end.getTime() - start.getTime());
  return ms / 60000;
}

async function fetchRuns(repo, start, end, maxPages) {
  const [owner, name] = repo.split('/');
  if (!owner || !name) {
    throw new Error(`Invalid repo format: ${repo}. Expected owner/name.`);
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'tiger-lab-resource-audit'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const runs = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(`https://api.github.com/repos/${owner}/${name}/actions/runs`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('created', `${start.toISOString()}..${end.toISOString()}`);

    const response = await fetch(url, { headers });
    const body = await response.text();
    if (!response.ok) {
      return {
        runs,
        accessError: `Failed to fetch workflow runs ${response.status}: ${body}`
      };
    }

    const parsed = JSON.parse(body);
    const pageRuns = Array.isArray(parsed.workflow_runs) ? parsed.workflow_runs : [];
    runs.push(...pageRuns);

    if (pageRuns.length < 100) {
      break;
    }
  }

  return {
    runs,
    accessError: null
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# GitHub Resource Audit');
  lines.push('');
  lines.push(`- generatedAt: ${report.generatedAt}`);
  lines.push(`- repo: ${report.repo}`);
  lines.push(`- periodStart: ${report.period.start}`);
  lines.push(`- periodEnd: ${report.period.end}`);
  lines.push(`- actionsMinutesRepoEstimate: ${report.actions.minutesRepoEstimate.toFixed(2)}`);
  lines.push(`- actionsCap50: ${report.actions.cap50}`);
  lines.push(`- actionsUsagePctOfCap: ${report.actions.usagePctOfCap.toFixed(2)}%`);
  lines.push(`- actionsStatus: ${report.actions.status}`);
  lines.push(`- startupBudgetCap50USD: ${report.startupCredits.cap50USD.toFixed(2)}`);
  lines.push(`- startupCreditsKnown: ${report.startupCredits.known ? 'yes' : 'no'}`);
  lines.push(`- aiUsagePolicyStatus: ${report.aiPolicy.status}`);
  lines.push(`- aiUsagePolicyDetail: ${report.aiPolicy.detail}`);
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }
  lines.push('');
  lines.push('## Top Workflows (minutes estimate)');
  lines.push('');
  for (const item of report.actions.byWorkflow.slice(0, 10)) {
    lines.push(`- ${item.workflow}: ${item.minutes.toFixed(2)} min`);
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { start, end } = getMonthRange();

  const { runs, accessError } = await fetchRuns(options.repo, start, end, options.maxPages);

  const byWorkflow = new Map();
  let minutes = 0;
  for (const run of runs) {
    if (!run.run_started_at || !run.updated_at) {
      continue;
    }

    const runMinutes = minutesBetween(new Date(run.run_started_at), new Date(run.updated_at));
    minutes += runMinutes;

    const name = run.name || run.path || 'unknown';
    byWorkflow.set(name, (byWorkflow.get(name) || 0) + runMinutes);
  }

  const byWorkflowList = [...byWorkflow.entries()]
    .map(([workflow, value]) => ({ workflow, minutes: value }))
    .sort((left, right) => right.minutes - left.minutes);

  const usagePct = ACTIONS_CAP_50 > 0 ? (minutes / ACTIONS_CAP_50) * 100 : 0;
  const todayUtcDate = new Date().getUTCDate();

  const actionsStatus = accessError
    ? 'UNKNOWN'
    : usagePct <= 50
      ? 'PASS'
      : usagePct <= 90
        ? 'WARN'
        : 'FAIL';

  const report = {
    generatedAt: new Date().toISOString(),
    repo: options.repo,
    period: {
      start: start.toISOString(),
      end: end.toISOString()
    },
    actions: {
      cap50: ACTIONS_CAP_50,
      minutesRepoEstimate: minutes,
      usagePctOfCap: usagePct,
      status: actionsStatus,
      accessError,
      byWorkflow: byWorkflowList
    },
    startupCredits: {
      cap50USD: STARTUP_BUDGET_CAP_50,
      known: false,
      availableUSD: null,
      status: 'UNKNOWN'
    },
    aiPolicy: {
      status: todayUtcDate > 5 ? 'ENFORCE_ZERO_AI' : 'WITHIN_ALLOWED_WINDOW',
      detail: todayUtcDate > 5
        ? 'Day > 5 UTC: AI usage must remain zero according to repo policy.'
        : 'Day <= 5 UTC: AI usage window still open by policy.'
    },
    notes: [
      'Actions minutes are estimated from run_started_at and updated_at for this repository only.',
      'GitHub for Startups remaining credits are not exposed by standard repository APIs; value stays UNKNOWN unless a billing source is integrated.',
      'Use this report as a guardrail signal, not as a legal/billing statement.'
    ]
  };

  if (accessError) {
    report.notes.push('Actions API access unavailable in current context; report produced with UNKNOWN action status.');
  }

  const outDir = path.resolve(options.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'github-resource-audit.json');
  const mdPath = path.join(outDir, 'github-resource-audit.md');

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, toMarkdown(report), 'utf8');

  process.stdout.write(`Resource audit generated: ${jsonPath}\n`);
  process.stdout.write(`Summary markdown: ${mdPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
