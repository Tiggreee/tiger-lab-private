# tiger-lab-private

Private internal lab to build production-grade full-stack, DevOps, and AI projects.

## Purpose
- Build high-impact projects with reusable standards.
- Validate architecture and security before publishing to public repos.
- Speed up delivery with internal templates and automation.

## Quick Start
1. Install Node.js 20+.
2. Run `npm install`.
3. Run `npm run test`.
4. Create a project scaffold:
   - Bash: `./scripts/new-project.sh <project-name> node-api`
   - PowerShell: `./scripts/new-project.ps1 -Name <project-name> -Template node-api`
5. Run monetization projection:
   - `npm run revenue:forecast:example`
6. Start daily command center:
   - `npm run command-center:start`
   - Open `http://localhost:4310`
   - Enable browser alerts from the UI

## Internal Areas
- `architecture/`: ADRs and architecture decisions.
- `docs/internal/`: operating playbooks, security baseline, roadmap.
- `templates/`: starter templates for new internal products.
- `scripts/`: automation scripts.
- `.github/`: CI/CD, dependency updates, security checks.

## Monetization Toolkit
- `docs/internal/AUTOMATED_MONETIZATION_MASTER_PLAN.md`: master automation plan (products, modules, events, roadmap).
- `docs/internal/MONETIZATION_ENGINE.md`: revenue model and execution cadence.
- `docs/internal/OFFER_CATALOG.md`: packaged offers with pricing ranges.
- `docs/internal/CLIENT_OUTREACH_PLAYBOOK.md`: legacy human-outreach reference (deprecated).
- `docs/internal/PROFILE_REPOS_MATRIX_2026-05-28.md`: full 29-repo scoring matrix (60/40 weighted).
- `docs/internal/AUDIT_PROMPTS_RESULT_2026-05-28.md`: consolidated compliance audit report (A-E).
- `docs/internal/WEEKLY_EXECUTION_FLOW.md`: one-page weekly execution flow (automation-first cadence).
- `ops/revenue/forecast.example.json`: forecast scenario examples.
- `scripts/revenue-forecast.mjs`: projection utility for revenue and MRR.
- `ops/command-center/`: interface for task monitoring and urgency signals.
- `scripts/command-center-summary.mjs`: CLI summary of urgent tasks.
- `.github/workflows/daily-monetization-reminder.yml`: daily GitHub reminder issue.
- `ops/pipeline/weekly-pipeline.json`: weekly sales board data.
- `scripts/pipeline-weekly-summary.mjs`: weighted pipeline and MRR summary.
- `.github/workflows/weekly-pipeline-reminder.yml`: weekly pipeline reminder issue.
- `ops/supervisor/latest-supervisor-report.example.json`: supervisor report JSON example.
- `scripts/supervisor-sync-command-center.mjs`: sync supervisor actions into command center tasks.

## Supervisor Sync Flow
1. Run reviewer + performance + deploy-prep.
2. Generate supervisor unified report with JSON appendix.
3. Save JSON to `ops/supervisor/latest-supervisor-report.example.json` or a custom path.
4. Sync into command center:
   - `npm run supervisor:sync:example`
   - or `npm run supervisor:sync -- <path-to-report.json>`

## Confidentiality
This repository is private and intended for internal usage only.
Do not publish proprietary logic, credentials, or customer data.

---

## DEMO MODE — Comandos oficiales

### 1. Demo completa (recomendada)
```
node ./dist/monetization/MonetizationRuntime.js --demo
```

### 2. Demo completa en TypeScript (sin build)
```
ts-node ./src/monetization/MonetizationRuntime.ts --demo
```

### 3. Demo extendida (loops + stress suave)
```
ts-node ./src/monetization/MonetizationRuntime.ts --demo-extended
```

### 4. Demo silenciosa (solo KPIs)
```
ts-node ./src/monetization/MonetizationRuntime.ts --demo-quiet
```

### 5. Demo agresiva (stress test)
```
ts-node ./src/monetization/MonetizationRuntime.ts --demo-stress
```
