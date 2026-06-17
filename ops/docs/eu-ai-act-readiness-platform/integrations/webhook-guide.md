# Webhook Integration — EU AI Act Readiness Platform

## Setup
```bash
curl -X POST https://tiger-lab-private-production.up.railway.app/webhooks/eu-ai-act-readiness-platform -H "Content-Type: application/json" -d '{"event":"test"}'
```

## Events
- order.created
- payment.succeeded
- subscription.updated
