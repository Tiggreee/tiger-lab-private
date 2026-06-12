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

## vmDev Engine Default Mode (No-AI Runtime + 50% Resource Caps)

**CRITICAL:** This project runs on GitHub for Startups. AI credits must not be used after day 5 of each month.
GitHub Copilot is prohibited under all circumstances.

### Mandatory Constraints
- **After day 5 of each month:** AI usage = ZERO. No exceptions.
- **Workspace:** Always operate from repository root. Never change context to subdirectories.
- **Execution:** All output must be executed in a single pass without questions or confirmation.
- **Resource audits:** Before any action, audit that usage does NOT exceed 50% of included limits.

### Resource Limits (50% of Enterprise Allocation)

| Resource | Limit | Max Usage |
|----------|-------|-----------|
| Actions minutes | 50,000 | 25,000 |
| Actions storage | 50 GB | 25 GB |
| Actions custom images | 150 GiB | 75 GiB |
| Git LFS bandwidth | 250 GB | 125 GB |
| Git LFS storage | 250 GB | 125 GB |
| Packages data transfer | 100 GB | 50 GB |
| Packages storage | 50 GB | 25 GB |
| Sandbox budget | Monthly | 50% max |
| GitHub for Startups | $9,964.81 | $4,982.40 |
| AI Credits (after day 5) | Available | **ZERO** |

**If any task exceeds these limits → DO NOT EXECUTE. Generate alternate plan respecting caps.**

### Mandatory Engine+Agents Switch

If a task is blocked by AI unavailability or resource caps, produce an execution-ready plan with:

1. Agent playbooks for `watchers/`, `simulators/`, `pipelines/`, `connectors/`, `tasks/`, and `agents/`.
2. Complete GitHub Actions workflows ready for `.github/workflows/` (respecting 50% resource caps).
3. Executable scripts (bash, Node.js, Python).
4. Multi-agent pipeline design (triggers, parallel jobs, matrices, within resource limits).
5. Concrete folder structure:
   `runtime/`, `pipelines/`, `simulators/`, `playbooks/`, `hardening/`, `connectors/`, `tasks/`, `watchers/`, `agents/`, `logs/`, `storage/`, `api/`, `ui/`.
6. Exact runtime commands for execute, validate, test, deploy.
7. Monetization plan without AI:
   sales pipelines, demo automation, commercial builds, GitHub Packages distribution, continuous delivery, onboarding, product generation, technical marketing.

### Included Enterprise Resources (50% allocation only)

- GitHub Actions minutes and storage (within caps)
- Actions custom image storage
- Git LFS bandwidth and storage
- GitHub Packages transfer and storage
- Sandbox budget (50% max per month)
- GitHub for Startups credits ($4,982.40 max)
- Self-hosted or managed runners
- Internal repo pipelines and storage

### Response Contract

Return ONE of these outcomes ONLY:

- **Option A: "Se puede hacer sin IA"**
  - Deliver workflows, scripts, pipelines, agents, playbooks, commands, folder structure.
  - All ready to execute in single pass.
  - All respecting 50% resource caps.
  - All with monetization focus.
  
- **Option B: "Requeriría IA"**
  - Do NOT execute AI steps.
  - Deliver full Engine+Agents migration plan (no AI).
  - Include monetization pipelines and sellable products.
  - Respect all 50% resource caps.

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