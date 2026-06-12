# TigerLab — Motor Autónomo de Monetización y Operación

**Versión única.** No más forks, no más ramas de features. Esto es lo que hay.

## Estado Actual

| Indicador | Status | Detalle |
|-----------|--------|---------|
| Engine LED | 🟢 VERDE | Gate GO, 68 empresas cargadas en DB |
| Implementación | 98% | 51 scripts, 1 juguete (lead-intelligence obsoleto) |
| Conexiones reales | 37% | 14/51 scripts con APIs o DB externas |
| DB Leads | 68 empresas | Seed DENUE + OSM, Oracle-compatible SQL |
| Monetización potencial | $840/mo | 10 planes, 5 productos (2 activos, 2 paused, 1 planned) |
| Monetización real | $0 | Stripe/PayPal keys no configuradas |

## Database (Oracle-compatible)

Base de datos SQL relacional en `ops/database/leads.db` con schema estándar SQL exportable a Oracle SQL Developer.

```bash
# Cargar seed data (68 empresas reales MX)
node scripts/lead-engine.mjs --mode seed

# Enriquecer con OpenStreetMap (1 req/s, gratis)
node scripts/lead-engine.mjs --mode enrich

# Exportar a CSV (importable a Oracle)
node scripts/lead-engine.mjs --mode export

# Importar en Oracle SQL Developer:
# 1. Abrir ops/database/oracle-import-ddl.sql
# 2. Crear tablas
# 3. Importar CSVs desde ops/database/exports/
```

## Dashboard

```bash
# Iniciar Command Center
npm run command-center:start
# Abrir http://localhost:4310
```

## Pendientes (ordenados por importancia)

### P0 — Imprescindible para generar ingresos
- [ ] **Configurar Stripe live keys** en GitHub Secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- [ ] **Configurar PayPal live keys** (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`)
- [ ] **Contratar PAC Finkok** ($99/mes) — desbloquea FacturAutentico Cloud + FacturAutentica
- [ ] **Book 3 discovery calls** con leads del pipeline
- [ ] **Cerrar primer sprint pagado** (Docflow API o Script Premium Kit)

### P1 — Crecimiento
- [ ] **Agregar Google Maps API key** en GitHub Secrets → enriquecimiento automático de leads
- [ ] **Agregar tokens sociales** (LinkedIn, X, Facebook, Telegram, Discord) → publicar 25 landings
- [ ] **Ejecutar lead-engine semanal** → mantener DB actualizada
- [ ] **Comparar Apollo.io vs fuentes gratuitas** → decisión basada en datos

### P2 — Optimización
- [ ] **Reemplazar lead-intelligence.mjs** con lead-engine.mjs (obsoleto)
- [ ] **Automatizar lead-engine en GitHub Actions** (corrida semanal)
- [ ] **Dashboard: panel de créditos GitHub** (consumo vs límite)

## Arquitectura

```
scripts/lead-engine.mjs       → DB SQLite + OSM + Google Maps
scripts/implementation-tracker.mjs → monitorea todo
scripts/verify-systems.mjs    → 25 checks PASS/WARN/FAIL
scripts/serve-command-center.mjs → dashboard en :4310
ops/database/                  → DB + schema + exports
ops/runtime/                   → reports + dashboard data
```

## Comandos principales

```bash
npm run command-center:start  # Dashboard
npm run test:smoke           # Smoke tests
npm run prod:gate            # Production gate check
node scripts/lead-engine.mjs --mode seed   # Cargar leads
node scripts/lead-engine.mjs --mode enrich # Enriquecer
node scripts/lead-engine.mjs --mode export # Exportar CSV
```

## AI-Free Mode (Mandatory)

No IA después del día 5 del mes. No GitHub Copilot. Solo recursos GitHub Enterprise incluidos.
Límites: 25,000 Actions min/mes | $2,491.20 startups budget/mes (50% de $4,982.40).
