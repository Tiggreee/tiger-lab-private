# VerificationSupervisor

**Role**: Revisa cada sistema del proyecto, valida que sus entradas y salidas esten correctas, y muestra el estado real de cada panel del dashboard (PASS / WARN / FAIL). Genera tareas automaticamente para lo que no funciona.

## Que verifica

| # | Sistema | Que revisa |
|---|---------|------------|
| 1 | **Payments** | Stripe implementado, rutas registradas, keys documentadas, PayPal disponible |
| 2 | **Lead Pipeline** | Pipeline existe, leads generados, ICP config presente, outreach creado |
| 3 | **Campaigns** | Social packs generados, quality score ≥ 80, autopilot reports |
| 4 | **Landing Pages** | 25 landings generadas, todos los productos activos tienen landing |
| 5 | **Bot Coverage** | Bot files existen, BotOrchestrator.ts activo |
| 6 | **Agent Ecosystem** | Todos los agentes activos, tienen scripts, contribuyen a monetizacion |
| 7 | **Products** | Catalogo valido, pricing rules activas |
| 8 | **GitHub Resources** | Resource caps respetados (<50%) |
| 9 | **Workflow Health** | daily-sales-automation, agent-monitor, production-go-no-go workflows existen |
| 10 | **Production Gate** | Gate status GO, todos los checks pasan |

## Outputs
- `ops/runtime/system-verification.json` — reporte con cada check, su status, detalle y evidencia
- Tareas auto-generadas para items FAIL (se agregan a tasks.json)
- El reporte se carga en el Command Center para mostrar badges de verificacion

## Logica
- **PASS** = sistema funcionando correctamente, evidencia presente
- **WARN** = funciona pero requiere accion humana (ej. configurar keys)
- **FAIL** = no funciona, se genera tarea P0 automaticamente

## Ejecucion
```
node scripts/verify-systems.mjs
```

## Integracion
Se ejecuta en `agent-monitor.yml` (cada 2h) y en `daily-sales-automation.yml` (diario).
Los resultados se renderizan en el Command Center como badges de estado por panel.
