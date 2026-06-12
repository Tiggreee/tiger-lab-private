# TIGER LAB — CHECKLIST IMPRIMIBLE
## Pendientes priorizados | Fecha: 12 junio 2026

---

## P0 — IMPRESCINDIBLE PARA GENERAR INGRESOS (TÚ)

- [ ] **PL-001** Configurar Stripe live keys en GitHub Secrets
  > Ir a GitHub → Settings → Secrets → Actions
  > Agregar: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  > Bloqueado: No tengo las API keys

- [ ] **PL-002** Configurar PayPal live keys en GitHub Secrets
  > Agregar: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
  > Cuenta business: tiggreee@vmdev.lat
  > Bloqueado: No tengo las API keys

- [ ] **PL-005** Contratar PAC Finkok ($99/mes)
  > Desbloquea: FacturAutentico Cloud (56→84) + FacturAutentica (56→84)
  > Crear cuenta sandbox, obtener API key
  > Bloqueado: Victor contrata Finkok

- [ ] **PL-006** Book 3 discovery calls con leads del pipeline (68 empresas)
  > Usar one-pager. Ofrecer diagnóstico 15 min.
  > Bloqueado: Victor hace las llamadas

- [ ] **PL-009** Cerrar primer sprint pagado (Docflow API o Script Premium Kit)
  > Bloqueado: Discovery calls → propuesta → cierre

---

## P0 — IMPRESCINDIBLE (AI/YO)

- [x] ~~PL-003 Publicar LinkedIn post (Docflow API + Script Kit)~~ ✅ DONE
  > Contenido generado. Falta LINKEDIN_ACCESS_TOKEN (tú configuras)

- [x] ~~PL-004 Mensajes outbound a prospects ICP~~ ✅ DONE
  > 10 leads + 10 mensajes listos. Envío manual por LinkedIn DM (tú)

- [x] ~~PL-007 publish-packages.yml dry-run~~ ✅ DONE
- [x] ~~PL-008 daily-sales-automation pipeline~~ ✅ DONE
- [x] ~~PL-011 Social pack semanal~~ ✅ DONE

---

## P1 — CRECIMIENTO (TÚ)

- [ ] **PL-010** Activar PAC Finkok para desbloquear facturación (si ya contrataste)
- [ ] Agregar Google Maps API key en GitHub Secrets
  → Enriquecimiento automático de leads
- [ ] Agregar tokens sociales (LinkedIn, X, FB, Telegram, Discord)
  → 25 landings publicadas automáticamente

---

## P1 — CRECIMIENTO (AI/YO)

- [ ] Ejecutar lead-engine semanal → mantener DB actualizada
- [ ] Comparar Apollo.io vs fuentes gratuitas → decisión basada en datos

---

## P2 — OPTIMIZACIÓN (AI/YO)

- [ ] Reemplazar lead-intelligence.mjs con lead-engine.mjs
- [ ] Automatizar lead-engine en GitHub Actions (corrida semanal)
- [ ] Dashboard: panel de créditos GitHub (consumo vs límite)

---

## MÉTRICAS ACTUALES

| Indicador | Valor | Estado |
|---|---|---|
| Tests | 36/36 pass | ✅ |
| TypeScript | 0 errors | ✅ |
| Gate | 14/14 PASS, GO | ✅ |
| Railway ui-host | LIVE | ✅ |
| Railway tiger-backend | LIVE | ✅ |
| Product Engine avg | 64/100 | 🔴 < 70 |
| Leads en DB | 68 empresas | ✅ |
| Implementation | 98% | ✅ |
| GitHub Credits | 0% usado de $4,982.40 | ✅ |

---

## INSTRUCCIONES RÁPIDAS

```
# Dashboard local
npm run command-center

# Tests
npm test
npm run test:smoke

# TypeScript
npm run build:server

# Gate
npm run prod:gate

# Lead engine
node scripts/lead-engine.mjs --mode seed
node scripts/lead-engine.mjs --mode enrich
node scripts/lead-engine.mjs --mode export

# Product engine
npm run prod:engine
```
