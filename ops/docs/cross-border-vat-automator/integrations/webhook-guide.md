# Webhook Integration — Cross-Border VAT Automator

## Setup
```bash
curl -X POST https://tiger-backend-production.up.railway.app/webhooks/cross-border-vat-automator -H "Content-Type: application/json" -d '{"event":"test"}'
```

## Events
- order.created
- payment.succeeded
- subscription.updated
