# Monthly Context Audit

## Objetivo
Prevenir drift documental y contradicciones operativas acumuladas.

## Frecuencia
Mensual (90 minutos) el primer lunes habil de cada mes a las 09:00 (America/Mexico_City).

## Alcance
- Estrategia (`01-strategy/`)
- Arquitectura y ADR (`02-architecture/`)
- Engine, reglas y skills (`03-engine/`)
- Prompts base (`04-prompts/`)
- Operacion y playbooks (`05-operations/`)
- Estandares (`06-standards/`)
- Pipelines (`07-pipelines/`)
- Memoria (`08-memory/`)

## Checklist de auditoria
1. Identificar documentos sin update > 30 dias.
2. Detectar contradicciones entre North Star, reglas CRITICAL y SOPs.
3. Verificar trazabilidad de decisiones mayores (ADR o registro explicito).
4. Revisar que prompts base y skills catalog reflejen comportamiento real.
5. Confirmar que KPIs canon y operativos sigan alineados.
6. Registrar deuda documental y plan de cierre con fecha.

## Entregables
- Informe de hallazgos en `08-memory/WEEKLY_CONTEXT_DIGEST.md` (seccion mensual).
- Lista priorizada de correcciones con owner.
- Estado final: `healthy`, `warning` o `critical`.

## Reglas de severidad
- `healthy`: sin contradicciones criticas y < 10% docs stale.
- `warning`: contradicciones no criticas o 10-25% docs stale.
- `critical`: contradiccion critica o > 25% docs stale.
