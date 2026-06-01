# Payment Real Execution Checklist (Brutal Mode)

Objective: move from simulated billing to real collection with control.

## Phase 1: Minimum live readiness
- [ ] Provider account in live mode configured.
- [ ] Webhook endpoint public and reachable.
- [ ] Webhook signature secret configured.
- [ ] Idempotency storage configured and tested.
- [ ] Runtime payment/provisioning logging enabled.

## Phase 2: Rail-by-rail validation
### Card
- [ ] Checkout session created.
- [ ] Card payment confirmed.
- [ ] payment.succeeded emitted.
- [ ] Provisioning completed.

### Transfer
- [ ] Transfer instruction generated.
- [ ] Transfer confirmation ingested.
- [ ] payment.succeeded emitted.
- [ ] Provisioning completed.

### Cash-reference / manual-cash
- [ ] Cash-reference generated (or manual cash registered).
- [ ] Evidence captured and linked.
- [ ] Confirmation path completes dual approval.
- [ ] payment.succeeded emitted.
- [ ] Provisioning completed.

## Phase 3: Operational hardening
- [ ] Retry strategy for failed webhooks validated.
- [ ] Reconciliation job compares provider settlements vs runtime records.
- [ ] Alert on signature failures and reconciliation mismatches.
- [ ] Daily close report generated.

## Phase 4: Human gates (only)
- [ ] Publication go-live approval signed.
- [ ] Exception discount requests reviewed.
- [ ] Security/fraud incidents triaged.

## Go / No-Go
Go only if all below are true:
- [ ] Signature verification PASS.
- [ ] Idempotency PASS.
- [ ] E2E payment->provisioning PASS.
- [ ] Reconciliation mismatch < 0.5%.
- [ ] Incident response owner on-call.
