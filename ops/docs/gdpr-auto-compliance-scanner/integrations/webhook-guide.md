# Webhook Integration — GDPR Auto-Compliance Scanner

## Setup
```bash
curl -X POST https://tiger-backend-production.up.railway.app/webhooks/gdpr-auto-compliance-scanner -H "Content-Type: application/json" -d '{"event":"test"}'
```

## Events
- order.created
- payment.succeeded
- subscription.updated
