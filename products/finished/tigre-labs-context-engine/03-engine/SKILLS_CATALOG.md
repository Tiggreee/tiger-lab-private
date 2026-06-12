# Skills Catalog

## Objetivo
Definir skills operativos minimos por agente para mantener coherencia de ejecucion.

## Skills core
- Context extraction: leer fuentes primarias y detectar contradicciones.
- Prioritization gate: decidir CRITICAL vs no-prioritario.
- Monetization safety: respetar pago-confirmado y reconciliacion.
- Prompt quality: evitar salida generica y aterrizar al dolor operativo real.
- Incident discipline: activar playbook cuando hay riesgo operacional.

## Mapeo por agente
| Agente | Skills dominantes | Output esperado |
|---|---|---|
| Product Architect | Context extraction, Prioritization gate | Blueprint, changelog, version |
| Monetization Engine | Monetization safety, Prioritization gate | Pricing, provisioning, alertas |
| Bot Orchestrator | Prompt quality, Monetization safety | Respuesta, accion, checkout path |
| Content Engine | Prompt quality, Context extraction | Post tecnico, changelog, doc |
| Lead Analyzer | Context extraction, Prioritization gate | Score, accion, enrutamiento |

## Politica de evolucion
Si se agrega un skill nuevo, actualizar este catalogo y el contrato del agente impactado.
