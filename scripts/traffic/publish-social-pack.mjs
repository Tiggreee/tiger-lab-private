#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { assertPackAuthenticity } from './content-quality-guard.mjs';

const CHANNELS = ['linkedin', 'x', 'facebook', 'telegram', 'discord'];

function parseArgs(argv) {
  const options = {
    packPath: '',
    campaign: '',
    outDir: 'ops/traffic/outbox',
    dryRun: false,
    channels: CHANNELS
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (item === '--dry-run') {
      options.dryRun = true;
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

function encode(input) {
  return encodeURIComponent(input)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/'/g, '%27');
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

function isPlaceholderTrafficLink(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return normalized.includes('example.com') || normalized.includes('tu-landing-real.com');
}

function validateLivePublicationGuardrails(pack) {
  const destination = String(pack?.funnel?.trafficDestination || '').trim();
  if (isPlaceholderTrafficLink(destination)) {
    throw new Error('Live publish blocked: funnel.trafficDestination must be a real URL, not a placeholder.');
  }

  const closeChannel = String(pack?.funnel?.closeChannel || 'dm').toLowerCase();
  const closeDestination = String(pack?.funnel?.closeDestination || '').trim();
  const closeLink = String(pack?.funnel?.closeLink || '').trim();

  if ((closeChannel === 'whatsapp' || closeChannel === 'calendar' || closeChannel === 'landing') && !closeDestination) {
    throw new Error(`Live publish blocked: closeDestination is required when closeChannel=${closeChannel}.`);
  }

  if (closeChannel === 'whatsapp') {
    const phone = closeDestination.replace(/[^\d]/g, '');
    if (!/^\d{10,15}$/.test(phone)) {
      throw new Error('Live publish blocked: closeDestination for whatsapp must be 10-15 digits.');
    }
  }

  if (closeChannel !== 'dm' && !closeLink) {
    throw new Error('Live publish blocked: closeLink is required for non-dm close channels.');
  }
}

function requiredEnv(names) {
  const missing = names.filter((name) => !process.env[name] || !process.env[name].trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function postTelegram(text) {
  requiredEnv(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Telegram API ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

async function postDiscord(text) {
  requiredEnv(['DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID']);

  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const endpoint = `https://discord.com/api/v10/channels/${channelId}/messages`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: text })
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Discord API ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

async function postFacebook(text) {
  requiredEnv(['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN']);

  const endpoint = `https://graph.facebook.com/v23.0/${process.env.FACEBOOK_PAGE_ID}/feed`;
  const form = new URLSearchParams({
    message: text,
    access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Facebook API ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

function extractLinkedInOrgId(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/(\d{5,})/);
  if (match) {
    return match[1];
  }

  throw new Error('LINKEDIN_ORG_ID must contain a numeric organization id.');
}

async function postLinkedIn(text) {
  requiredEnv(['LINKEDIN_ACCESS_TOKEN']);
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const headers = { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0', 'Content-Type': 'application/json' };

  if (process.env.LINKEDIN_ORG_ID) {
    const orgId = extractLinkedInOrgId(process.env.LINKEDIN_ORG_ID);
    const payload = {
      author: `urn:li:organization:${orgId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' } },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };
    const resp = await fetch('https://api.linkedin.com/v2/ugcPosts', { method: 'POST', headers, body: JSON.stringify(payload) });
    const body = await resp.text();
    if (resp.ok) return body;
    if (resp.status === 401) console.log('Org post failed (401), falling back to member post...');
    else throw new Error(`LinkedIn API ${resp.status}: ${body}`);
  }

  const meResp = await fetch('https://api.linkedin.com/v2/me', { headers });
  if (!meResp.ok) {
    const errBody = await meResp.text();
    throw new Error(`LinkedIn /me API ${meResp.status}: ${errBody}`);
  }
  const me = await meResp.json();
  const personId = me.sub || me.id;
  if (!personId) throw new Error('Could not resolve LinkedIn person ID from /me endpoint');

  const payload = {
    author: `urn:li:person:${personId}`,
    lifecycleState: 'PUBLISHED',
    specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' } },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
  };
  const resp = await fetch('https://api.linkedin.com/v2/ugcPosts', { method: 'POST', headers, body: JSON.stringify(payload) });
  const body = await resp.text();
  if (!resp.ok) throw new Error(`LinkedIn API ${resp.status}: ${body}`);
  return body;
}

function buildOAuth1Header({ method, url, consumerKey, consumerSecret, token, tokenSecret }) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0'
  };

  const normalizedParams = Object.entries(oauthParams)
    .map(([key, value]) => [encode(key), encode(value)])
    .sort((a, b) => {
      if (a[0] === b[0]) {
        return a[1].localeCompare(b[1]);
      }

      return a[0].localeCompare(b[0]);
    })
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${encode(url)}&${encode(normalizedParams)}`;
  const signingKey = `${encode(consumerSecret)}&${encode(tokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;

  const header = Object.entries(oauthParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
    .join(', ');

  return `OAuth ${header}`;
}

async function postX(text) {
  requiredEnv(['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET']);

  const endpoint = 'https://api.x.com/2/tweets';
  const authHeader = buildOAuth1Header({
    method: 'POST',
    url: endpoint,
    consumerKey: process.env.X_API_KEY,
    consumerSecret: process.env.X_API_SECRET,
    token: process.env.X_ACCESS_TOKEN,
    tokenSecret: process.env.X_ACCESS_TOKEN_SECRET
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`X API ${response.status}: ${body}`);
  }

  return JSON.parse(body);
}

const POSTERS = {
  linkedin: postLinkedIn,
  x: postX,
  facebook: postFacebook,
  telegram: postTelegram,
  discord: postDiscord
};

async function publishChannel(channel, text, dryRun) {
  if (!POSTERS[channel]) {
    throw new Error(`Unsupported channel: ${channel}`);
  }

  if (dryRun) {
    return { channel, status: 'DRY_RUN', details: 'No live request sent.' };
  }

  const result = await POSTERS[channel](text);
  return { channel, status: 'POSTED', details: result };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const packPath = resolvePackPath(options);
  const pack = loadPack(packPath);

  assertPackAuthenticity(pack);

  if (!options.dryRun) {
    validateLivePublicationGuardrails(pack);
  }

  const selectedChannels = options.channels.filter((channel) => CHANNELS.includes(channel));
  if (selectedChannels.length === 0) {
    throw new Error('No valid channels were provided.');
  }

  process.stdout.write(`Pack: ${packPath}\n`);
  process.stdout.write(`Campaign: ${pack.campaign}\n`);
  process.stdout.write(`Mode: ${options.dryRun ? 'DRY_RUN' : 'LIVE'}\n`);
  process.stdout.write(`Channels: ${selectedChannels.join(', ')}\n\n`);

  const results = [];

  for (const channel of selectedChannels) {
    const channelData = pack.channels[channel];
    if (!channelData || !channelData.copyPaste) {
      results.push({ channel, status: 'SKIPPED', details: 'No copy found in pack.' });
      continue;
    }

    try {
      const result = await publishChannel(channel, channelData.copyPaste, options.dryRun);
      results.push(result);
      process.stdout.write(`[${channel}] ${result.status}\n`);
    } catch (error) {
      results.push({ channel, status: 'FAILED', details: error.message });
      process.stdout.write(`[${channel}] FAILED: ${error.message}\n`);
    }
  }

  const failed = results.filter((item) => item.status === 'FAILED');
  process.stdout.write('\nSummary\n');
  process.stdout.write('-------\n');
  for (const result of results) {
    process.stdout.write(`${result.channel}: ${result.status}\n`);
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
