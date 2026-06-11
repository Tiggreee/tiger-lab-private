---
applyTo: "{server/**,shared/**,scripts/**,ui-host/src/**,ops/runtime/**}"
description: "Use when changing runtime, backend, launch gate, billing, auth, checkout, or production-readiness flows that must respect hardening and go-live policy."
---

# Runtime Hardening Instructions

- Treat runtime, billing, auth, checkout, launch gate, and production-readiness changes as protected surfaces.
- Preserve the current production baseline documented in [ops/runtime/production-go-no-go-report.md](../../ops/runtime/production-go-no-go-report.md) unless the user explicitly asks to change it.
- Do not weaken payment confirmation, billing reconciliation, auth enforcement, checkout URLs, API key handling, or production gate logic.
- Block bypasses that skip required validations, replace real checks with placeholders, or silently downgrade a failing gate to pass.
- If a requested change conflicts with production governance, stop and explain the exact conflict before editing.

## Mandatory Validation

- Run `npm run test:smoke` after changes that can affect launch-critical behavior.
- Run `npm run build:server` after backend, server, route, controller, middleware, or contract changes.
- Run `npm run prod:gate` after changes that touch runtime hardening, launch readiness, governance, billing safety, or checkout flow.

## Protected Evidence Sources

- [scripts/production-go-no-go.mjs](../../scripts/production-go-no-go.mjs)
- [ops/runtime/production-go-no-go-report.md](../../ops/runtime/production-go-no-go-report.md)
- [docs/internal/TIGGREEEON_RULES_SKILLS_BASELINE_2026-06-08.md](../../docs/internal/TIGGREEEON_RULES_SKILLS_BASELINE_2026-06-08.md)
- [README.md](../../README.md)