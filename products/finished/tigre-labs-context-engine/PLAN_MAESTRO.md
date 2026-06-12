# Plan Maestro - Tigre Labs Context Engine

## Estado
- Version: 1.0
- Fecha: 2026-06-08
- Owner: Victor Manuel Salgado Luna
- Estado operacional: Activo

## North Star
Convertir intencion en revenue con minima friccion manual y trazabilidad operativa completa.

## Proposito del plan
Definir la direccion ejecutiva, tecnica y operativa para cerrar monetizacion real sin perder foco en calidad, seguridad y continuidad.

## Principios no negociables
1. Conversion real sobre output cosmetico.
2. Pago confirmado antes de provisioning.
3. Reconciliacion obligatoria antes de marcar una venta como cerrada.
4. Trazabilidad de decisiones tecnicas y operativas.
5. Disciplina de foco: ejecutar CRITICAL, postergar lo no prioritario.

## Enfoque comercial vigente
Oferta principal: FacturaAutentica-first.

Implica:
- Top funnel y onboarding alineados a una narrativa de oferta unica.
- Otros productos quedan como expansion secundaria.
- Se evita dispersion de mensaje en el punto de conversion.

## Objetivos por fase

### Fase A - Baseline estable (mantenida)
1. Runtime estable en Railway con comandos de build/start deterministas.
2. Dominio generado operativo como entrada canonica.
3. Flujo UI funcional para rutas clave.

### Fase B - Consolidacion de mensaje (en curso)
1. Landing y onboarding centrados en FacturaAutentica-first.
2. CTA y copy orientados a conversion directa.
3. Portafolio secundario fuera del foco principal de compra.

### Fase C - Monetizacion hardening (critica)
1. Integracion real del proveedor de pago.
2. Webhooks endurecidos: firma, idempotencia, replay protection.
3. Gate estricto de provisioning por confirmacion de pago.
4. Reconciliacion recurrente proveedor vs runtime.

### Fase D - Gate de salida (go/no-go)
1. Auditoria tecnica de cierre.
2. Dry-run comercial y lote real controlado.
3. Decision explicita de lanzamiento con evidencias.

## KPI canon
- activation
- conversion
- retention
- MRR

## KPI operativos semanales
- leads sent
- calls booked
- proposals sent
- closings
- interviews started

## Rutina de control
- Diario: captura de hallazgos y decisiones relevantes.
- Semanal: Friday 16:00 America/Mexico_City para revision de contexto.
- Mensual: primer lunes habil 09:00 America/Mexico_City para auditoria anti-drift.

## Reglas tiggreeeon (first rules)
1. Ejecutar solo tareas CRITICAL del milestone vigente.
2. Postergar tareas fuera de CRITICAL.
3. No provisioning antes de pago confirmado.
4. Reconciliacion obligatoria antes de cerrar venta.
5. Escalar a humano solo en legal/compliance, fraude o excepcion fuera de politica.
6. Bloquear acciones que contradigan reglas criticas y registrar excepcion.

## Riesgos principales y mitigaciones
1. Riesgo: Drift de contexto por cambios no documentados.
   Mitigacion: charter + ADR + digest semanal + auditoria mensual.
2. Riesgo: Dilucion comercial por mensaje multi-producto.
   Mitigacion: narrativa FacturaAutentica-first en top funnel.
3. Riesgo: Cierre comercial sin controles de pago.
   Mitigacion: gating por pago confirmado + reconciliacion obligatoria.

## Definicion de done del milestone actual
1. Runtime estable 7 dias consecutivos sin incidentes de fallback.
2. Mensaje de landing/onboarding alineado al foco comercial vigente.
3. Flujo payment -> provisioning verificado con eventos reales.
4. Reconciliacion ejecutada y revisada en cadencia.
5. Dashboard usado como cockpit con datos confiables.

## Vinculos operativos
- Estrategia detallada: 01-strategy/MASTER_PLAN.md
- Contrato del engine: 03-engine/ENGINE_CONTRACT.md
- Reglas tiggreeeon: 03-engine/TIGGREEEON_RULES_BASELINE.md
- Skills catalog: 03-engine/SKILLS_CATALOG.md
- SOP semanal: 05-operations/SOP_WEEKLY_CONTEXT_REVIEW.md
- Auditoria mensual: 07-pipelines/MONTHLY_CONTEXT_AUDIT.md
- Memoria institucional: 08-memory/INSTITUTIONAL_MEMORY.md

## Nota
Este documento funciona como entrypoint ejecutivo. Si hay conflicto con documentos de dominio, prevalece la combinacion de Charter + ADR mas reciente + SOP vigente.
