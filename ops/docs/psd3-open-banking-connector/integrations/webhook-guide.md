# Webhook Integration — PSD3 Open Banking Connector

## Setup
```bash
curl -X POST https://tiger-lab-private-production.up.railway.app/webhooks/psd3-open-banking-connector -H "Content-Type: application/json" -d '{"event":"test"}'
```

## Events
- order.created
- payment.succeeded
- subscription.updated
