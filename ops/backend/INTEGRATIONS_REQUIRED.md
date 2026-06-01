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

2. Entitlements endpoint
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
