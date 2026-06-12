# Tigre Labs Context Engine

Repositorio privado que funciona como cerebro persistente de la operación.

## Objetivo
Centralizar la verdad técnica y operativa para que personas, agentes y Copilot trabajen con el mismo contexto.

## Alcance
- Plan maestro y estrategia operativa.
- Arquitectura y decisiones técnicas (ADR).
- Contratos de engine y reglas de agentes.
- Prompts base y estándares.
- Pipelines de actualización de contexto.
- Memoria institucional y playbooks.

## Estructura
- `01-strategy/`: plan, metas y modelo operativo.
- `02-architecture/`: mapas, ADR y contratos técnicos.
- `03-engine/`: reglas de engine, agentes y handoffs.
- `04-prompts/`: prompts base, plantillas y políticas.
- `05-operations/`: SOPs y playbooks de incidentes.
- `06-standards/`: estándares de código y documentación.
- `07-pipelines/`: flujo de refresco y control de calidad de contexto.
- `08-memory/`: memoria institucional y decisiones no obvias.
- `90-governance/`: charter, ownership y cadencias.

## Ciclo mínimo de mantenimiento
1. Actualizar cambios relevantes de producto/arquitectura.
2. Registrar decisiones en ADR y memoria.
3. Correr checklist semanal de vigencia.
4. Publicar resumen en `08-memory/WEEKLY_CONTEXT_DIGEST.md`.

## Criterio de calidad
El contexto debe ser:
- Correcto
- Trazable
- Actualizado
- Accionable
- Entendible por humano y por agente

## Primer uso recomendado
1. Leer `90-governance/CONTEXT_CHARTER.md`.
2. Completar placeholders en `01-strategy/MASTER_PLAN.md`.
3. Registrar la primera decisión en `02-architecture/adr/`.
4. Activar rutina semanal en `07-pipelines/CONTEXT_REFRESH_PIPELINE.md`.
