#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const generatorScript = path.resolve(currentDir, 'generate-social-pack.mjs');

function parseArgs(argv) {
  const options = {
    threadsPath: 'ops/traffic/research/real-threads-latest.json',
    campaign: `daily-${new Date().toISOString().slice(0, 10)}`,
    baseLink: process.env.SOCIAL_BASE_LINK || 'https://cal.com/victor-tigerlab/diagnostic',
    closeChannel: process.env.SOCIAL_CLOSE_CHANNEL || 'calendar',
    closeDestination: process.env.SOCIAL_CLOSE_DESTINATION || 'https://cal.com/victor-tigerlab/diagnostic',
    audience: 'founders, operadores y dev leads SMB',
    offer: 'Diagnostico de 15 min con plan de activacion en 24h',
    productName: process.env.SOCIAL_PRODUCT_NAME || 'Tiger Lab',
    outDir: 'ops/traffic/outbox',
    minThreads: 5
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

    if (key in options) {
      options[key] = value;
      index += 1;
    }
  }

  options.minThreads = Number.parseInt(String(options.minThreads), 10) || 5;
  return options;
}

function safeCampaign(campaign) {
  return String(campaign)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadThreadIntel(threadsPath) {
  const full = path.resolve(threadsPath);
  if (!fs.existsSync(full)) {
    throw new Error(`Thread intel file not found: ${full}`);
  }

  const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
  const threads = Array.isArray(parsed.threads) ? parsed.threads : [];
  return {
    fullPath: full,
    generatedAt: parsed.generatedAt,
    insights: parsed.insights || {},
    threads
  };
}

function deriveKeywordList(insights) {
  const entries = Array.isArray(insights?.topKeywords) ? insights.topKeywords : [];
  return entries.slice(0, 8).map((entry) => String(entry.keyword || '').trim()).filter(Boolean);
}

function deriveProblemDetail(threads, keywords) {
  const first = threads[0]?.title || '';
  const second = threads[1]?.title || '';
  const keywordPart = keywords.slice(0, 3).join(', ');
  return `friccion reportada en hilos reales sobre ${keywordPart || 'operaciones manuales'}; ejemplos: "${first}"${second ? ` y "${second}"` : ''}`;
}

function derivePrimaryOutcome(keywords) {
  if (keywords.length === 0) {
    return 'flujo operativo mas confiable con menos trabajo manual';
  }

  return `mejorar ${keywords.slice(0, 2).join(' y ')} con automatizacion medible`;
}

function deriveProofPoint(threads, insights) {
  const comments = Number(insights?.totalComments || 0);
  const top = threads[0];
  const topSnippet = top ? `${top.title} (${top.comments} comentarios)` : 'sin referencia principal';
  return `${threads.length} hilos reales de GitHub analizados, ${comments} comentarios acumulados. Referencia top: ${topSnippet}.`;
}

function buildEvidenceMarkdown(campaign, intel, selectedThreads) {
  const normalizedSourceFile = path.relative(process.cwd(), intel.fullPath).split(path.sep).join('/');
  const lines = [];
  lines.push(`# Campaign Evidence - ${campaign}`);
  lines.push('');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push(`Thread source generated at: ${intel.generatedAt || '-'}`);
  lines.push(`Thread source file: ${normalizedSourceFile}`);
  lines.push('');
  lines.push('## Real Threads Used');
  lines.push('');

  for (const thread of selectedThreads) {
    lines.push(`- [${thread.title}](${thread.url})`);
    lines.push(`  repo: ${thread.repository || '-'} | comments: ${thread.comments || 0} | updated: ${thread.updatedAt || '-'}`);
    lines.push(`  snippet: ${thread.snippet || '-'}`);
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const intel = loadThreadIntel(options.threadsPath);

  if (intel.threads.length < options.minThreads) {
    throw new Error(
      `Thread-backed pack blocked: only ${intel.threads.length} usable threads, requires ${options.minThreads}.`
    );
  }

  const selectedThreads = intel.threads.slice(0, 6);
  const keywords = deriveKeywordList(intel.insights);

  const args = [
    generatorScript,
    '--topic', `Automatizacion con evidencia real de fricciones SMB: ${keywords.slice(0, 3).join(', ') || 'operaciones manuales'}`,
    '--audience', options.audience,
    '--offer', options.offer,
    '--campaign', options.campaign,
    '--baseLink', options.baseLink,
    '--closeChannel', options.closeChannel,
    '--closeDestination', options.closeDestination,
    '--productName', options.productName,
    '--problemDetail', deriveProblemDetail(selectedThreads, keywords),
    '--primaryOutcome', derivePrimaryOutcome(keywords),
    '--proofPoint', deriveProofPoint(selectedThreads, intel.insights),
    '--domainTerms', keywords.join(','),
    '--outDir', options.outDir
  ];

  const generation = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env
  });

  if (generation.status !== 0) {
    throw new Error(`generate-social-pack failed with status ${generation.status ?? 1}`);
  }

  const campaignId = safeCampaign(options.campaign);
  const outDir = path.resolve(options.outDir);
  const packPath = path.join(outDir, `social-pack-${campaignId}.json`);
  const evidencePath = path.join(outDir, `social-pack-${campaignId}-evidence.md`);

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const normalizedSourceFile = path.relative(process.cwd(), intel.fullPath).split(path.sep).join('/');
  pack.evidence = {
    source: 'github-threads',
    sourceFile: normalizedSourceFile,
    generatedAt: new Date().toISOString(),
    threadCount: selectedThreads.length,
    threads: selectedThreads.map((thread) => ({
      title: thread.title,
      url: thread.url,
      repository: thread.repository,
      comments: thread.comments,
      updatedAt: thread.updatedAt
    }))
  };

  fs.writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  fs.writeFileSync(evidencePath, buildEvidenceMarkdown(options.campaign, intel, selectedThreads), 'utf8');

  process.stdout.write(`Thread-backed campaign generated: ${packPath}\n`);
  process.stdout.write(`Evidence report: ${evidencePath}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
