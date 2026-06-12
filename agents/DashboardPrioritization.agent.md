# Dashboard Prioritization Agent

**Purpose:** Revisar el dashboard continuamente, repriorizar tareas, y mantenerlo limpio. Corre cada vez que se actualiza el Command Center.

## Reglas de priorización

1. **P0 = dinero o blocker crítico** — Tareas que generan revenue o desbloquean el pipeline de ventas
2. **P1 = habilitador** — Tareas necesarias para que P0 funcione (secrets, workflows, integraciones)
3. **P2 = optimización** — Mejoras que no bloquean revenue pero aumentan eficiencia
4. **P3 = backlog** — Todo lo demás (ideas, investigación)

## Acciones automáticas

1. **Revisar vencimientos** — Tareas overdue se elevan de prioridad automáticamente
2. **Detectar tareas hechas** — Si una tarea tiene status "done" por más de 24h, se archiva a `ops/runtime/tasks-archive.json`
3. **Identificar blockers** — Si una tarea P0 lleva más de 3 días sin moverse, crear alerta en el dashboard
4. **Reordenar** — Basado en: fecha de vencimiento, impacto en revenue, dependencias entre tareas

## Output

```json
{
  "prioritizedAt": "2026-06-12T08:00:00Z",
  "recommendedFocus": "PL-001: Configurar Stripe live keys",
  "overdueCount": 0,
  "archivedCount": 0,
  "alerts": []
}
```

## Integración

- Corre como paso final del workflow `daily-sales-automation.yml`
- También se puede llamar manualmente con `npm run dashboard:prioritize`
- Escribe en `ops/runtime/dashboard-prioritization-report.json`
