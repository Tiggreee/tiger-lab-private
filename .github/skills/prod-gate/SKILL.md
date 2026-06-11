---
name: prod-gate
description: 'Run the production go-live gate workflow. Use for launch readiness, release checks, runtime hardening validation, smoke-test plus build plus prod-gate execution, and go-no-go evidence collection.'
argument-hint: 'Describe the release scope or the change being prepared for go-live.'
user-invocable: true
---

# Production Gate Workflow

Use this skill when a change needs a release-style validation path before go-live, rollout, or handoff.

## Preconditions

- Follow [runtime hardening instructions](../../instructions/runtime-hardening.instructions.md) for protected surfaces.
- Prefer this workflow after code changes are already in place.
- If the task only touched `.github/copilot/agents/**/*.yaml`, use `npm run check:copilot:agents` instead of this skill.

## Procedure

1. Determine whether the change affects runtime, launch readiness, checkout, billing, auth, or production governance.
2. Run `npm run test:smoke`.
3. Run `npm run build:server`.
4. Run `npm run prod:gate`.
5. Read [ops/runtime/production-go-no-go-report.md](../../../ops/runtime/production-go-no-go-report.md) and summarize pass, warn, fail counts plus any owner actions.
6. If any step fails, stop the release recommendation and report the failing command and impacted evidence.

## Output Format

Return:

- Release scope
- Command results for smoke, build, and prod gate
- Final gate status: `GO`, `GO_WITH_WARNINGS`, or `NO_GO`
- Blocking findings or remaining owner actions

## Key Evidence

- [ops/runtime/production-go-no-go-report.md](../../../ops/runtime/production-go-no-go-report.md)
- [scripts/production-go-no-go.mjs](../../../scripts/production-go-no-go.mjs)
- [README.md](../../../README.md)