# Engine Contract

## Objetivo
Definir cómo consumen y actualizan contexto los agentes y la operación.

## Entradas mínimas
- Objetivo de negocio.
- Estado actual del sistema.
- Restricciones técnicas.
- Prioridades vigentes.

## Salidas esperadas
- Plan de ejecución accionable.
- Cambios registrados en documentos fuente.
- Decisiones trazadas con ADR cuando aplique.

## Reglas
- No inventar contexto ausente: crear placeholder explícito.
- No mutar reglas globales sin registro de impacto.
- Toda recomendación operativa debe apuntar a un documento fuente.

## Contrato de actualización
- Si cambia arquitectura: actualizar `02-architecture/` y ADR.
- Si cambia operación: actualizar `05-operations/`.
- Si cambia estrategia: actualizar `01-strategy/`.
- Si cambia comportamiento de prompts: actualizar `04-prompts/`.
