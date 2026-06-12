# Social Publication Structure (All Networks)

This structure is optimized for faster execution and higher conversion intent.

## LinkedIn-first fast lane (today)

If the goal is to go live today with minimum risk and maximum focus, use only LinkedIn.

1. Build one campaign pack for LinkedIn only.
2. Point to a real landing URL (never placeholders).
3. Validate go-live for `linkedin` only.
4. Publish in dry-run first, then live.
5. Track responses in the first 24h and update the pipeline.

Command sequence:

```bash
npm run traffic:pack -- --topic "Sistema autonomo para capturar leads" --audience "founders SMB" --offer "diagnostico de 15 min" --campaign "linkedin-today" --baseLink "https://tu-landing-real.com" --closeChannel "calendar" --closeDestination "https://cal.com/tu-enlace"
npm run traffic:go-live -- --campaign "linkedin-today" --channels "linkedin"
npm run traffic:publish:dry -- --campaign "linkedin-today" --channels "linkedin"
npm run traffic:publish -- --campaign "linkedin-today" --channels "linkedin"
```

## Core structure

1. Hook
- One sentence with a pain/problem visible now.

2. Friction/Pain
- Explain what is failing in the current approach.

3. Promise
- One concrete result with a time window.

4. Proof
- Small evidence line (pattern, metric, or repeated outcome).

5. CTA
- One CTA only. Ask for a single action.

## Operational rules by channel

- LinkedIn: long form with 4-step checklist and one CTA.
- X: single short message, one CTA, one tracked link.
- Facebook: medium length with explicit pain and direct CTA.
- Telegram: practical mini-playbook format in bullets.
- Discord: concise action-focused post.

## Ready commands

1. Validate readiness by social channel:

node scripts/traffic/check-social-ready.mjs

2. Generate copy/paste pack for all networks:

node scripts/traffic/generate-social-pack.mjs --topic "Sistema autonomo para capturar leads" --audience "founders SMB" --offer "diagnostico de 15 min" --campaign "sprint-24h" --baseLink "https://tu-dominio-real.com"

Example with final close setup (recommended):

node scripts/traffic/generate-social-pack.mjs --topic "Sistema autonomo para capturar leads" --audience "founders SMB" --offer "diagnostico de 15 min" --campaign "sprint-24h" --baseLink "https://tu-landing-real.com" --closeChannel "whatsapp" --closeDestination "5215512345678" --prefillMessage "Hola, vengo de la campana sprint-24h y quiero activar el diagnostico express."

3. Quick command with npm scripts:

npm run traffic:ready
npm run traffic:pack -- --topic "Sistema autonomo para capturar leads" --audience "founders SMB" --offer "diagnostico de 15 min" --campaign "sprint-24h" --baseLink "https://tu-dominio-real.com"

Quick command with close channel + prefilled message:

npm run traffic:pack -- --topic "Sistema autonomo para capturar leads" --audience "founders SMB" --offer "diagnostico de 15 min" --campaign "sprint-24h" --baseLink "https://tu-landing-real.com" --closeChannel "whatsapp" --closeDestination "5215512345678" --prefillMessage "Hola, vengo de la campana sprint-24h y quiero activar el diagnostico express."

Note: pack generation now rejects placeholder links (like example.com) to prevent conversion leaks.

4. Publish the generated pack automatically (local shell with env vars loaded):

npm run traffic:publish -- --campaign "sprint-24h"

5. Validate publication flow without posting live:

npm run traffic:publish:dry -- --campaign "sprint-24h"

6. Run go-live checklist before any live publish:

npm run traffic:go-live -- --campaign "sprint-24h" --channels "linkedin,x,facebook,telegram,discord"

For same-day execution, prefer one-channel validation:

npm run traffic:go-live -- --campaign "linkedin-today" --channels "linkedin"

6.1. Use autopilot safe execution (recommended for same-day operation):

- Auto-selects only channels that are ready (secrets + copy in pack).
- Enforces go-live check on selected channels.
- Runs dry publish always; live publish only when `--live` is set.
- Stores an auditable report JSON in `ops/traffic/outbox`.

Dry mode (default):

npm run traffic:autopilot -- --campaign "linkedin-today" --channels "linkedin,x,facebook"

Live mode (after human approval):

npm run traffic:autopilot -- --campaign "linkedin-today" --channels "linkedin,x,facebook" --live

Optional strict minimum channels gate:

npm run traffic:autopilot -- --campaign "linkedin-today" --channels "linkedin,x,facebook" --minChannels 1

This checklist fails fast if:
- traffic destination is placeholder
- close destination/link is invalid
- required secrets are missing for selected channels

7. Full automation from GitHub Actions (recommended):

- Workflow: `.github/workflows/social-publish.yml`
- Trigger: `workflow_dispatch`
- Inputs:
	- `campaign`: pack campaign id
	- `dry_run`: true/false
	- `channels`: comma-separated channel list
- Environment: `production-social` (uses environment secrets directly)

8. Conversation entry endpoint (server mode):

- Route: `POST /conversation-entry`
- Goal: return final close entry link and prefilled message
- Request example:

curl -X POST http://localhost:8787/conversation-entry \
	-H "Content-Type: application/json" \
	-d '{
		"leadId": "lead_123",
		"channel": "whatsapp",
		"destination": "5215512345678",
		"message": "Hola, vengo de la campana y quiero activar el diagnostico express."
	}'

- Response includes:
	- `leadId`
	- `channel`
	- `destination`
	- `message`
	- `entryLink`

9. LinkedIn OAuth + analytics endpoint (server mode):

- Start OAuth (returns authorization URL):

curl -X GET http://localhost:8787/integrations/linkedin/oauth/start

- Open `authorizeUrl` in browser, approve access, and LinkedIn will redirect to callback URL.
- Callback endpoint handled by server:

GET /integrations/linkedin/oauth/callback?code=...&state=...

- Read campaign analytics (requires `x-api-key` with `linkedin:analytics:read` scope):

curl -X GET "http://localhost:8787/integrations/linkedin/analytics?campaignId=123456&startDate=2026-06-01&endDate=2026-06-11" \
  -H "x-api-key: dev-public-key"

- Response totals include: impressions, clicks, ctr, spend, conversions.

## Secure secret placement

Recommended priority:

1. GitHub Environments (production-social): best isolation for production deploy/publish.
2. Repository secrets: only for repo-scoped automation.
3. Local .env: development only, never commit.

## Copy/paste secret names

TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
X_API_KEY
X_API_SECRET
X_BEARER_TOKEN
X_CLIENT_ID
X_CLIENT_SECRET
X_ACCESS_TOKEN
X_ACCESS_TOKEN_SECRET
DISCORD_BOT_TOKEN
DISCORD_APPLICATION_ID
DISCORD_PUBLIC_KEY
DISCORD_CHANNEL_ID
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
FACEBOOK_PAGE_ID
FACEBOOK_PAGE_ACCESS_TOKEN
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
LINKEDIN_ORG_ID
LINKEDIN_ACCESS_TOKEN

## Minimum daily autonomous loop (1 hour)

Run these commands once a day:

```bash
npm run revenue:daily
npm run traffic:sla
npm run command-center:summary
```

Human actions expected after loop:

1. Reply to urgent leads first (SLA < 15 min in active windows).
2. Approve one LinkedIn post/campaign.
3. Update pipeline deals and next actions.

## GitHub CLI examples for Environment secrets

Use your real values, not placeholders:

gh secret set TELEGRAM_BOT_TOKEN --env production-social --body "VALUE"
gh secret set TELEGRAM_CHAT_ID --env production-social --body "VALUE"
gh secret set X_API_KEY --env production-social --body "VALUE"
gh secret set X_API_SECRET --env production-social --body "VALUE"
gh secret set X_BEARER_TOKEN --env production-social --body "VALUE"
gh secret set X_CLIENT_ID --env production-social --body "VALUE"
gh secret set X_CLIENT_SECRET --env production-social --body "VALUE"
gh secret set X_ACCESS_TOKEN --env production-social --body "VALUE"
gh secret set X_ACCESS_TOKEN_SECRET --env production-social --body "VALUE"
gh secret set DISCORD_BOT_TOKEN --env production-social --body "VALUE"
gh secret set DISCORD_APPLICATION_ID --env production-social --body "VALUE"
gh secret set DISCORD_PUBLIC_KEY --env production-social --body "VALUE"
gh secret set DISCORD_CHANNEL_ID --env production-social --body "VALUE"
gh secret set FACEBOOK_APP_ID --env production-social --body "VALUE"
gh secret set FACEBOOK_APP_SECRET --env production-social --body "VALUE"
gh secret set FACEBOOK_PAGE_ID --env production-social --body "VALUE"
gh secret set FACEBOOK_PAGE_ACCESS_TOKEN --env production-social --body "VALUE"
gh secret set LINKEDIN_CLIENT_ID --env production-social --body "VALUE"
gh secret set LINKEDIN_CLIENT_SECRET --env production-social --body "VALUE"
gh secret set LINKEDIN_ORG_ID --env production-social --body "VALUE"
gh secret set LINKEDIN_ACCESS_TOKEN --env production-social --body "VALUE"
