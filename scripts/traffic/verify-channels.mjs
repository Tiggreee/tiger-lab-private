#!/usr/bin/env node

// Read-only channel credential verifier.
// Runs the same authentication each poster uses, but hits a read endpoint
// instead of publishing. Never sends a post. Reports GREEN/RED per channel
// with the exact API status and message so a broken secret is obvious.

import crypto from 'node:crypto';

const CHANNELS = ['telegram', 'discord', 'facebook', 'x', 'linkedin'];

const REQUIRED_SECRETS = {
  telegram: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
  discord: ['DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'],
  facebook: ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'],
  x: ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'],
  linkedin: ['LINKEDIN_ACCESS_TOKEN']
};

function parseArgs(argv) {
  const options = { channels: [...CHANNELS] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--channel' || item === '--channels') {
      const value = argv[index + 1];
      if (value && !value.startsWith('--')) {
        const requested = value
          .split(',')
          .map((channel) => channel.trim().toLowerCase())
          .filter(Boolean);
        options.channels = requested.includes('all') ? [...CHANNELS] : requested;
        index += 1;
      }
    }
  }
  return options;
}

function missingSecrets(channel) {
  return (REQUIRED_SECRETS[channel] || []).filter(
    (name) => !process.env[name] || !process.env[name].trim()
  );
}

function encode(input) {
  return encodeURIComponent(input)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/'/g, '%27');
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
    .sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${encode(url)}&${encode(normalizedParams)}`;
  const signingKey = `${encode(consumerSecret)}&${encode(tokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauthParams.oauth_signature = signature;

  return `OAuth ${Object.entries(oauthParams)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
    .join(', ')}`;
}

async function verifyTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const meResp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meBody = await meResp.text();
  if (!meResp.ok) {
    return { ok: false, detail: `Bot token rejected (getMe ${meResp.status}): ${meBody}` };
  }
  const me = JSON.parse(meBody);

  const chatResp = await fetch(
    `https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(chatId)}`
  );
  const chatBody = await chatResp.text();
  if (!chatResp.ok) {
    // The chat_id is wrong or the bot is not in it. Read getUpdates (read-only)
    // and surface the chat ids the bot can actually see, so the right value is
    // obvious without guessing.
    let discovered = '';
    try {
      const upResp = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      if (upResp.ok) {
        const updates = JSON.parse(await upResp.text());
        const seen = new Map();
        for (const update of updates.result || []) {
          const chat =
            update.message?.chat ||
            update.channel_post?.chat ||
            update.my_chat_member?.chat;
          if (chat && !seen.has(chat.id)) {
            seen.set(chat.id, `${chat.id} (${chat.type}${chat.title ? `: ${chat.title}` : chat.username ? `: @${chat.username}` : ''})`);
          }
        }
        if (seen.size > 0) {
          discovered = ` Chats the bot currently sees -> ${[...seen.values()].join(' | ')}. Use one of these as TELEGRAM_CHAT_ID.`;
        } else {
          discovered = ' getUpdates returned no chats — add @' + me.result?.username + ' to the target chat and send one message there, then re-run.';
        }
      }
    } catch {
      /* discovery is best-effort */
    }
    return {
      ok: false,
      detail: `Bot @${me.result?.username} is valid, but chat "${chatId}" is unreachable (getChat ${chatResp.status}): ${chatBody}.${discovered}`
    };
  }
  const chat = JSON.parse(chatBody);
  return {
    ok: true,
    detail: `Bot @${me.result?.username} can reach chat "${chat.result?.title || chat.result?.username || chatId}".`
  };
}

async function verifyDiscord() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  const resp = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    headers: { Authorization: `Bot ${token}` }
  });
  const body = await resp.text();
  if (!resp.ok) {
    // Auth may be fine but the channel id is wrong or the bot is not in that
    // server. Discover the text channels the bot can actually see (read-only).
    let discovered = '';
    if (resp.status === 401) {
      return { ok: false, detail: `Bot token rejected (GET channel 401): ${body}` };
    }
    try {
      const guildsResp = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bot ${token}` }
      });
      if (guildsResp.ok) {
        const guilds = JSON.parse(await guildsResp.text());
        const hints = [];
        for (const guild of guilds) {
          const chResp = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/channels`, {
            headers: { Authorization: `Bot ${token}` }
          });
          if (chResp.ok) {
            const channels = JSON.parse(await chResp.text());
            for (const ch of channels) {
              // type 0 = text, type 5 = announcement — both accept messages.
              if (ch.type === 0 || ch.type === 5) {
                hints.push(`${ch.id} (#${ch.name} in "${guild.name}")`);
              }
            }
          }
        }
        discovered = hints.length
          ? ` Text channels the bot can see -> ${hints.join(' | ')}. Use one as DISCORD_CHANNEL_ID.`
          : ' Bot is in no servers — invite it with Send Messages permission, then re-run.';
      }
    } catch {
      /* discovery is best-effort */
    }
    return { ok: false, detail: `Channel ${channelId} unreachable (GET channel ${resp.status}): ${body}.${discovered}` };
  }
  const channel = JSON.parse(body);
  return { ok: true, detail: `Bot can see channel #${channel.name || channelId}.` };
}

async function verifyFacebook() {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  const resp = await fetch(
    `https://graph.facebook.com/v23.0/${pageId}?fields=name,id&access_token=${encodeURIComponent(token)}`
  );
  const body = await resp.text();
  if (!resp.ok) {
    return { ok: false, detail: `Page token invalid (GET page ${resp.status}): ${body}` };
  }
  const page = JSON.parse(body);
  return { ok: true, detail: `Page token valid for "${page.name}" (${page.id}).` };
}

async function verifyX() {
  const endpoint = 'https://api.x.com/2/users/me';
  const authHeader = buildOAuth1Header({
    method: 'GET',
    url: endpoint,
    consumerKey: process.env.X_API_KEY,
    consumerSecret: process.env.X_API_SECRET,
    token: process.env.X_ACCESS_TOKEN,
    tokenSecret: process.env.X_ACCESS_TOKEN_SECRET
  });

  const resp = await fetch(endpoint, { headers: { Authorization: authHeader } });
  const body = await resp.text();
  if (!resp.ok) {
    return {
      ok: false,
      detail: `Tokens rejected (GET users/me ${resp.status}): ${body}. Note: even if this passes, posting also needs Read+Write app permission.`
    };
  }
  const user = JSON.parse(body);
  return {
    ok: true,
    detail: `Tokens valid for @${user.data?.username}. (Posting still requires Read+Write app permission.)`
  };
}

async function verifyLinkedIn() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  // Modern OpenID endpoint. /v2/me is legacy and returns DISABLED_APPLICATION
  // unless the app has the deprecated Sign In product; /v2/userinfo works with
  // the "Sign In with LinkedIn using OpenID Connect" product (openid+profile).
  const resp = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await resp.text();
  if (!resp.ok) {
    return { ok: false, detail: `Token/app rejected (GET /v2/userinfo ${resp.status}): ${body}` };
  }
  const me = JSON.parse(body);

  // Introspect the token to report which scopes were actually granted. Posting
  // as a company page needs w_organization_social; LinkedIn silently drops
  // org scopes if the Community Management API product is not approved.
  let scopeHint = '';
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (clientId && clientSecret) {
    try {
      const introspectResp = await fetch('https://www.linkedin.com/oauth/v2/introspectToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, token })
      });
      const introBody = await introspectResp.text();
      if (introspectResp.ok) {
        const info = JSON.parse(introBody);
        const scopes = String(info.scope || '');
        const hasOrg = /w_organization_social/.test(scopes);
        scopeHint = ` Scopes: ${scopes || '(none reported)'}.${hasOrg ? '' : ' MISSING w_organization_social -> cannot post as page (needs Community Management API product).'}`;
      } else {
        scopeHint = ` Introspect ${introspectResp.status}: ${introBody.slice(0, 200)}.`;
      }
    } catch (err) {
      scopeHint = ` Introspect error: ${err.message}.`;
    }
  } else {
    scopeHint = ' (client id/secret not set, cannot introspect scopes)';
  }

  // Discover organizations the token can administer so the user can set
  // LINKEDIN_ORG_ID and post as the company page. Needs rw_organization_admin
  // scope; if the token lacks it this call just returns nothing useful.
  let orgHint = '';
  try {
    const aclResp = await fetch(
      'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED',
      { headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' } }
    );
    if (aclResp.ok) {
      const acl = await aclResp.json();
      const orgIds = (acl.elements || [])
        .map((el) => String(el.organizationalTarget || '').replace('urn:li:organization:', ''))
        .filter(Boolean);
      if (orgIds.length > 0) {
        orgHint = ` Admin org id(s) -> ${orgIds.join(', ')}. Set one as LINKEDIN_ORG_ID to post as the page.`;
      }
    }
  } catch {
    // discovery is best-effort only
  }

  return { ok: true, detail: `Token valid, member id resolved (${me.sub}).${scopeHint}${orgHint}` };
}

const VERIFIERS = {
  telegram: verifyTelegram,
  discord: verifyDiscord,
  facebook: verifyFacebook,
  x: verifyX,
  linkedin: verifyLinkedIn
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const channels = options.channels.filter((channel) => CHANNELS.includes(channel));
  if (channels.length === 0) {
    process.stdout.write('No valid channels requested.\n');
    process.exitCode = 1;
    return;
  }

  process.stdout.write('Channel credential check (read-only, no posts sent)\n');
  process.stdout.write('---------------------------------------------------\n');

  const results = [];
  for (const channel of channels) {
    const missing = missingSecrets(channel);
    if (missing.length > 0) {
      results.push({ channel, ok: false, detail: `missing secrets: ${missing.join(', ')}` });
      process.stdout.write(`[${channel}] RED  — missing secrets: ${missing.join(', ')}\n`);
      continue;
    }

    try {
      const result = await VERIFIERS[channel]();
      results.push({ channel, ...result });
      process.stdout.write(`[${channel}] ${result.ok ? 'GREEN' : 'RED '} — ${result.detail}\n`);
    } catch (error) {
      results.push({ channel, ok: false, detail: error.message });
      process.stdout.write(`[${channel}] RED  — ${error.message}\n`);
    }
  }

  const green = results.filter((item) => item.ok);
  const red = results.filter((item) => !item.ok);
  process.stdout.write('\nSummary\n-------\n');
  for (const result of results) {
    process.stdout.write(`${result.channel}: ${result.ok ? 'GREEN' : 'RED'}\n`);
  }
  process.stdout.write(`\n${green.length} green, ${red.length} red\n`);

  if (red.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`verify-channels failed: ${error.message}\n`);
  process.exitCode = 1;
});
