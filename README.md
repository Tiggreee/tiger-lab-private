# Plataforma Autonoma de Monetizacion y Operacion

Sistema modular y autonomo para crear, operar y escalar productos digitales con intervencion humana minima. Incluye motores de producto, contenido, leads, pricing, funnels, bots y automatizaciones, orquestados por un EventBus interno.

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
