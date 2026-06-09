# Backend Integrations Required (Production)

This project now enforces external backend integrations for critical business integrity paths.

## Required endpoints

1. Payment confirmation endpoint
- Env var: `PAYMENT_GATEWAY_CONFIRM_URL`
- Optional auth env var: `PAYMENT_GATEWAY_TOKEN`
- Request payload:
  - `paymentId` (string)
- Expected response:
  - HTTP 2xx for confirmed payment

2. PayPal checkout integration (optional)
- Env var: `PAYPAL_CLIENT_ID`
- Env var: `PAYPAL_CLIENT_SECRET`
- Env var: `PAYPAL_WEBHOOK_ID`
- Optional env var: `PAYPAL_MODE` (`sandbox` or `live`, default: `sandbox`)
- Optional env vars: `PAYPAL_RETURN_URL`, `PAYPAL_CANCEL_URL`
- `PAYPAL_RETURN_URL` should point to `/checkout/success` and `PAYPAL_CANCEL_URL` should point to `/checkout/cancel` on the deployed UI.
- When configured, the server can create PayPal checkout sessions and confirm PayPal order IDs as payments.
- Webhook endpoint: `POST /billing/webhooks/paypal`

3. Entitlements endpoint
- Env var: `ENTITLEMENT_API_URL`
- Optional auth env var: `ENTITLEMENT_API_TOKEN`
- Request payload:
  - `accountId` (string)
  - `productId` (string)
  - `planId` (string)
- Expected response:
  - HTTP 2xx for granted entitlements

3. Content publisher endpoint
- Env var: `CONTENT_PUBLISHER_API_URL`
- Optional auth env var: `CONTENT_PUBLISHER_API_TOKEN`
- Request payload:
  - `channel` (string)
  - `body` (string)
- Expected response:
  - HTTP 2xx for successful publication

4. Manual cash registration endpoint
- Env var: `MANUAL_CASH_API_URL`
- Optional auth env var: `MANUAL_CASH_API_TOKEN`
- Request payload:
  - `paymentId` (string)
  - `customerId` (string)
  - `productId` (string)
  - `planId` (string)
  - `amount` (number)
  - `currency` (string)
  - `evidenceUrl` (string)
- Expected response:
  - HTTP 2xx for registered pending cash payment

## Durable state files

The runtime now writes durable state to disk by default:
- `ops/runtime/runtime-state.json`
- `ops/runtime/funnel-events.jsonl`

Override locations:
- `RUNTIME_STATE_FILE`
- `FUNNEL_EVENTS_FILE`
- `IDEMPOTENCY_STORE_FILE`
- `RATE_LIMIT_STORE_FILE`

Rate limiting and idempotency defaults:
- Rate limit window: 60s (`WINDOW_MS` internal)
- API/web routes default limit: 60 requests/window
- Webhook routes default limit: 300 requests/window (`WEBHOOK_RATE_LIMIT_PER_WINDOW`)
- Idempotency TTL: 24h (file-backed cache)

Production auth hardening:
- `API_KEY_REGISTRY` is required in production mode.
- UI checkout key must be provided via `VITE_PUBLIC_API_KEY` in production mode.
- Development fallback key is allowed only in non-production environments.

## Go-live policy

Before live social publish, run:

```bash
npm run traffic:go-live -- --campaign "sprint-24h" --channels "linkedin,x,facebook,telegram,discord"
```

Live publish is blocked if:
- traffic destination is placeholder
- close channel destination/link is invalid
- required secrets are missing

Billing automation should be blocked if:
- webhook signature validation is not configured
- idempotency storage is unavailable
- reconciliation job is not scheduled

External enrichment apps are out of scope for the core billing system.
