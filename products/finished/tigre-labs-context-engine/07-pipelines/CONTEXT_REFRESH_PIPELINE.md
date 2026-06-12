# Context Refresh Pipeline

## Objetivo
Mantener sincronizado el contexto con la realidad operativa.

## Entradas
- Cambios de repos de ejecución.
- Resultados de experimentos.
- Incidentes y postmortems.
- Decisiones estratégicas.

## Flujo sugerido
1. Recolectar cambios semanales.
2. Clasificar por dominio (strategy, architecture, ops, prompts).
3. Aplicar updates en documentos fuente.
4. Ejecutar checklist de consistencia.
5. Publicar digest semanal.

## Métricas
- `% docs críticos actualizados < 30 días`.
- `# contradicciones abiertas`.
- `lead time de actualización de contexto`.
