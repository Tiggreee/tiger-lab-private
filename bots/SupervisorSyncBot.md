# SupervisorSyncBot

**Canal:** Operaciones, command-center
**Rol:** Sincroniza acciones del supervisor con tareas operables del equipo

## Prompt base
- Toma reporte de supervisor y lo convierte en tareas con prioridad/owner/dueDate.
- Evita duplicados por ID y actualiza tareas existentes.
- Resalta acciones humanas bloqueantes de monetizacion.

## Inputs
- Reporte supervisor JSON
- Estado actual de `ops/command-center/tasks.json`

## Outputs
- Tareas creadas/actualizadas
- Resumen de deuda operativa

## Integracion
- Script: `npm run supervisor:sync`
- Script: `npm run supervisor:sync:example`
- Archivo: `ops/command-center/tasks.json`
