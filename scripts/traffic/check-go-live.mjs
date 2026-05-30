#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const CHANNELS = ['linkedin', 'x', 'facebook', 'telegram', 'discord'];

const REQUIRED_BY_CHANNEL = {
  linkedin: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ORG_ID'],
  x: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'],
  facebook: ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'],
  telegram: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  discord: ['DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID']
};

const PLACEHOLDER_PATTERNS = [/^CHANGE_ME$/i, /^REPLACE_ME$/i, /^YOUR_.+/i, /^EXAMPLE/i];

function parseArgs(argv) {
  const options = {
    packPath: '',
    campaign: '',
    outDir: 'ops/traffic/outbox',
    channels: CHANNELS
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
  return JSON.parse(raw);
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

function isPlaceholderTrafficLink(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return normalized.includes('example.com') || normalized.includes('tu-landing-real.com');
}

function runChecks(pack, channels) {
  const results = [];

  const destination = String(pack?.funnel?.trafficDestination || '').trim();
  results.push({
    check: 'real_traffic_destination',
    ok: !isPlaceholderTrafficLink(destination),
    detail: destination || '-'
  });

  const closeChannel = String(pack?.funnel?.closeChannel || 'dm').toLowerCase();
  const closeDestination = String(pack?.funnel?.closeDestination || '').trim();
  const closeLink = String(pack?.funnel?.closeLink || '').trim();

  const destinationRequired = closeChannel === 'whatsapp' || closeChannel === 'calendar' || closeChannel === 'landing';
  results.push({
    check: 'close_destination_present',
    ok: destinationRequired ? Boolean(closeDestination) : true,
    detail: `${closeChannel}:${closeDestination || '-'}`
  });

  if (closeChannel === 'whatsapp') {
    const phone = closeDestination.replace(/[^\d]/g, '');
    results.push({
      check: 'whatsapp_destination_shape',
      ok: /^\d{10,15}$/.test(phone),
      detail: phone || '-'
    });
  }

  if (closeChannel !== 'dm') {
    results.push({
      check: 'close_link_present',
      ok: Boolean(closeLink),
      detail: closeLink || '-'
    });
  }

  for (const channel of channels) {
    const required = REQUIRED_BY_CHANNEL[channel] || [];
    for (const key of required) {
      const value = process.env[key];
      results.push({
        check: `secret_${channel}_${key}`,
        ok: !isPlaceholderValue(value),
        detail: value ? 'set' : 'missing'
      });
    }
  }

  return results;
}

function printResults(results) {
  process.stdout.write('Go-live checklist\n');
  process.stdout.write('-----------------\n');
  for (const result of results) {
    process.stdout.write(`${result.ok ? 'PASS' : 'FAIL'}  ${result.check}  (${result.detail})\n`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const packPath = resolvePackPath(options);
  const pack = loadPack(packPath);

  const channels = options.channels.filter((channel) => CHANNELS.includes(channel));
  if (channels.length === 0) {
    throw new Error('No valid channels were provided.');
  }

  process.stdout.write(`Pack: ${packPath}\n`);
  process.stdout.write(`Campaign: ${pack.campaign || '-'}\n`);
  process.stdout.write(`Channels: ${channels.join(', ')}\n\n`);

  const results = runChecks(pack, channels);
  printResults(results);

  const failed = results.filter((item) => !item.ok);
  if (failed.length > 0) {
    process.exit(1);
  }

  process.stdout.write('\nGo-live checklist passed.\n');
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
