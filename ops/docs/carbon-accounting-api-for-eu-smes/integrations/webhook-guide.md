# Webhook Integration — Carbon Accounting API for EU SMEs

## Setup
```bash
curl -X POST https://tiger-backend-production.up.railway.app/webhooks/carbon-accounting-api-for-eu-smes -H "Content-Type: application/json" -d '{"event":"test"}'
```

## Events
- order.created
- payment.succeeded
- subscription.updated
