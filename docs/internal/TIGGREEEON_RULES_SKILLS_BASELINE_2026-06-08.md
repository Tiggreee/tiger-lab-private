# Tiggreeeon Rules and Skills Baseline (2026-06-08)

## Scope
Comparison between current operating papers and the context-engine v1.1 baseline.

## Evidence reviewed
- PROJECT_BLUEPRINT_TOTAL.txt
- AUTONOMY_MODE.txt
- DAILY_AUTONOMY_ROUTINE.txt
- AUTOMATION_SEQUENCES.txt
- agents/ProductArchitect.agent.md
- agents/MonetizationEngine.agent.md
- agents/BotOrchestrator.agent.md
- agents/ContentEngine.agent.md
- agents/LeadAnalyzer.agent.md

## Current strengths detected
1. Clear North Star and explicit non-negotiables.
2. Strong milestone focus with CRITICAL vs NOT IMPORTANT NOW gate.
3. Commercial safety with payment confirmation and reconciliation discipline.
4. Agent-level quality rules to avoid generic output.
5. Defined autonomous operating loop for diagnostics, generation, pricing, funnels, automation, bots, metrics and alerts.

## Gaps detected
1. Rules are distributed across multiple files and not normalized as one baseline.
2. Skills are implied by role prompts but not mapped as a shared capability matrix.
3. Weekly review cadence exists as routine but without one fixed operational slot.

## Baseline decision (recommended)
Keep these as first mandatory rules:
1. Execute only CRITICAL items for current milestone.
2. Postpone everything outside CRITICAL.
3. No provisioning before payment confirmation.
4. Reconciliation required before marking any sale as closed.
5. Human escalation only for legal/compliance, fraud, or policy-breaking exceptions.
6. If action conflicts with rules, block action and register exception.

Keep these skills as core:
1. Context extraction from primary docs.
2. Prioritization gate (criticality discipline).
3. Monetization safety (payment and reconciliation controls).
4. Prompt quality (specific, non-generic, product-grounded output).
5. Incident discipline (playbook activation and postmortem traceability).

## What was executed
1. Context-engine v1.1 published with rules baseline and skills catalog.
2. Copilot indexing smoke test prompts added.
3. Master plan and governance updated with North Star, KPI canon, and ownership model.

## Next hardening step
1. Assign explicit human names for Ops Lead and Engineering Lead.
2. Confirm final weekly review hour.
3. Add a monthly audit for stale docs and contradictory rules.
