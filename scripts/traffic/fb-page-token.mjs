#!/usr/bin/env node

// Facebook long-lived Page token helper — interactive and beginner-safe.
//
// Just run:   node scripts/traffic/fb-page-token.mjs
// It asks for your App ID, App Secret and a short-lived User token (paste one
// per line), exchanges the token for a permanent Page token, lets you pick the
// Page, and sets the FACEBOOK_PAGE_ACCESS_TOKEN / FACEBOOK_PAGE_ID secrets for
// you via gh — the token is never printed. Run it in YOUR terminal.
//
// Flags still work for scripting:
//   --appId --appSecret --userToken [--raw --pageId <id>]

import readline from 'node:readline';
import { spawn } from 'node:child_process';

const GRAPH = 'https://graph.facebook.com/v23.0';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return '';
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Write a secret value to `gh secret set` via stdin so it never appears on the
// command line or in the process list.
function setSecretViaGh(name, value) {
  return new Promise((resolve) => {
    const child = spawn('gh', ['secret', 'set', name, '--env', 'production-social'], {
      stdio: ['pipe', 'inherit', 'inherit']
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
    child.stdin.write(value);
    child.stdin.end();
  });
}

async function exchangeAndListPages(appId, appSecret, userToken) {
  const exchangeUrl =
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&fb_exchange_token=${encodeURIComponent(userToken)}`;

  const exchangeResp = await fetch(exchangeUrl);
  const exchangeText = await exchangeResp.text();
  if (!exchangeResp.ok) {
    throw new Error(`Token exchange failed (${exchangeResp.status}): ${exchangeText}`);
  }
  const longLivedUserToken = JSON.parse(exchangeText).access_token;

  const accountsResp = await fetch(
    `${GRAPH}/me/accounts?fields=name,id,access_token&access_token=${encodeURIComponent(longLivedUserToken)}`
  );
  const accountsText = await accountsResp.text();
  if (!accountsResp.ok) {
    throw new Error(`Could not list pages (${accountsResp.status}): ${accountsText}`);
  }
  const pages = JSON.parse(accountsText).data || [];
  if (pages.length === 0) {
    throw new Error('No pages found. Grant pages_show_list and pages_manage_posts, then retry.');
  }
  return pages;
}

async function runFlags() {
  const appId = arg('appId') || process.env.FB_APP_ID || process.env.FACEBOOK_APP_ID;
  const appSecret = arg('appSecret') || process.env.FB_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  const userToken = arg('userToken') || process.env.FB_USER_TOKEN;
  if (!appId || !appSecret || !userToken) {
    return false; // fall back to interactive
  }

  const pages = await exchangeAndListPages(appId, appSecret, userToken);
  if (process.argv.includes('--raw')) {
    const wantedId = arg('pageId');
    const chosen = wantedId ? pages.find((page) => page.id === wantedId) : pages[0];
    if (!chosen) {
      throw new Error(`No page matched --pageId ${wantedId}.`);
    }
    process.stdout.write(chosen.access_token);
    return true;
  }
  process.stdout.write('\nPages you manage:\n');
  for (const page of pages) {
    process.stdout.write(`  ${page.name} -> FACEBOOK_PAGE_ID ${page.id}\n`);
  }
  process.stdout.write('\nRe-run with --raw --pageId <id> to pipe the permanent token into gh secret set.\n');
  return true;
}

async function runInteractive() {
  process.stdout.write('\nFacebook Page token setup (interactive)\n');
  process.stdout.write('---------------------------------------\n');
  process.stdout.write('Get these from developers.facebook.com (Settings > Basic) and\n');
  process.stdout.write('the Graph API Explorer (Generate Access Token with pages_show_list,\n');
  process.stdout.write('pages_read_engagement, pages_manage_posts). Paste one value per line.\n\n');

  const appId = await ask('1) App ID: ');
  const appSecret = await ask('2) App Secret: ');
  const userToken = await ask('3) User token (starts with EAA...): ');

  if (!appId || !appSecret || !userToken) {
    process.stderr.write('\nAll three values are required. Nothing changed.\n');
    process.exitCode = 1;
    return;
  }

  process.stdout.write('\nTalking to Facebook...\n');
  const pages = await exchangeAndListPages(appId, appSecret, userToken);

  let chosen = pages[0];
  if (pages.length > 1) {
    process.stdout.write('\nYour pages:\n');
    pages.forEach((page, index) => {
      process.stdout.write(`  [${index + 1}] ${page.name} (${page.id})\n`);
    });
    const pick = await ask(`\nWhich page? (1-${pages.length}): `);
    const idx = Number.parseInt(pick, 10) - 1;
    if (Number.isInteger(idx) && pages[idx]) {
      chosen = pages[idx];
    }
  }
  process.stdout.write(`\nSelected page: ${chosen.name} (${chosen.id})\n`);

  const confirm = await ask('Set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID secrets now? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    process.stdout.write('\nNo secrets changed. Your permanent Page token was NOT printed for safety.\n');
    return;
  }

  const tokenOk = await setSecretViaGh('FACEBOOK_PAGE_ACCESS_TOKEN', chosen.access_token);
  const idOk = await setSecretViaGh('FACEBOOK_PAGE_ID', chosen.id);
  if (tokenOk && idOk) {
    process.stdout.write('\nDone. Secrets updated. The token was never displayed.\n');
    process.stdout.write('Ask the assistant to re-run the facebook verifier to confirm GREEN.\n');
  } else {
    process.stdout.write('\nCould not set one or more secrets via gh. Make sure gh is installed and authenticated.\n');
    process.exitCode = 1;
  }
}

async function main() {
  const handled = await runFlags();
  if (!handled) {
    await runInteractive();
  }
}

main().catch((error) => {
  process.stderr.write(`\nfb-page-token failed: ${error.message}\n`);
  process.exitCode = 1;
});
