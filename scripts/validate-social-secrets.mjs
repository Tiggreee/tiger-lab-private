#!/usr/bin/env node

const REQUIRED = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'X_API_KEY',
  'X_API_SECRET',
  'X_BEARER_TOKEN',
  'X_CLIENT_ID',
  'X_CLIENT_SECRET',
  'X_ACCESS_TOKEN',
  'X_ACCESS_TOKEN_SECRET',
  'DISCORD_BOT_TOKEN',
  'DISCORD_APPLICATION_ID',
  'DISCORD_PUBLIC_KEY',
  'DISCORD_CHANNEL_ID',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'FACEBOOK_PAGE_ID',
  'FACEBOOK_PAGE_ACCESS_TOKEN',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'LINKEDIN_ORG_ID',
  'LINKEDIN_ACCESS_TOKEN'
];

const PLACEHOLDER_PATTERNS = [
  /^CHANGE_ME$/i,
  /^REPLACE_ME$/i,
  /^YOUR_.+/i,
  /^EXAMPLE/i
];

function isMissing(value) {
  if (typeof value !== 'string') {
    return true;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function main() {
  const missing = REQUIRED.filter((key) => isMissing(process.env[key]));

  if (missing.length === 0) {
    console.log('Social secrets check passed.');
    process.exit(0);
  }

  console.error('Missing or placeholder social secrets detected:');
  for (const key of missing) {
    console.error(`- ${key}`);
  }

  console.error('\nSet these variables in your server environment before publishing automation jobs.');
  process.exit(1);
}

main();
