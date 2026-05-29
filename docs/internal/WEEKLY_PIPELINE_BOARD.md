# Weekly Funnel Board

## Goal
Track automated inbound and conversion execution with measurable weekly targets.

## Data Source
- Main board data: ops/pipeline/weekly-pipeline.json
- Auto summary: scripts/pipeline-weekly-summary.mjs

## Update Cadence
- Monday morning: reset weekly targets and funnel thresholds.
- Daily (end of day): ingest event export and update stage metrics.
- Friday: review conversion gaps and activation blockers.

## Stage Definition
- visit: anonymous product/docs traffic event.
- lead: qualified capture event.
- trial: user started self-serve trial.
- checkout: user initiated payment.
- paid: payment succeeded and provisioning completed.
- churn: cancelled or inactive by rule.

## Non-Negotiable Rules
- Every stage must have event counts and conversion ratio.
- No stage can be skipped without explicit instrumentation.
- At least one P0 automation fix every business day.
- Funnel-blocking tasks must be resolved before new feature work.

## Weekly Review Checklist
1. Are inbound leads enough to support next month target?
2. Which stage has the largest drop-off this week?
3. Is trial-to-paid conversion improving week over week?
4. Are there critical automation failures blocking activations?

## Commands
- pipeline summary: npm run pipeline:summary
- pipeline summary markdown: npm run pipeline:summary:md
