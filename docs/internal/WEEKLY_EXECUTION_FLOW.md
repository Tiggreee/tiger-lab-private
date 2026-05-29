# Weekly Execution Flow (60/40 Monetization/Employability)

## 1. Funnel Board (Monetizacion)
- Archivo: ops/pipeline/weekly-pipeline.json
- Cada evento debe tener:
  - stage (visit, lead, trial, checkout, paid, churn)
  - source (docs, social, landing, api)
  - timestamp y metadata
- Revisa y actualiza diariamente con export de eventos.
- Objetivo: conversiones paid semanales con tendencia positiva.

## 2. Command Center
- Archivo: ops/command-center/tasks.json
- Prioriza tareas de automatizacion P0 antes de mejoras cosmeticas.
- Marca avances y reprograma overdue.

## 3. Monetization Weekly Checklist
- Archivo: docs/internal/MONETIZATION_WEEKLY_CHECKLIST.md
- Revisa cada lunes y viernes.
- Marca cada acción cumplida.

## 4. Employability Weekly Checklist
- Archivo: docs/internal/EMPLOYABILITY_WEEKLY_CHECKLIST.md
- Revisa cada lunes y viernes.
- Marca cada acción cumplida.

## 5. README de Repos Estrella
- Usa docs/internal/README_STAR_TEMPLATE.md para actualizar los README de tus repos clave.
- Incluye narrativa de impacto, arquitectura, métricas y caso real.

## 6. Publicacion Automatizada
- Usa artefactos de release para generar contenido tecnico semanal.
- Publica automaticamente via workflows y cola de contenido.
- Incluye CTA a trial self-serve o playground.

## 7. Cadencia Diaria
- Actualiza funnel board y command center antes de codificar.
- Ejecuta al menos una mejora P0 de conversion automatizada diaria.
- No avances features nuevos si hay bloqueos criticos de funnel.

## 8. Cadencia Semanal
- Lunes: Resetea metas y revisa embudo por etapas.
- Miercoles: Ejecuta publish loop automatico de contenido tecnico.
- Viernes: Revisa conversion por etapa, churn y alertas.
- Checklist: leads suficientes, trials activos, checkout conversion, activaciones pagadas.

---

**Tip:** Imprime este archivo o ponlo como pestaña fija en tu editor para tenerlo siempre visible.