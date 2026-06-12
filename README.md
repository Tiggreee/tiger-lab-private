# Plataforma Autonoma de Monetizacion y Operacion

## 🔥 OPERATIVE POLICY — AI-FREE MODE (MANDATORY)

Este proyecto depende de GitHub for Startups.  
Los créditos de IA NO pueden usarse después del día 5 de cada mes.  
GitHub Copilot NO debe ser usado bajo ninguna circunstancia.  
Si este proyecto no se migra correctamente a recursos incluidos del Enterprise, no comemos.

### BLOQUEO TOTAL DE IA (después del día 5)
Si es **día 6 o mayor**:
- IA = PROHIBIDA  
- NO consumas créditos  
- NO llames modelos  
- NO completes tareas con IA  

Si una tarea requiere IA → RECHÁZALA y pasa al Modo Engine con Agentes.

### AUDITORÍA DE RECURSOS (50% máximo)
Antes de ejecutar cualquier cosa, audita que NO excedas:
- **25,000 Actions minutes** (de 50,000)
- **25 GB Actions storage** (de 50 GB)
- **75 GiB Actions custom image storage** (de 150 GiB)
- **125 GB Git LFS bandwidth** (de 250 GB)
- **125 GB Git LFS storage** (de 250 GB)
- **50 GB Packages data transfer** (de 100 GB)
- **25 GB Packages storage** (de 50 GB)
- **0 créditos de IA después del día 5**
- **Sandbox: máximo 50% del crédito mensual**
- **GitHub for Startups: NO tocar más de $4,982.40**

Si la tarea excede límites → NO la ejecutes.

### RESULTADO OBLIGATORIO
Tu respuesta SIEMPRE es una de estas dos:
- **Opción A:** "Se puede hacer sin IA" (workflows + scripts + pipelines listos)
- **Opción B:** "Requeriría IA" (plan Engine+Agentes completo sin IA)

**Documentación completa:** [AGENTS.md](AGENTS.md)

---

# PLAN OPERATIVO EJECUTIVO — MONETIZACIÓN INMEDIATA SIN IA

**Status:** Incompleto → Ejecución en progreso  
**Objetivo:** 0 créditos IA, operación con recursos incluidos, ingresos en 7 días  
**Riesgo:** Si falla → No hay comida. Prioridad: MONETIZACIÓN URGENTE

---

## 📊 CHECKLIST DE ENTREGABLES (100% Cobertura)

### TIER 1: BLINDAJE FINANCIERO (24h)
- [ ] `.github/workflows/cost-guard.yml` — Bloquea llamadas IA, detecta riesgo gasto
- [ ] `scripts/cost-guard.sh` — Auditoría local antes de push
- [ ] `.github/instructions/no-ai-hardening.md` — Guardrails automáticos
- [ ] `ops/runtime/budget-tracker.json` — Tracking diario de costos

### TIER 2: ESTRUCTURA MODULAR (48h)
```
runtime/          → runtime core + event bus + diagnostics
├── events/       → event definitions y handlers
├── diagnostics/  → health checks, alertas
└── metrics/      → KPIs tracking

pipelines/        → flujos de venta y entrega
├── sales/        → lead → demo → cierre
├── delivery/     → onboarding → activación
└── retention/    → expansion revenue, churn mitigation

simulators/       → validación sin IA
├── traffic/      → simula demanda
├── conversion/   → modela tasas
└── revenue/      → proyecta ingresos

playbooks/        → automatización operativa
├── sales/        → outreach, follow-up
├── demo/         → asset generation sin IA
└── support/      → onboarding scripts

hardening/        → compliance + governance
├── audit/        → logs y trazabilidad
├── policy/       → cumplimiento regulatorio
└── escalation/   → alertas críticas

connectors/       → integraciones sin IA
├── stripe/       → pagos
├── github/       → releases
└── email/        → notifications

tasks/            → jobs y triggers
├── scheduled/    → diarios/semanales
├── event-driven/ → webhooks
└── manual/       → CLI commands

watchers/         → monitoreo continuo
├── revenue/      → MRR, ARR tracking
├── churn/        → early warning
└── conversion/   → funnel metrics

agents/           → definiciones de agentes
├── sales-agent.md
├── delivery-agent.md
└── support-agent.md

logs/             → auditoría y debugging
storage/          → archivos, backups
api/              → endpoints + docs
ui/               → dashboard + control
```

### TIER 3: AUTOMATIZACIÓN COMERCIAL (Semana 1)
- [ ] `.github/workflows/build-and-package.yml` → Productos vendibles en Packages
- [ ] `.github/workflows/sales-demo-autogen.yml` → Assets de demostración
- [ ] `.github/workflows/customer-onboarding.yml` → Setup automático por cliente
- [ ] `.github/workflows/smoke-and-release.yml` → Validación antes de vender

### TIER 4: SCRIPTS DE MONETIZACIÓN (7 días)
- [ ] `scripts/cost-guard.sh` → Auditoría local de gastos
- [ ] `scripts/generate-offers.mjs` → Crea ofertas por vertical
- [ ] `scripts/build-commercial-bundle.mjs` → Empaqueta para vender
- [ ] `scripts/onboard-customer.mjs` → Provisiona nuevo cliente en 30min
- [ ] `scripts/revenue-daily-report.mjs` → Dashboard diario (demos, cierres, MRR)

---

## 💰 3 CARRILES DE MONETIZACIÓN (Urgentes)

### CARRIL 1: Venta Rápida (Días 1-7) — Target: $500-2K
**Qué:** Vende acceso a templates + scripts como paquetes ejecutables  
**A quién:** PyMES que necesitan facturación, automatización, leads  
**Canales:** LinkedIn directo + WhatsApp + email outreach + grupos FB contadores  
**Tasa:** 2-5% de conversión = 20 leads × 2.5% = 0.5 cierres × $1K ticket = $500+/semana  

**Automatización:**
```bash
# Genera oferta personalizada
npm run generate-offers -- facturacion-simplificada pyme-mx $999
# Envía outreach automático
npm run sales-outreach -- target-segment leads-linkedin 50
# Registra conversiones
npm run revenue:track -- demo-enviada conversion tasa
```

### CARRIL 2: Entrega Continua (Semana 2-3) — Target: $1K-5K
**Qué:** Empaqueta bundles vendibles en GitHub Packages + setup automático  
**A quién:** Clientes que compraron en Carril 1  
**Canales:** Activación en 48h, onboarding en 1 semana  
**Tasa:** 80% activación × $999 = $800 por cliente × 5 clientes = $4K  

**Automatización:**
```bash
# Crea bundle comercial
npm run build-commercial-bundle -- customer-1 facturacion-pro v1.0
# Publica en Packages (gratis)
npm run packages:publish -- @vmdev/facturacion-pro-customer1 v1.0
# Provisiona cliente
npm run onboard-customer -- customer-1 facturacion-pro -- admin-user -- webhook-url
```

### CARRIL 3: Expansión (Semana 3-8) — Target: $2K-10K MRR
**Qué:** Upsells + verticales nuevas + referidos  
**A quién:** Clientes activos + casos de éxito que comparten  
**Canales:** Casos de éxito en LinkedIn, referidos, expansión de features  
**Tasa:** 30% churn, 40% expansion = $999 × 5 clientes × 0.4 expansion = $2K/mes recurrente  

**Automatización:**
```bash
# Dashboard de salud
npm run revenue:dashboard -- active-customers expansion-opportunities churn-risk
# Identifica upsell
npm run expansion:identify -- customer-usage tresholds
# Automatiza follow-up
npm run sales:expansion-campaign -- active-customers 2-month-checkup
```

---

## 🔥 COMANDOS DE EJECUCIÓN INMEDIATA

### Hoy (Setup)
```bash
# 1. Bloquea gastos
npm run cost-guard:audit
# 2. Crea estructura
npm run setup:folders -- runtime pipelines simulators playbooks hardening connectors tasks watchers agents logs storage api ui
# 3. Genera primer paquete
npm run generate-offers -- facturacion-simplificada pyme-mx $999
```

### Semana 1 (Venta)
```bash
# Lanzamiento de sales
npm run sales:outreach -- linkedin 50
npm run sales:outreach -- whatsapp 20
npm run sales:track -- daily
```

### Semana 2 (Entrega)
```bash
# Setup de primer cliente
npm run onboard-customer -- customer-demo facturacion-pro
npm run packages:publish -- @vmdev/facturacion-pro-demo v1.0
npm run revenue:track -- customer-activated revenue-recognized
```

### Diario (Operación)
```bash
npm run revenue:daily-report  # Ver demos, cierres, MRR
npm run cost-guard:check      # Verificar gastos
npm run expansion:identify    # Oportunidades de upsell
```

---

## 📈 KPIs DE NEGOCIO A TRACKEAR DIARIO

| KPI | Target | Semana 1 | Semana 2 | Semana 3 |
|-----|--------|----------|----------|----------|
| **Leads generados** | 100+ | 20 | 30 | 50 |
| **Demos enviadas** | 50+ | 5 | 10 | 15 |
| **Cierres** | 10+ | 1 | 3 | 5 |
| **Revenue** | $10K | $1K | $3K | $6K |
| **Clientes activos** | - | 1 | 4 | 9 |
| **Costo por lead** | <$10 | $0 | $0 | $0 |
| **Conversión lead→demo** | >20% | 25% | 33% | 30% |
| **Conversión demo→cierre** | >50% | 20% | 30% | 33% |

**Dashboard automático:**
```bash
npm run revenue:dashboard -- today
# Output: demos=5, cierres=1, revenue=$999, cost=$0, health=🟢
```

---

## ⚠️ GUARDRAILS (No Tocar)

- ❌ NO usar IA después del día 5
- ❌ NO exceder 25,000 Actions min/mes
- ❌ NO tocar GitHub Copilot
- ✅ Solo recursos Enterprise incluidos
- ✅ Solo deterministic automation
- ✅ Solo monetización real

**Auditoría automática antes de cada push:**
```bash
git push
# → Trigger: .github/workflows/cost-guard.yml
# → Check: ¿Hay llamadas IA? ¿Excede límites?
# → Resultado: 🟢 PASS o 🔴 FAIL (bloquea push)
```

---

## 📋 CHECKLIST DIARIO DE OPERADOR

```bash
1. npm run cost-guard:check           # ¿Gastos en 0?
2. npm run revenue:daily-report       # ¿Demos y cierres?
3. npm run sales:outreach -- daily    # ¿Leads nuevos?
4. npm run expansion:identify         # ¿Oportunidades de upsell?
5. npm run build-and-package:latest   # ¿Bundler listo?
```

---

Dashboard en GitHub Pages: https://tiggreee.github.io/tiger-lab-private/#/dashboard

Sistema modular y autonomo para crear, operar y escalar productos digitales con intervencion humana minima. Incluye motores de producto, contenido, leads, pricing, funnels, bots y automatizaciones, orquestados por un EventBus interno.

## 🚀 Abrir Dashboard (UI Local)

**Opción 1: Automático (recomendado)**
1. Abre la carpeta `tiger-lab-private` en VS Code
2. Acepta permisos para ejecutar tareas automáticas
3. Backend y UI arrancan solos en ~30 segundos
4. Abre http://localhost:5177/ en el navegador

**Opción 2: Manual**
```bash
# Terminal 1: Backend API
npm run server:start

# Terminal 2: UI (en otra pestaña)
npm --prefix ui-host run dev
```

**Desde celular en la red local:**
- http://192.168.100.153:5177/ (reemplaza IP según tu red)

**Desbloquea con:**
- GitHub CLI (`gh auth status` debe estar listo)
- O genera QR

---

## Estado actual
- Avance total estimado: 92%.
- Motores: completos.
- Hardening: completo.
- Simuladores: completos.
- Playbooks: completos.
- Documentacion interna: completa.
- Runtime: completo.
- CI/CD: configurado.
- UI: base lista, falta wiring completo al backend.

## Arquitectura
- Motores independientes por dominio.
- EventBus central para flujos de extremo a extremo.
- Runtime de hardening con diagnosticos, simuladores, metricas, dashboards JSON y alertas.
- Capa CLI operativa.
- UI opcional como capa de control.

## Caracteristicas principales
- Generacion automatica de productos.
- Generacion automatica de contenido.
- Captura y gestion de leads.
- Pricing dinamico.
- Construccion y optimizacion de funnels.
- Automatizaciones basadas en eventos.
- Bots operativos.
- Simuladores de trafico y carga.
- Dashboards JSON.
- Alertas operativas.
- Diagnosticos automaticos.

## Requisitos
- Node.js 20 o superior.
- Entorno local.

## Quick Start
1. Instalar dependencias:
```bash
npm install
```
2. Ejecutar pruebas base:
```bash
npm run test
```
3. Ejecutar suite completa:
```bash
npm run test:all
```
4. Levantar Command Center:
```bash
npm run command-center:start
```

## Comandos operativos principales
```bash
npm run generate-product -- facturautentico-cloud saas
npm run generate-content -- facturautentico-cloud post web
npm run publish-content -- asset-facturautentico-cloud web
npm run capture-lead -- lead-demo-1 web
npm run provision-product -- customer-demo-1 facturautentico-cloud starter
npm run analyze-monetization -- facturautentico-cloud pro
npm run command-center:summary
npm run pipeline:summary
npm run supervisor:sync:example
```

## Build y validacion
```bash
npm run test:all
npm pack
```

## Flujo Git recomendado (regla practica)

Para balancear velocidad de desarrollo y control comercial:

1. Desarrollo diario (feature + PR)
```bash
npm run git:start:feature -- mejorar-funnel-cierre
```

2. Hotfix urgente (impacto en ingresos/operacion)
```bash
npm run git:start:hotfix -- fix-payment-timeout
```

3. Cierre semanal / release
```bash
npm run git:weekly:check
```

Guia completa: `ops/process/GIT_RULE_PRACTICA.md`.

## LinkedIn-first launch (same day)

When speed and cash priority are critical, run a single-channel launch using LinkedIn only.

```bash
npm run traffic:pack -- --topic "Sistema autonomo para capturar leads" --audience "founders SMB" --offer "diagnostico de 15 min" --campaign "linkedin-today" --baseLink "https://tu-landing-real.com" --closeChannel "calendar" --closeDestination "https://cal.com/tu-enlace"
npm run traffic:go-live -- --campaign "linkedin-today" --channels "linkedin"
npm run traffic:publish:dry -- --campaign "linkedin-today" --channels "linkedin"
npm run traffic:publish -- --campaign "linkedin-today" --channels "linkedin"
```

Execution playbook: `ops/process/LINKEDIN_LAUNCH_TODAY_8H.md`.

## Daily autonomous loop (1 hour)

```bash
npm run revenue:daily
npm run traffic:sla
npm run command-center:summary
npm run pipeline:summary
```

Guide: `ops/process/AUTONOMOUS_OPERATION_1H_DAILY.md`.

## Modo autonomo continuo
Este sistema puede operar sin UI y con intervencion humana minima mediante un ciclo periodico (hora/dia/semana):

1. Generar productos.
2. Generar contenido.
3. Crear leads.
4. Calcular pricing.
5. Construir funnels.
6. Ejecutar automatizaciones.
7. Ejecutar bots.
8. Registrar metricas.
9. Emitir alertas.
10. Ejecutar diagnosticos.

Referencia extendida del ciclo: `docs/internal/DOCUMENTO_MAESTRO.md`.

## Pendientes criticos para activar monetizacion
Resumen operativo:
- Wiring completo de UI al backend.
- Validacion completa del flujo extremo a extremo.
- Pruebas de estres y pruebas de demo con comandos oficiales.
- Cierre final: congelar version, generar build, preparar demo/pitch/pricing/onboarding.

Checklist completo: `docs/internal/PENDIENTES_CRITICOS_ACTIVACION.md`.

## Areas clave del repositorio
- `src/`: motores y runtime.
- `server/`: contratos HTTP, controladores, middleware y rutas.
- `scripts/`: adaptadores CLI y utilidades operativas.
- `ops/`: catalogos, eventos, simulacion y tableros.
- `docs/internal/`: guias de ejecucion, playbooks y contexto maestro.
- `.github/workflows/`: pipelines de validacion y automatizacion.

## Seguridad y publicacion
- No incluir secretos, tokens, credenciales ni datos sensibles en commits.
- Ejecutar verificaciones tecnicas antes de cada release:
```bash
npm run ci:local
```

<!-- AUTO:README:START -->
## Estado Automático
- Repo: .
- Ultima actualización: 2026-06-10T09:52:57.921Z
- Node engine: >=20
- Scripts operativos: 57
- Prod gate: GO (PASS 11 | WARN 0 | FAIL 0)
- Nota: este bloque se genera con scripts/update-readme.mjs y puede regenerarse sin afectar secciones manuales.
<!-- AUTO:README:END -->
