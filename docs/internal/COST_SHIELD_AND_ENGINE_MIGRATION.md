# VMDEV Engine: Blindaje de Costos y Ruta de Migracion Sin IA

Fecha: 2026-06-12
Objetivo: operar con costo cero variable, sin consumo de IA pagada, usando solo recursos Enterprise incluidos.

## 1. Prioridad Cero: Blindar la Tarjeta Hoy

Meta: evitar cualquier cargo inesperado antes de seguir construyendo.

Paso A. Poner limite de gasto en 0
1. Entra a Billing del proveedor que estes usando para IA/API.
2. Busca Spending limit o Budget cap.
3. Configura Hard limit en 0 o en el minimo posible.
4. Activa alertas al 50%, 80% y 100%.

Paso B. Apagar servicios de cobro por uso
1. Deshabilita API keys activas.
2. Revoca tokens no usados.
3. Apaga cualquier workflow que llame LLM externos.
4. Elimina variables de entorno de proveedores IA en org y repo.

Paso C. Confirmar estado real de cobro
1. Revisa Current cycle spend.
2. Exporta invoice o usage report.
3. Guarda captura y fecha como evidencia interna.

Resultado esperado:
- Riesgo de cargo nuevo: minimizado.
- Operacion continua: solo con recursos incluidos.

## 2. Politica Operativa del Proyecto

Regla 1: IA pagada prohibida en runtime.
Regla 2: Si una tarea exige IA, no se ejecuta esa parte.
Regla 3: Se convierte a plan Engine + Agents + Pipelines.
Regla 4: Todo lo nuevo debe poder correr con GitHub Actions, runners, storage y packages incluidos.

## 3. Mapa de Migracion Completa

Fase 0. Contencion (hoy)
- Congelar gastos variables.
- Auditar workflows que llamen IA.
- Registrar baseline de costos.

Fase 1. Sustitucion funcional (48h)
- Reemplazar tareas IA por reglas, plantillas y heuristicas.
- Crear simuladores para validar calidad sin LLM.
- Mantener entregables comerciales con automatizacion deterministic.

Fase 2. Productizacion (7 dias)
- Empaquetar productos vendibles en Packages.
- Automatizar demos y onboarding.
- Activar pipeline de ventas y entrega continua.

Fase 3. Escala (30 dias)
- Matrices por vertical y mercado.
- Integracion con watchers de conversion, churn y MRR.
- Optimizacion por costos por workflow y por cliente.

## 4. Estructura Objetivo de Carpetas

Usar esta estructura como columna vertebral:
- runtime
- pipelines
- simulators
- playbooks
- hardening
- connectors
- tasks
- watchers
- agents
- logs
- storage
- api
- ui

## 5. Workflows Minimos a Crear

Workflow 1. cost-guard
- Trigger: push, pull_request, workflow_dispatch
- Tarea: escanear repo y bloquear referencias a proveedores IA pagados
- Resultado: fail del pipeline si detecta riesgo de gasto

Workflow 2. build-and-package
- Trigger: push en main o tag
- Tarea: build de artefactos vendibles, versionado, publish en Packages
- Resultado: paquete instalable por cliente

Workflow 3. smoke-and-release
- Trigger: tag release
- Tarea: smoke tests, validaciones runtime, evidencia de salida
- Resultado: release solo si todo pasa

Workflow 4. sales-demo-autogen
- Trigger: schedule diario + manual
- Tarea: generar demo assets, landing variants por plantilla, kit comercial
- Resultado: material de venta sin IA

Workflow 5. customer-onboarding
- Trigger: issue form nuevo cliente
- Tarea: provisionar plantilla, credenciales no sensibles, checklist de activacion
- Resultado: onboarding repetible

## 6. Scripts Base Sin IA

Script A. scripts/cost-guard.sh
- Busca patrones de riesgo en yaml, env, js, ts.
- Falla si encuentra llamadas a OpenAI, Anthropic, Gemini, Azure OpenAI o endpoints similares.

Script B. scripts/generate-offers.mjs
- Genera ofertas comerciales desde plantillas parametrizadas.
- Produce variantes por sector, ticket y pain.

Script C. scripts/build-commercial-bundle.mjs
- Empaqueta assets de producto, docs, ejemplos y changelog.

Script D. scripts/onboard-customer.mjs
- Crea estructura de entrega por cliente y checklist de handoff.

Script E. scripts/revenue-daily-report.mjs
- Reporte diario de leads, demos enviadas, conversiones y cash-in.

## 7. Monetizacion Urgente en 3 Carriles

Carril 1. Venta Rapida (0-7 dias)
- Producto: paquetes ejecutables y plantillas operativas para PyME.
- Canal: outreach directo LinkedIn + WhatsApp + correo.
- KPI: demos por dia, cierres por semana, ticket promedio.

Carril 2. Entrega Continua (7-21 dias)
- Producto: bundles versionados en Packages.
- Canal: repos privados por cliente + releases firmadas.
- KPI: tiempo de onboarding, activacion en 48h, churn inicial.

Carril 3. Expansion (21-60 dias)
- Producto: upsells por vertical.
- Canal: casos de exito y referidos.
- KPI: MRR, expansion revenue, LTV/CAC.

## 8. Definicion de Hecho por Entrega

Cada modulo se considera listo solo si cumple:
1. Tiene workflow CI ejecutable.
2. Tiene script local equivalente.
3. Tiene output comercial vendible.
4. Tiene metrica de negocio asociada.
5. No depende de IA pagada.

## 9. Checklist Diario del Operador

1. Revisar panel de billing y alertas.
2. Correr cost-guard.
3. Correr build-and-package.
4. Publicar al menos 1 activo comercial.
5. Enviar outreach a leads priorizados.
6. Registrar conversiones y bloqueos.
7. Ajustar plantillas y repetir.

## 10. Mensaje de Control

Si cualquier tarea propone IA pagada:
- No ejecutar.
- Convertir a playbook de agentes y pipeline deterministic.
- Mantener avance comercial sin detener operacion.
