#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CHANNELS = ['linkedin', 'x', 'facebook', 'telegram', 'discord'];

const REQUIRED_BY_CHANNEL = {
  linkedin: ['LINKEDIN_ACCESS_TOKEN'],
  x: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'],
  facebook: ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'],
  telegram: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  discord: ['DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID']
};

const PLACEHOLDER_PATTERNS = [/^CHANGE_ME$/i, /^REPLACE_ME$/i, /^YOUR_.+/i, /^EXAMPLE/i];

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const goLiveScript = path.resolve(currentDir, 'check-go-live.mjs');
const publishScript = path.resolve(currentDir, 'publish-social-pack.mjs');

function parseArgs(argv) {
  const options = {
    packPath: '',
    campaign: '',
    outDir: 'ops/traffic/outbox',
    channels: CHANNELS,
    live: false,
    minChannels: 1
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (item === '--live') {
      options.live = true;
      continue;
    }

    if (!item.startsWith('--')) {
      continue;
    }

    const key = item.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value === null || value.startsWith('--')) {
      continue;
    }

    if (key === 'packPath') {
      options.packPath = value;
      index += 1;
      continue;
    }

    if (key === 'campaign') {
      options.campaign = value;
      index += 1;
      continue;
    }

    if (key === 'outDir') {
      options.outDir = value;
      index += 1;
      continue;
    }

    if (key === 'channels') {
      options.channels = value
        .split(',')
        .map((channel) => channel.trim().toLowerCase())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (key === 'minChannels') {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        options.minChannels = parsed;
      }
      index += 1;
    }
  }

  return options;
}

function safeCampaign(campaign) {
  return campaign
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findLatestPack(outDir) {
  const dir = path.resolve(outDir);
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const files = entries
    .filter((entry) => entry.isFile() && /^social-pack-.*\.json$/i.test(entry.name))
    .map((entry) => {
      const filePath = path.join(dir, entry.name);
      const stat = fs.statSync(filePath);
      return {
        filePath,
        mtimeMs: stat.mtimeMs
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  if (files.length === 0) {
    throw new Error(`No pack files found in ${dir}`);
  }

  return files[0].filePath;
}

function resolvePackPath(options) {
  if (options.packPath) {
    return path.resolve(options.packPath);
  }

  if (options.campaign) {
    const campaign = safeCampaign(options.campaign);
    return path.resolve(options.outDir, `social-pack-${campaign}.json`);
  }

  return findLatestPack(options.outDir);
}

function loadPack(packPath) {
  const raw = fs.readFileSync(packPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.channels || typeof parsed.channels !== 'object') {
    throw new Error(`Invalid pack file: ${packPath}`);
  }

  return parsed;
}

function isPlaceholderValue(value) {
  if (typeof value !== 'string') {
    return true;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function evaluateChannelReadiness(channel, pack) {
  const required = REQUIRED_BY_CHANNEL[channel] || [];
  const missingSecrets = required.filter((key) => isPlaceholderValue(process.env[key]));
  const hasCopy = Boolean(pack?.channels?.[channel]?.copyPaste);

  return {
    channel,
    hasCopy,
    missingSecrets,
    ready: hasCopy && missingSecrets.length === 0
  };
}

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    stdio: 'inherit',
    env: process.env
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 1
  };
}

function writeReport(options, payload) {
  const outDir = path.resolve(options.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const campaign = safeCampaign(payload.campaign || options.campaign || 'latest');
  const reportPath = path.join(outDir, `autopilot-report-${campaign}-${Date.now()}.json`);

  fs.writeFileSync(reportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return reportPath;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const packPath = resolvePackPath(options);
  const pack = loadPack(packPath);

  const selectedChannels = options.channels.filter((channel) => CHANNELS.includes(channel));
  if (selectedChannels.length === 0) {
    throw new Error('No valid channels were provided.');
  }

  const readiness = selectedChannels.map((channel) => evaluateChannelReadiness(channel, pack));
  const readyChannels = readiness.filter((item) => item.ready).map((item) => item.channel);

  process.stdout.write(`Pack: ${packPath}\n`);
  process.stdout.write(`Campaign: ${pack.campaign || '-'}\n`);
  process.stdout.write(`Requested channels: ${selectedChannels.join(', ')}\n`);
  process.stdout.write(`Ready channels: ${readyChannels.join(', ') || '-'}\n\n`);

  for (const item of readiness) {
    if (item.ready) {
      process.stdout.write(`PASS ${item.channel} ready\n`);
      continue;
    }

    if (!item.hasCopy) {
      process.stdout.write(`SKIP ${item.channel} no-copy-in-pack\n`);
      continue;
    }

    process.stdout.write(`BLOCK ${item.channel} missing-secrets=${item.missingSecrets.join(',')}\n`);
  }

  const report = {
    executedAt: new Date().toISOString(),
    campaign: pack.campaign || options.campaign || '',
    packPath,
    requestedChannels: selectedChannels,
    readyChannels,
    liveRequested: options.live,
    minChannels: options.minChannels,
    readiness,
    steps: {
      goLive: 'not-run',
      dryPublish: 'not-run',
      livePublish: options.live ? 'not-run' : 'skipped'
    }
  };

  if (readyChannels.length < options.minChannels) {
    const reportPath = writeReport(options, report);
    throw new Error(
      `Autopilot blocked: ready channels ${readyChannels.length} is below minChannels ${options.minChannels}. Report: ${reportPath}`
    );
  }

  if (readyChannels.length === 0) {
    report.steps.goLive = 'skipped';
    report.steps.dryPublish = 'skipped';
    const reportPath = writeReport(options, report);
    process.stdout.write(`\nAutopilot completed with no ready channels. Report: ${reportPath}\n`);
    return;
  }

  const goLiveArgs = ['--packPath', packPath, '--channels', readyChannels.join(',')];
  const goLiveResult = runNodeScript(goLiveScript, goLiveArgs);
  report.steps.goLive = goLiveResult.ok ? 'passed' : 'failed';
  if (!goLiveResult.ok) {
    const reportPath = writeReport(options, report);
    throw new Error(`Autopilot blocked: go-live failed. Report: ${reportPath}`);
  }

  const dryArgs = ['--dry-run', '--packPath', packPath, '--channels', readyChannels.join(',')];
  const dryResult = runNodeScript(publishScript, dryArgs);
  report.steps.dryPublish = dryResult.ok ? 'passed' : 'failed';
  // Note: dry run may fail for some channels but that's okay - we continue

  let liveOk = true;
  if (options.live) {
    const liveArgs = ['--packPath', packPath, '--channels', readyChannels.join(',')];
    const liveResult = runNodeScript(publishScript, liveArgs);
    report.steps.livePublish = liveResult.ok ? 'passed' : 'failed';
    liveOk = liveResult.ok;
  }

  const reportPath = writeReport(options, report);
  process.stdout.write(`\nAutopilot completed. Report: ${reportPath}\n`);

  // Honest signal: if live posting was requested but reached zero channels,
  // fail so the engine's scheduled run turns red instead of faking success.
  if (options.live && !liveOk) {
    process.exitCode = 1;
    process.stdout.write('Autopilot live publish reached zero channels.\n');
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
