# Agent Instructions:
Production governance layer.

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

### Resource Efficiency Protocol (Mandatory)

To avoid wasted cycles, secrets churn, and repeated false-negative loops:

1. Use a two-tier validation model and report which tier is failing:
   - Tier A (`traffic:go-live`): minimum publish-critical secrets.
   - Tier B (`traffic:ready`): extended ecosystem secrets.
2. Never claim "fully green" if Tier B is failing; report "Tier A pass / Tier B fail" explicitly.
3. Validate in runtime context (Railway service env), not only local shell env.
4. Before asking for secret rotation/regeneration, verify if the value can be viewed/copied first.
5. Regenerate secrets only when visibility/copy is impossible or compromise is confirmed.
6. After secret updates:
   - Restart/redeploy runtime services once.
   - Re-run Tier A and Tier B checks once.
   - Publish a concise PASS/FAIL matrix.
7. Keep one active checklist per provider (LinkedIn, X, Facebook, Telegram, Discord) to prevent duplicated work.
8. If a check is red, output exact missing variable names and source screen path, not generic advice.



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

### Included Enterprise Resources 

- GitHub Actions minutes and storage (within caps)
- Actions custom image storage
- Git LFS bandwidth and storage
- GitHub Packages transfer and storage
- Sandbox budget (50% max per month)
- GitHub for Startups credits ($4,982.40 max)
- Self-hosted or managed runners
- Internal repo pipelines and storage


## High-Value Surfaces

- `server/`: HTTP routes, middleware, controllers, server entrypoints.
- `src/` and `shared/`: domain logic and shared contracts.
- `scripts/`: operational CLI entrypoints used by humans and automation.
- `ops/`: runtime evidence, dashboards, launch reports, and playbooks.
- `.github/copilot/agents/`: Copilot agent definitions.


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