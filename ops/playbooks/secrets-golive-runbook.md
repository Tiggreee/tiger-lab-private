# Runbook — Secrets de go-live (publicación + cobro)

Guía operativa para desbloquear los dos flujos que hoy están en rojo: **publicación** en los
5 canales sociales y **cobro** real. Ningún valor va hardcodeado en el repo: todos se cargan
por entorno. Este documento solo lista **qué variable** va en **qué flujo** y **dónde obtenerla**.

## Dónde se cargan los secrets

- **Runtime del servidor (cobro + API):** variables de entorno del servicio en producción
  (Railway service env). Es el contexto que valida `production-trial-preflight` y el server.
- **Automatización / Actions (publicación):** GitHub Secrets del repo. Es el contexto que
  consumen los workflows y `check-social-ready` / `publish-social-pack`.
- Regla del proyecto (AGENTS.md): validar en el **runtime real**, no solo en el shell local.

## Modelo de dos niveles (Tier A / Tier B)

- **Tier A (`traffic:go-live`)**: mínimo crítico para publicar y cobrar.
- **Tier B (`traffic:ready`)**: ecosistema extendido.
- Nunca reportar "todo verde" si Tier B falla: se reporta "Tier A pass / Tier B fail".

---

## 1) COBRO (billing) — runtime del servidor

Requerido por `scripts/production-trial-preflight.mjs` (paso T4) y por los servicios de pago.

| Variable | Para qué | Dónde obtenerla |
|---|---|---|
| `STRIPE_SECRET_KEY` | Cobros con Stripe | Stripe Dashboard → Developers → API keys (Live) |
| `STRIPE_WEBHOOK_SECRET` | Verificación de webhooks Stripe | Stripe Dashboard → Developers → Webhooks → signing secret |
| `PAYPAL_CLIENT_ID` | Cobros con PayPal | PayPal Developer Dashboard → My Apps & Credentials (Live) |
| `PAYPAL_CLIENT_SECRET` | Cobros con PayPal | PayPal Developer Dashboard → My Apps & Credentials (Live) |
| `PAYPAL_MODE` | `live` en producción (no `sandbox`) | Valor fijo: `live` |
| `PAYPAL_WEBHOOK_ID` | Verificación de webhooks PayPal | PayPal Developer → app → Webhooks |
| `FACTURAMA_API_KEY` | Timbrado CFDI (factura fiscal) | Panel del proveedor CFDI (Facturama/Timbox) |
| `FACTURAMA_API_SECRET` | Timbrado CFDI | Panel del proveedor CFDI |
| `RESEND_API_KEY` | Envío de correos (recibos/onboarding) | Resend Dashboard → API Keys |

Redirects de checkout (deben ser URLs reales de producción, nunca `example.com`):
`STRIPE_RETURN_URL`, `STRIPE_CANCEL_URL`, `PAYPAL_RETURN_URL`, `PAYPAL_CANCEL_URL`.

UI (si aplica el checkout del front): `VITE_PAYPAL_CLIENT_ID` (build del `ui-host`).

**Verificación:**
```bash
node scripts/production-trial-preflight.mjs   # paso T4 debe pasar
node scripts/verify-systems.mjs               # Stripe/PayPal deben dejar de estar en WARN
```

---

## 2) PUBLICACIÓN — GitHub Secrets (los 5 canales)

Nombres exactos que exige `scripts/traffic/check-social-ready.mjs`. Hoy los 5 están BLOCKED (0 vars).

### LinkedIn (0/4)
| Variable | Dónde obtenerla |
|---|---|
| `LINKEDIN_CLIENT_ID` | LinkedIn Developers → tu app → Auth |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn Developers → tu app → Auth |
| `LINKEDIN_ORG_ID` | URN/ID de la página de empresa que va a publicar |
| `LINKEDIN_ACCESS_TOKEN` | Token OAuth con scope de publicación de la organización |

### X / Twitter (0/7)
| Variable | Dónde obtenerla |
|---|---|
| `X_API_KEY` | X Developer Portal → Keys and tokens |
| `X_API_SECRET` | X Developer Portal → Keys and tokens |
| `X_BEARER_TOKEN` | X Developer Portal → Bearer token |
| `X_CLIENT_ID` | X Developer Portal → OAuth 2.0 |
| `X_CLIENT_SECRET` | X Developer Portal → OAuth 2.0 |
| `X_ACCESS_TOKEN` | X Developer Portal → Access token del usuario que publica |
| `X_ACCESS_TOKEN_SECRET` | X Developer Portal → Access token secret |

### Facebook (0/4)
| Variable | Dónde obtenerla |
|---|---|
| `FACEBOOK_APP_ID` | Meta for Developers → tu app → Settings |
| `FACEBOOK_APP_SECRET` | Meta for Developers → tu app → Settings |
| `FACEBOOK_PAGE_ID` | ID de la página que publica |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Token de página con permisos de publicación |

### Telegram (0/2)
| Variable | Dónde obtenerla |
|---|---|
| `TELEGRAM_BOT_TOKEN` | @BotFather → token del bot |
| `TELEGRAM_CHAT_ID` | ID del canal/chat destino |

### Discord (0/4)
| Variable | Dónde obtenerla |
|---|---|
| `DISCORD_BOT_TOKEN` | Discord Developer Portal → Bot → Token |
| `DISCORD_APPLICATION_ID` | Discord Developer Portal → General Information |
| `DISCORD_PUBLIC_KEY` | Discord Developer Portal → General Information |
| `DISCORD_CHANNEL_ID` | ID del canal destino |

**Verificación:**
```bash
node scripts/traffic/check-social-ready.mjs    # cada canal debe pasar a READY
node scripts/validate-social-secrets.mjs       # validación de formato/presencia
```

---

## 3) LLM (opcional, activa contenido con IA real)

La capa LLM ya está integrada; sin key usa fallback determinista. Para activar generación real:

| Variable | Efecto |
|---|---|
| `ANTHROPIC_API_KEY` | Usa Anthropic (prioridad 1) |
| `OPENAI_API_KEY` | Usa OpenAI (prioridad 2) |
| `LLM_MODEL` | Override opcional del modelo |

**Verificación:**
```bash
node engine/campaigns/creative-agent.mjs --enhance --product "Docflow API" --segment contabilidad
# "LLM provider" debe dejar de decir "template" cuando la key está presente
```

---

## Orden recomendado

1. Cobro (Tier A): sin esto no hay ingreso. Setear billing en runtime → `production-trial-preflight` verde.
2. Publicación (Tier A): al menos 1 canal READY para empezar a distribuir.
3. LLM (Tier B): opcional, mejora calidad de copy.

## Guardrails que no se saltan

- Nunca provisionar antes de confirmar el pago.
- Requiere reconciliación (`billing:reconcile:strict`) antes de dar una venta por cerrada.
- Nunca usar valores de ejemplo ni `example.com` en URLs de producción.
- Regenerar un secret solo si no se puede ver/copiar o si está comprometido.
