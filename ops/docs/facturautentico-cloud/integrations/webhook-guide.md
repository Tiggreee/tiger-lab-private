# Webhook Integration — FacturAutentico Cloud

## Setup
```bash
curl -X POST https://tiger-backend-production.up.railway.app/webhooks/facturautentico-cloud -H "Content-Type: application/json" -d '{"event":"test"}'
```

## Events
- order.created
- payment.succeeded
- subscription.updated
