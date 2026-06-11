# Production Deployment Readiness

This checklist is the minimum required to move the repo from lab mode into production-ready deployment.

## Build and validation
- [ ] Run `npm install` at repo root.
- [ ] Run `npm run test:all`.
- [ ] Run `npm run build:server`.
- [ ] Run `cd ui-host && npm ci && npm run build`.
- [ ] Confirm `npm run check:secrets` passes in CI.

## Runtime entrypoint
- `server/copilot-server.mjs` remains the local stub server for legacy local mode.
- Use `npm run server:start` to start the production backend entrypoint at `server/start-server.ts`.
- Confirm `/health` returns `200` after `npm run server:start`.

## Required production secrets
- `PAYMENT_GATEWAY_CONFIRM_URL`
- `PAYMENT_GATEWAY_TOKEN` (optional)
- `ENTITLEMENT_API_URL`
- `ENTITLEMENT_API_TOKEN` (optional)
- `CONTENT_PUBLISHER_API_URL`
- `CONTENT_PUBLISHER_API_TOKEN` (optional)
- `MANUAL_CASH_API_URL`
- `MANUAL_CASH_API_TOKEN` (optional)

## PayPal production billing secrets
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_MODE` (`sandbox` or `live`, default: `sandbox`)
- `PAYPAL_RETURN_URL` (should resolve to `/checkout/success` in the deployed UI)
- `PAYPAL_CANCEL_URL` (should resolve to `/checkout/cancel` in the deployed UI)
- `PAYPAL_WEBHOOK_URL` is not required as an env var, but register the webhook in PayPal as `POST <live-url>/billing/webhooks/paypal`

## GitHub environment setup
- Create `production-social` for social publishing.
- Create `production-billing` for backend billing secrets.
- Add provider secrets to `production-billing` before live deploy.

## Target platform decision
Choose one deploy target and provide the details:
- Railway / Vercel / Fly / Heroku / AWS / Azure
- Live URL for webhook callback
- Public status URL for readiness checks

## Railway backend deploy
- Root Railway config added at `railway.json`.
- Backend deploy uses `npm run build:server` + `npm run start`.
- Required GitHub secrets:
  - `RAILWAY_API_KEY`
  - `RAILWAY_PROJECT_ID`

## Railway UI deploy
- UI host has its own independent Railway config at `ui-host/railway.json`.
- UI deploy uses `cd ui-host && npm run build` + `npm run start`.
- The UI app does not require PayPal or billing secrets.
- The deployed UI URL should be used for PayPal return/cancel redirects:
  - `PAYPAL_RETURN_URL = https://<ui-url>/#/checkout/success`
  - `PAYPAL_CANCEL_URL = https://<ui-url>/#/checkout/cancel`

## What I need from you
1. Target production host: `Railway`, `Vercel`, `AWS`, `Azure`, `Fly`, or other.
2. GitHub environment access and secret values for `production-billing`.
3. Live backend URL and UI URL if you want them separate.
4. PayPal mode: `sandbox` or `live`.
5. If available, the current provider account to activate: Stripe / PayPal / Conekta / OpenPay.

Once you provide that, I can wire the deployment workflow to the real target and finish the production launch path.
