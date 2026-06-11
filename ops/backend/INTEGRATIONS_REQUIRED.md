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

2.1 CFDI timbrado provider (Mexico)
- Selected provider: Facturama (reliable non-premium baseline).
- Env var: `FACTURAMA_API_KEY`
- Env var: `FACTURAMA_API_SECRET`
- Optional env var: `FACTURAMA_API_BASE_URL`
- Optional env var: `INVOICE_PROVIDER` (`facturama` default, `manual` for fallback without provider access)
- Required operational policy:
  - Emit CFDI only after confirmed payment.
  - Preserve XML/PDF/UUID evidence with timestamp and customer reference.
  - Reconcile emitted CFDI against payment ledger daily.

2.2 Invoice email delivery
- Selected provider: Resend (reliable and low-friction baseline).
- Env var: `RESEND_API_KEY`
- Env var: `BILLING_FROM_EMAIL`
- Optional env var: `INVOICE_AUTOMATION_STRICT=true` (fail request when CFDI/email automation fails)
- Recipient policy:
  - Buyer email required.
  - Seller notification optional.
  - Accountant notification optional per customer/account configuration.

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

Optional shared persistence (recommended for high concurrency):
- `DATABASE_URL`
- `RUNTIME_STATE_BACKEND=postgres` (or auto when DATABASE_URL is present)
- `FUNNEL_EVENTS_BACKEND=postgres` (or auto when DATABASE_URL is present)

Rate limiting and idempotency defaults:
- Rate limit window: 60s (`WINDOW_MS` internal)
- API/web routes default limit: 60 requests/window
- Webhook routes default limit: 300 requests/window (`WEBHOOK_RATE_LIMIT_PER_WINDOW`)
- Idempotency TTL: 24h (file-backed cache)

Health probes:
- `HEALTHCHECK_ACTIVE_PROBES=true` enables active HTTP checks to configured integration URLs in production.
- `HEALTHCHECK_HTTP_TIMEOUT_MS` controls probe timeout (default: 2000ms).
- Health also checks provider readiness for:
  - `cfdiProvider` (Facturama credentials)
  - `invoiceEmailDelivery` (Resend + sender email)

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

Recommended reconciliation run:
- `npm run billing:reconcile` (daily operational report)
- `npm run billing:reconcile:strict` (non-zero exit when mismatches exist)
- `npm run invoice:pending` (list non-issued invoices for manual follow-up)

External enrichment apps are out of scope for the core billing system.
