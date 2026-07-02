# Webhook Integration — DevTools GDPR Middleware

## Setup
```bash
curl -X POST https://tiger-backend-production.up.railway.app/webhooks/devtools-gdpr-middleware -H "Content-Type: application/json" -d '{"event":"test"}'
```

## Events
- order.created
- payment.succeeded
- subscription.updated
