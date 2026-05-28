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
- `docs/internal/MONETIZATION_ENGINE.md`: revenue model and execution cadence.
- `docs/internal/OFFER_CATALOG.md`: packaged offers with pricing ranges.
- `docs/internal/CLIENT_OUTREACH_PLAYBOOK.md`: outreach and proposal system.
- `ops/revenue/forecast.example.json`: forecast scenario examples.
- `scripts/revenue-forecast.mjs`: projection utility for revenue and MRR.
- `ops/command-center/`: interface for task monitoring and urgency signals.
- `scripts/command-center-summary.mjs`: CLI summary of urgent tasks.
- `.github/workflows/daily-monetization-reminder.yml`: daily GitHub reminder issue.
- `ops/pipeline/weekly-pipeline.json`: weekly sales board data.
- `scripts/pipeline-weekly-summary.mjs`: weighted pipeline and MRR summary.
- `.github/workflows/weekly-pipeline-reminder.yml`: weekly pipeline reminder issue.

## Confidentiality
This repository is private and intended for internal usage only.
Do not publish proprietary logic, credentials, or customer data.
