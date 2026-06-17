# Webhook Integration — Docflow API

## Setup
```bash
curl -X POST https://tiger-lab-private-production.up.railway.app/webhooks/docflow-api -H "Content-Type: application/json" -d '{"event":"test"}'
```

## Events
- order.created
- payment.succeeded
- subscription.updated
