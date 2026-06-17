# Webhook Integration — Script Premium Kit

## Setup
```bash
curl -X POST https://tiger-lab-private-production.up.railway.app/webhooks/script-premium-kit -H "Content-Type: application/json" -d '{"event":"test"}'
```

## Events
- order.created
- payment.succeeded
- subscription.updated
