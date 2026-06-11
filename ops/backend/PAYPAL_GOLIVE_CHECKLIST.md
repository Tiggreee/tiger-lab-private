# PayPal Go-Live Checklist (Backend + UI)

## 1) Variables obligatorias en produccion

Backend:
- NODE_ENV=production
- API_KEY_REGISTRY (JSON valido)
- PAYMENT_GATEWAY_CONFIRM_URL
- ENTITLEMENT_API_URL
- CONTENT_PUBLISHER_API_URL
- PAYPAL_CLIENT_ID
- PAYPAL_CLIENT_SECRET
- PAYPAL_WEBHOOK_ID
- PAYPAL_RETURN_URL
- PAYPAL_CANCEL_URL

UI host:
- VITE_API_BASE_URL
- VITE_PUBLIC_API_KEY
- VITE_PAYPAL_CLIENT_ID

Opcionales recomendadas:
- PAYPAL_MODE=live
- PAYPAL_HTTP_TIMEOUT_MS=10000
- HEALTHCHECK_ACTIVE_PROBES=true
- HEALTHCHECK_HTTP_TIMEOUT_MS=2000
- DATABASE_URL
- RUNTIME_STATE_BACKEND=postgres
- FUNNEL_EVENTS_BACKEND=postgres

## 2) API_KEY_REGISTRY minimo recomendado

Debe incluir al menos una llave publica para checkout con estos scopes:
- billing:checkout
- billing:register

Ejemplo de forma:
{
  "public-web-key-prod": {
    "channel": "web",
    "scopes": ["health:read", "billing:checkout", "billing:register"]
  }
}

## 3) Smoke pre-go-live (local CI)

Desde raiz del repo:
- npm run build:server
- npm run test:smoke
- npm run prod:gate:strict
- cd ui-host && npm run build

Criterio de pase:
- Todos los comandos en exit 0.

## 4) Smoke live (entorno desplegado)

Ajusta BASE_URL y API key publica:

A) Health
curl -i "${BASE_URL}/health" -H "x-api-key: ${PUBLIC_API_KEY}"

Esperado:
- status 200
- body.status = ok o degraded (degraded solo permitido si dependencia no critica fuera de alcance)
- paypalConfig.status = up cuando checkout PayPal esta habilitado

B) Crear sesion checkout
curl -i -X POST "${BASE_URL}/billing/checkout/session" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${PUBLIC_API_KEY}" \
  -d '{
    "productId":"facturautentico-cloud",
    "planId":"starter",
    "amount":39,
    "currency":"USD",
    "returnUrl":"https://tu-ui/#/checkout/success",
    "cancelUrl":"https://tu-ui/#/checkout/cancel"
  }'

Esperado:
- status 200
- result.sessionId y result.approvalUrl presentes

C) Prueba de webhook (sandbox o live segun entorno)
- Dispara evento PAYMENT.CAPTURE.COMPLETED desde PayPal Developer Dashboard.
- Verifica que endpoint /billing/webhooks/paypal responde 200 con firma valida.

Esperado:
- Se registra pago y no hay duplicados por idempotencia.

## 5) Criterios de bloqueo (NO GO)

- Falta VITE_PUBLIC_API_KEY en UI de produccion.
- Falta VITE_PAYPAL_CLIENT_ID en UI de produccion.
- API_KEY_REGISTRY invalido o sin scopes billing:checkout/billing:register.
- PAYPAL_RETURN_URL o PAYPAL_CANCEL_URL con example.com.
- /billing/checkout/session sin sessionId o approvalUrl.
- Webhook PayPal con firma invalida o sin PAYPAL_WEBHOOK_ID.

## 6) Post go-live (primeras 24h)

- Monitorear 401 en /billing/checkout/session y /register-payment.
- Monitorear timeouts hacia PayPal.
- Monitorear tasa de errores webhook PayPal.
- Revisar runtime persistence (archivo o postgres) y funnel events.
