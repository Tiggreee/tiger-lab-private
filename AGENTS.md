# Agent Instructions

This repository is an autonomous monetization and operations lab built on Node.js 20+, TypeScript, Vitest, CLI scripts, and a production governance layer.

## Start Here

- Read [README.md](README.md) for the command surface and repo map.
- Read [docs/internal/TIGGREEEON_RULES_SKILLS_BASELINE_2026-06-08.md](docs/internal/TIGGREEEON_RULES_SKILLS_BASELINE_2026-06-08.md) before changing behavior that affects operations, monetization, funnels, bots, or launch flows.
- Treat [ops/runtime/production-go-no-go-report.md](ops/runtime/production-go-no-go-report.md) as current evidence that the repo is in a production-ready baseline and avoid changes that weaken those checks.

## Tiggreeeon Mode

When the user explicitly says `tiggreeeon`, switch to direct execution mode:

- Do the work instead of stopping at a plan, unless a real blocker exists.
- Keep changes minimal, validate immediately, and avoid speculative refactors.
- Preserve verified behavior and extend it without breaking current flows.
- If a requested action conflicts with repo guardrails, block the action and explain the conflict with evidence.

`tiggreeeon` does not override production governance. These rules stay mandatory:

- Execute only work that is critical to the active milestone.
- Postpone non-critical scope.
- Never provision before payment confirmation.
- Require reconciliation before treating a sale as closed.
- Escalate only for legal/compliance, fraud, or policy-breaking exceptions.

## Working Rules

- Prefer the narrowest command that validates the touched surface.
- Use `npm run test` for general regression checks.
- Use `npm run test:smoke` for launch-critical smoke coverage.
- Use `npm run build:server` after backend or server contract changes.
- Use `npm run check:copilot:agents` after editing files in `.github/copilot/agents/`.
- Use `npm run prod:gate` when a change can affect production readiness or tiggreeeon governance.

## Customization Order

- Apply runtime hardening instructions first.
- Apply the production gate skill second.
- Use the release auditor only after governance and gate workflow are in place.

## High-Value Surfaces

- `server/`: HTTP routes, middleware, controllers, server entrypoints.
- `src/` and `shared/`: domain logic and shared contracts.
- `scripts/`: operational CLI entrypoints used by humans and automation.
- `ops/`: runtime evidence, dashboards, launch reports, and playbooks.
- `.github/copilot/agents/`: Copilot agent definitions, including the locked `agent-tiggreeeon.yaml` watch-only guardrail.

## Custom Agent Guardrails

- Keep `agent-tiggreeeon.yaml` watch-only. It must not gain file editing, code generation, or pull request capabilities.
- Preserve the required root keys enforced by [scripts/validate-copilot-agents.mjs](scripts/validate-copilot-agents.mjs).
- If you update agent definitions, validate them before doing unrelated changes.

## Reference Docs

- [README.md](README.md)
- [docs/internal/TIGGREEEON_RULES_SKILLS_BASELINE_2026-06-08.md](docs/internal/TIGGREEEON_RULES_SKILLS_BASELINE_2026-06-08.md)
- [ops/runtime/production-go-no-go-report.md](ops/runtime/production-go-no-go-report.md)
- [scripts/validate-copilot-agents.mjs](scripts/validate-copilot-agents.mjs)
- [.github/instructions/runtime-hardening.instructions.md](.github/instructions/runtime-hardening.instructions.md)
- [.github/skills/prod-gate/SKILL.md](.github/skills/prod-gate/SKILL.md)
- [.github/agents/release-auditor.agent.md](.github/agents/release-auditor.agent.md)