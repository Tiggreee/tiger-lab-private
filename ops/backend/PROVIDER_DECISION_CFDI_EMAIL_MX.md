# Provider Decision (MX): CFDI + Invoice Email

## Decision

Chosen baseline stack (reliable, non-premium):
- CFDI timbrado: Facturama
- Invoice email delivery: Resend

## Why this stack

1. Facturama
- Practical API-first adoption for SME launch.
- Lower operational friction for initial CFDI automation.
- Widely used in Mexico ecosystem.

2. Resend
- Simple transactional email API.
- Quick setup and stable delivery for low/medium volume.
- Good fit for first production phase without enterprise overhead.

## Scope boundaries

- This decision does not replace legal/tax advisory.
- Final SAT obligations must be confirmed with accountant/legal counsel.
- Commercial copy must avoid guarantees like "cero errores asegurado".

## Required env variables

- FACTURAMA_API_KEY
- FACTURAMA_API_SECRET
- FACTURAMA_API_BASE_URL (optional)
- RESEND_API_KEY
- BILLING_FROM_EMAIL

## Operational policy

- Emit CFDI only after confirmed payment.
- Store XML/PDF/UUID and timestamp as auditable evidence.
- Send invoice email to buyer by default.
- Send to seller/accountant only when explicitly configured.
- Keep daily reconciliation between payments and CFDI issuance.

## Future fallback (if scale/requirements change)

- CFDI: evaluate SW/Finkok alternatives.
- Email: evaluate AWS SES for cost optimization at high volume.
