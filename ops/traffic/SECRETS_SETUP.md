# Social Secrets Setup (Server)

Use this checklist to configure production secrets without committing any credentials.

## 1) Local template
1. Copy `.env.example` to `.env` locally.
2. Replace every `CHANGE_ME` value with your real secret.

## 2) Server secret names
Set these exact names in your server secret manager:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `X_API_KEY`
- `X_API_SECRET`
- `X_BEARER_TOKEN`
- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`
- `DISCORD_BOT_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_CHANNEL_ID`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_PAGE_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_ORG_ID`
- `LINKEDIN_ACCESS_TOKEN`

## 3) Validation command
Run this before deploying automation:

```bash
npm run check:secrets:social
```

## 4) Combined guardrail (optional)
Use this to run generic + social secret checks:

```bash
npm run check:secrets:all
```

## 5) Security notes
- Never commit `.env` files.
- Rotate secrets if they were exposed in chat, logs, or screenshots.
- Prefer platform scopes with minimum permissions required for publishing.
