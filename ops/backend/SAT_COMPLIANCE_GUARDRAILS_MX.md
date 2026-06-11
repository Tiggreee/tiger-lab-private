# SAT Compliance Guardrails (MX)

## Purpose

Minimize operational and legal risk for billing automation while launching quickly.

## Important note

This document is an implementation guardrail, not legal advice.
Final fiscal/legal interpretation must be validated with certified accountant and legal counsel.

## Non-negotiable rules

1. No false guarantees
- Do not claim guaranteed SAT outcomes.
- Do not claim guaranteed zero errors.
- Do not claim guaranteed tax savings.

2. Payment before CFDI issuance
- Only issue CFDI after confirmed payment event.
- Keep idempotency control to prevent duplicate issuance.

3. Auditability
- Persist invoice evidence:
  - paymentId
  - customerId
  - CFDI UUID
  - XML/PDF references
  - issuedAt timestamp
  - delivery status

4. Recipient policy
- Buyer: mandatory invoice recipient.
- Seller: optional notification.
- Accountant: optional notification per account.

5. Controlled wording in product/campaign copy
- Use terms like "reduce risk", "improve control", "help automate".
- Avoid terms like "guaranteed", "always", "100% compliance".

## Minimal production checklist

- Facturama credentials set.
- Resend credentials set.
- API key registry scoped correctly.
- Checkout and webhook validation passing.
- Health endpoint returns no `down` status for:
  - `cfdiProvider`
  - `invoiceEmailDelivery`

## Escalation triggers

Escalate to human review immediately if:
- SAT/PAC rejection spikes.
- Duplicate CFDI detected.
- Delivery failures exceed threshold.
- Customer/legal complaint about invoicing claims.
