#!/usr/bin/env node

const REQUIRED_BY_CHANNEL = {
  linkedin: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'LINKEDIN_ORG_ID', 'LINKEDIN_ACCESS_TOKEN'],
  x: [
    'X_API_KEY',
    'X_API_SECRET',
    'X_BEARER_TOKEN',
    'X_CLIENT_ID',
    'X_CLIENT_SECRET',
    'X_ACCESS_TOKEN',
    'X_ACCESS_TOKEN_SECRET'
  ],
  facebook: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'],
  telegram: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  discord: ['DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_PUBLIC_KEY', 'DISCORD_CHANNEL_ID']
};

const PLACEHOLDER_PATTERNS = [/^CHANGE_ME$/i, /^REPLACE_ME$/i, /^YOUR_.+/i, /^EXAMPLE/i];

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

function evaluateChannel(channel, variables) {
  const missing = variables.filter((name) => isMissing(process.env[name]));
  return {
    channel,
    ok: missing.length === 0,
    missing,
    total: variables.length,
    available: variables.length - missing.length
  };
}

function pad(text, width) {
  if (text.length >= width) {
    return text;
  }

  return `${text}${' '.repeat(width - text.length)}`;
}

function printReport(results) {
  process.stdout.write('Social channel readiness report\n');
  process.stdout.write('--------------------------------\n');
  process.stdout.write(`${pad('Channel', 12)} ${pad('Status', 8)} ${pad('Available', 10)} Missing\n`);

  for (const result of results) {
    const status = result.ok ? 'READY' : 'BLOCKED';
    const missingText = result.missing.length ? result.missing.join(', ') : '-';
    process.stdout.write(`${pad(result.channel, 12)} ${pad(status, 8)} ${pad(`${result.available}/${result.total}`, 10)} ${missingText}\n`);
  }

  process.stdout.write('\n');
}

function main() {
  const results = Object.entries(REQUIRED_BY_CHANNEL).map(([channel, variables]) =>
    evaluateChannel(channel, variables)
  );

  printReport(results);

  const blocked = results.filter((result) => !result.ok);
  if (blocked.length === 0) {
    process.stdout.write('All social channels are ready.\n');
    process.exit(0);
  }

  process.stdout.write('Some channels are blocked. Add the missing secrets and run this check again.\n');
  process.exit(1);
}

main();
