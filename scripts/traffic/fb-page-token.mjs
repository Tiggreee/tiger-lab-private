#!/usr/bin/env node

// Facebook long-lived Page token helper.
// Run this in YOUR terminal. It never sends anything to anyone but Facebook's
// Graph API. It takes a short-lived USER token plus the app id/secret, exchanges
// it for a long-lived user token, then lists your Pages with their permanent
// Page access tokens (Page tokens derived from a long-lived user token do not
// expire). Copy the Page token into the FACEBOOK_PAGE_ACCESS_TOKEN secret.
//
// Usage:
//   node scripts/traffic/fb-page-token.mjs \
//     --appId 123 --appSecret abc --userToken EAAB...
// Or via env: FB_APP_ID, FB_APP_SECRET, FB_USER_TOKEN

const GRAPH = 'https://graph.facebook.com/v23.0';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return '';
}

async function main() {
  const appId = arg('appId') || process.env.FB_APP_ID || process.env.FACEBOOK_APP_ID;
  const appSecret = arg('appSecret') || process.env.FB_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
  const userToken = arg('userToken') || process.env.FB_USER_TOKEN;

  const missing = [];
  if (!appId) missing.push('--appId (or FB_APP_ID)');
  if (!appSecret) missing.push('--appSecret (or FB_APP_SECRET)');
  if (!userToken) missing.push('--userToken (or FB_USER_TOKEN)');
  if (missing.length) {
    process.stderr.write(`Missing: ${missing.join(', ')}\n`);
    process.exitCode = 1;
    return;
  }

  // Step 1: short-lived user token -> long-lived user token.
  const exchangeUrl =
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&fb_exchange_token=${encodeURIComponent(userToken)}`;

  const exchangeResp = await fetch(exchangeUrl);
  const exchangeText = await exchangeResp.text();
  if (!exchangeResp.ok) {
    process.stderr.write(`Token exchange failed (${exchangeResp.status}): ${exchangeText}\n`);
    process.exitCode = 1;
    return;
  }
  const longLivedUserToken = JSON.parse(exchangeText).access_token;
  process.stdout.write('Long-lived user token obtained.\n');

  // Step 2: list Pages with their (permanent) Page access tokens.
  const accountsResp = await fetch(
    `${GRAPH}/me/accounts?fields=name,id,access_token&access_token=${encodeURIComponent(longLivedUserToken)}`
  );
  const accountsText = await accountsResp.text();
  if (!accountsResp.ok) {
    process.stderr.write(`Could not list pages (${accountsResp.status}): ${accountsText}\n`);
    process.exitCode = 1;
    return;
  }
  const accounts = JSON.parse(accountsText);
  const pages = accounts.data || [];
  if (pages.length === 0) {
    process.stdout.write('No pages found. Make sure you granted pages_show_list and pages_manage_posts.\n');
    return;
  }

  // --raw prints ONLY the Page token (no labels), so it can be piped straight
  // into `gh secret set` without ever being displayed:
  //   node ... --raw --pageId <id> | gh secret set FACEBOOK_PAGE_ACCESS_TOKEN --env production-social
  if (process.argv.includes('--raw')) {
    const wantedId = arg('pageId');
    const chosen = wantedId ? pages.find((page) => page.id === wantedId) : pages[0];
    if (!chosen) {
      process.stderr.write(`No page matched --pageId ${wantedId}.\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(chosen.access_token);
    return;
  }

  process.stdout.write('\nPages you manage (use the matching values in secrets):\n');
  process.stdout.write('-----------------------------------------------------\n');
  for (const page of pages) {
    process.stdout.write(`\nPage: ${page.name}\n`);
    process.stdout.write(`  FACEBOOK_PAGE_ID           = ${page.id}\n`);
    process.stdout.write(`  FACEBOOK_PAGE_ACCESS_TOKEN = <hidden — re-run with --raw --pageId ${page.id} to pipe it into gh secret set>\n`);
  }
  process.stdout.write('\nThe Page token is permanent. Pipe it into the secret without printing:\n');
  process.stdout.write('  node scripts/traffic/fb-page-token.mjs --appId ID --appSecret SECRET --userToken TOKEN --raw --pageId <PAGE_ID> | gh secret set FACEBOOK_PAGE_ACCESS_TOKEN --env production-social\n');
}

main().catch((error) => {
  process.stderr.write(`fb-page-token failed: ${error.message}\n`);
  process.exitCode = 1;
});
