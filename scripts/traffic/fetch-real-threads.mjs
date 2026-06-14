#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_QUERIES = [
  '"small business" automation invoice workflow is:issue',
  '"manual process" "small business" operations is:issue',
  '"billing" automation "small business" is:issue',
  '"lead" "manual" process automation is:issue'
];

const RELEVANCE_TERMS = [
  'small business',
  'smb',
  'invoice',
  'billing',
  'manual process',
  'workflow',
  'operations',
  'automation',
  'lead',
  'sales',
  'crm',
  'customer',
  'funnel',
  'campaign',
  'onboarding',
  'reconciliation'
];

const EXCLUDE_TERMS = [
  'bounty',
  'kernel',
  'firmware',
  'gpu',
  'pytorch',
  'sam3x8e',
  'marlin',
  'bus protocol loop',
  'coordination ssot'
];

const STOPWORDS = new Set([
  'about', 'after', 'again', 'against', 'algo', 'algun', 'alguna', 'algunas', 'algunos', 'antes', 'aqui', 'been', 'being',
  'because', 'below', 'between', 'como', 'con', 'could', 'donde', 'during', 'esta', 'este', 'esto', 'estos', 'from',
  'have', 'having', 'hasta', 'into', 'para', 'pero', 'sobre', 'that', 'their', 'there', 'these', 'they', 'this', 'those',
  'through', 'todo', 'todos', 'under', 'were', 'what', 'when', 'where', 'which', 'while', 'with', 'without', 'would',
  'your', 'ours', 'ourselves', 'theirs', 'themselves', 'them', 'then', 'than', 'very', 'more', 'most', 'just', 'been',
  'manual', 'process', 'issue', 'github', 'need', 'help', 'please', 'project', 'working', 'work', 'using'
  , 'jtbd', 'nbsp', 'want', 'problem', 'context', 'frequency', 'before', 'after'
]);

function parseArgs(argv) {
  const options = {
    outDir: 'ops/traffic/research',
    perQuery: 20,
    maxThreads: 25,
    minComments: 2,
    minBodyChars: 120,
    minThreads: 8,
    minRelevanceScore: 2,
    strict: false,
    queries: [...DEFAULT_QUERIES]
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (item === '--strict') {
      options.strict = true;
      continue;
    }

    if (!item.startsWith('--')) {
      continue;
    }

    const key = item.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith('--')) {
      continue;
    }

    if (key === 'outDir') {
      options.outDir = value;
      index += 1;
      continue;
    }

    if (key === 'perQuery') {
      options.perQuery = Number.parseInt(value, 10) || options.perQuery;
      index += 1;
      continue;
    }

    if (key === 'maxThreads') {
      options.maxThreads = Number.parseInt(value, 10) || options.maxThreads;
      index += 1;
      continue;
    }

    if (key === 'minComments') {
      options.minComments = Number.parseInt(value, 10) || options.minComments;
      index += 1;
      continue;
    }

    if (key === 'minBodyChars') {
      options.minBodyChars = Number.parseInt(value, 10) || options.minBodyChars;
      index += 1;
      continue;
    }

    if (key === 'minThreads') {
      options.minThreads = Number.parseInt(value, 10) || options.minThreads;
      index += 1;
      continue;
    }

    if (key === 'minRelevanceScore') {
      options.minRelevanceScore = Number.parseInt(value, 10) || options.minRelevanceScore;
      index += 1;
      continue;
    }

    if (key === 'queries') {
      options.queries = value
        .split('|')
        .map((entry) => entry.trim())
        .filter(Boolean);
      index += 1;
    }
  }

  return options;
}

function sanitizeSnippet(text, max = 260) {
  const normalized = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 3)}...`;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9áéíóúñ]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
}

function extractInsights(threads) {
  const keywordCounts = new Map();

  for (const thread of threads) {
    const tokens = tokenize(`${thread.title} ${thread.snippet}`);
    for (const token of tokens) {
      keywordCounts.set(token, (keywordCounts.get(token) || 0) + 1);
    }
  }

  const topKeywords = [...keywordCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([keyword, count]) => ({ keyword, count }));

  const painCandidates = threads
    .slice(0, 5)
    .map((thread) => sanitizeSnippet(thread.title || thread.snippet, 120))
    .filter(Boolean);

  return {
    topKeywords,
    topPainCandidates: painCandidates,
    totalComments: threads.reduce((sum, thread) => sum + Number(thread.comments || 0), 0)
  };
}

async function searchIssues(query, perQuery) {
  const normalizedQuery = `${query} -is:pull-request`;
  const url = new URL('https://api.github.com/search/issues');
  url.searchParams.set('q', normalizedQuery);
  url.searchParams.set('sort', 'comments');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(perQuery));

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'tiger-lab-thread-intel'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`GitHub search failed ${response.status}: ${body}`);
  }

  const parsed = JSON.parse(body);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function normalizeThread(item, query) {
  const repository = item.repository_url?.replace('https://api.github.com/repos/', '') || '';
  const text = `${item.title || ''} ${item.body || ''} ${repository}`.toLowerCase();
  const relevanceHits = RELEVANCE_TERMS.filter((term) => text.includes(term));
  const exclusionHits = EXCLUDE_TERMS.filter((term) => text.includes(term));

  return {
    id: item.id,
    title: item.title,
    url: item.html_url,
    apiUrl: item.url,
    repository,
    comments: item.comments || 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    sourceQuery: query,
    snippet: sanitizeSnippet(item.body || item.title || ''),
    relevanceScore: Math.max(0, relevanceHits.length - exclusionHits.length),
    relevanceHits,
    exclusionHits
  };
}

function filterThreads(threads, options) {
  return threads
    .filter((thread) => Number(thread.comments || 0) >= options.minComments)
    .filter((thread) => String(thread.snippet || '').length >= options.minBodyChars)
    .filter((thread) => Number(thread.relevanceScore || 0) >= options.minRelevanceScore)
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }
      if (right.comments === left.comments) {
        return String(right.updatedAt).localeCompare(String(left.updatedAt));
      }
      return right.comments - left.comments;
    })
    .slice(0, options.maxThreads);
}

function writeOutput(options, payload) {
  const outDir = path.resolve(options.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const day = new Date().toISOString().slice(0, 10);
  const datedPath = path.join(outDir, `real-threads-${day}.json`);
  const latestPath = path.join(outDir, 'real-threads-latest.json');

  fs.writeFileSync(datedPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(latestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return { datedPath, latestPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const aggregate = [];
  for (const query of options.queries) {
    const items = await searchIssues(query, options.perQuery);
    for (const item of items) {
      if (item.pull_request) {
        continue;
      }
      aggregate.push(normalizeThread(item, query));
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const thread of aggregate) {
    if (seen.has(thread.url)) {
      continue;
    }
    seen.add(thread.url);
    deduped.push(thread);
  }

  const selected = filterThreads(deduped, options);
  const insights = extractInsights(selected);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'github-search-issues',
    queries: options.queries,
    quality: {
      minComments: options.minComments,
      minBodyChars: options.minBodyChars,
      selectedThreads: selected.length
    },
    insights,
    threads: selected
  };

  const { datedPath, latestPath } = writeOutput(options, payload);

  process.stdout.write(`Fetched ${selected.length} real threads.\n`);
  process.stdout.write(`Latest: ${latestPath}\n`);
  process.stdout.write(`Dated: ${datedPath}\n`);

  if (options.strict && selected.length < options.minThreads) {
    throw new Error(
      `Thread intel failed strict gate: selected ${selected.length}, required ${options.minThreads}.`
    );
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
