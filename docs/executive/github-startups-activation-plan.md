# GitHub Startups Activation Plan

## Objetivo

Convertir el beneficio de GitHub for Startups en capacidad operativa real para TigerLab, sin inflar estado ni depender de features no cableadas.

## Regla base

- Todo gasto o activacion debe apuntar a `OBJ-01`: primer cliente pagado con flujo verificable.
- Nada de features premium solo por tener credito. Primero revenue path, luego expansion.

## Fase 1 — Verdades operativas

Duracion: 1 dia

1. Mantener `npm run prod:gate` como release truth source.
2. Ejecutar `npm run check:copilot:agents` en cada cambio de agentes.
3. Corregir cualquier claim en README que no tenga evidencia runtime.
4. Definir un owner humano para payments, deploy y lead engine.

## Fase 2 — Revenue path primero

Duracion: 2 a 3 dias

1. Confirmar secrets live de Stripe y PayPal en GitHub Secrets.
2. Verificar webhook IDs, return URLs y cancel URLs en backend.
3. Correr un pago E2E controlado con evidencia en `ops/runtime/`.
4. Confirmar reconciliacion antes de declarar venta cerrada.

## Fase 3 — GitHub platform bien usada

Duracion: 3 a 5 dias

1. Acciones: usar GitHub Actions para smoke, build, prod gate y deploy, no para procesos narrativos sin salida verificable.
2. Environments: separar `production` y `staging` con approvals para deploy.
3. Packages: publicar artefactos versionados solo para entregables reutilizables.
4. Issues + Projects: tablero unico de milestone `OBJ-01` con columnas `Blocked`, `Critical`, `Ready`, `Released`.
5. Dependabot + security alerts: tratar findings de dependencias como backlog de hardening, no como adorno.

## Fase 4 — Cableado MCP con ROI

Duracion: 1 semana

1. Memory MCP: mantenerlo solo si hay escritura/lectura real en flujo.
2. Fetch MCP: cablearlo a R&D solo si produce reportes guardados con fuente y fecha.
3. Sequential Thinking MCP: usarlo solo dentro del gate o auditoria, no como decoracion.
4. No activar mas MCP externos hasta que esos 3 tengan evidencia de uso real.

## Fase 5 — Uso de credito con disciplina

Presupuesto operativo recomendado del beneficio:

1. 35%: deploy, observabilidad, Railway, dominio, uptime y alertas.
2. 25%: billing readiness, PAC, webhooks y reconciliacion.
3. 20%: enriquecimiento de leads y fuentes de datos con retorno directo.
4. 10%: seguridad y supply chain.
5. 10%: buffer para incidentes o picos de ejecucion.

## KPIs de verdad

1. Primer pago real conciliado.
2. Tiempo de deploy con gate completo.
3. Numero de claims en README soportados por evidencia.
4. Conversion de lead a discovery call.
5. Conversion de discovery call a pago.

## Comandos obligatorios

```bash
npm run test:smoke
npm run build:server
npm run check:copilot:agents
npm run prod:gate
```

## Definicion de exito

El beneficio de Startups se considera bien aprovechado solo si deja:

1. Un checkout cobrando de verdad.
2. Un deploy verificable con gate limpio.
3. Un README sin ficcion operativa.
4. Un milestone `OBJ-01` con evidencia, no promesas.