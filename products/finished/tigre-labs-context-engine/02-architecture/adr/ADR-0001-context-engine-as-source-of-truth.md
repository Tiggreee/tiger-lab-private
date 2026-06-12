# ADR-0001-context-engine-as-source-of-truth

- Fecha: 2026-06-08
- Estado: accepted
- Owner: Product Architect

## Contexto
El contexto estaba disperso en chats, repos de ejecución y documentos aislados.
Esto producía pérdida de continuidad y decisiones inconsistentes.

## Decisión
Adoptar `tigre-labs-context-engine` como repositorio único de contexto estratégico,
técnico y operativo.

## Consecuencias
- Positivas:
  - Mayor consistencia en decisiones.
  - Mejor desempeño de agentes y Copilot con contexto indexable.
  - Trazabilidad de cambios y racionales.
- Negativas:
  - Costo de disciplina de mantenimiento.
  - Riesgo de desactualización si falla la cadencia semanal.

## Alternativas consideradas
1. Mantener contexto en repo de ejecución principal.
2. Mantener contexto en herramienta de notas externa.

## Seguimiento
- Revisión de vigencia cada semana.
- KPI: porcentaje de documentos críticos actualizados en < 30 días.
