# Launch Audit D-7 to D-0

Objective: decide GO/NO-GO with evidence, not intuition.

## D-7 to D-5: Architecture and Risk
- [ ] Confirm product lineup and non-overlap narrative.
- [ ] Confirm commercial policy (plans, discount bands, exceptions).
- [ ] Confirm provider architecture and fallback policy.
- [ ] Confirm critical event contracts frozen.
- [ ] Confirm security threat review updated.

## D-4 to D-3: Technical Hardening
- [ ] Run smoke and integration tests.
- [ ] Validate traffic packs quality and authenticity checks.
- [ ] Validate dry-run publication for target channels.
- [ ] Validate payment webhook signature verification in staging.
- [ ] Validate idempotency and replay protection in staging.
- [ ] Validate payment -> provisioning E2E.

## D-2: Operational Readiness
- [ ] Human gate roster confirmed (who approves what).
- [ ] Incident response runbook reviewed.
- [ ] Secret rotation and ownership confirmed.
- [ ] Monitoring dashboard and alerts active.
- [ ] Rollback criteria and command path documented.

## D-1: Dress Rehearsal
- [ ] Full rehearsal with realistic traffic.
- [ ] One campaign staged and dry-run validated end-to-end.
- [ ] Checkout test payment passes.
- [ ] Provisioning and onboarding trigger passes.
- [ ] Comms template for incidents and customer updates ready.

## D-0: Go/No-Go Gate
- [ ] No critical unresolved risk.
- [ ] Security controls PASS.
- [ ] Payment/provisioning E2E PASS.
- [ ] Publication approval owner signs off.
- [ ] Final GO recorded with timestamp and owner.

## Success metrics first 24h
- Visit -> checkout conversion baseline achieved.
- Checkout -> paid baseline achieved.
- Paid -> provisioned success >= 99%.
- Mean time to recover incident under target.

If any critical gate fails, NO-GO and execute rollback plan.
