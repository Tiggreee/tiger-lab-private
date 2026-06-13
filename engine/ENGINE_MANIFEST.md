# TigerLab Engine — Architecture Manifest

## Core Principle
The engine is MODULAR and PORTABLE. Zero hard dependency on GitHub.
All business logic lives in `/engine/`. All platform adapters in `/integrations/`.

## Directory Map

```
/engine/
  /campaigns/          Campaign design, routing, execution
  /email/              Email templates, prospect selection, AI images
  /leads/              Lead scoring, enrichment, ICP matching
  /agents/             Agent definitions, skills, orchestration
  /funnels/            Conversion funnels, landing pages, CTAs
  /analytics/          Dashboards, metrics, reports
  /runtime/            Starters, entrypoints, config

/integrations/
  /github/actions/     Workflow YAML wrappers (thin)
  /github/pages/       Landing page adapters
  /github/packages/    Package publishing adapters
  /github/apps/        GitHub App handlers
  /railway/            Railway deploy adapters
  /social/             Social media platform adapters
  /payments/           Stripe, PayPal adapters

/ops/
  /database/           SQLite, Oracle DDL
  /runtime/            Auto-generated reports, metrics
  /mcp/                MCP tool definitions (product specs)
  /catalog/            Product catalog, pricing
  /command-center/     Dashboard UI
```

## Runtime Modes

### WITH GitHub (current)
- Actions schedule and run pipelines
- Pages host landings and dashboards
- Packages distribute engine components
- Apps/Webhooks integrate with client repos

### WITHOUT GitHub (portable)
- cron + Docker Compose
- Railway or any VPS
- npm scripts + HTTP endpoints
- Local SQLite (swap to PostgreSQL if needed)

## Migration Rules
1. NEVER put GitHub-specific code in /engine/
2. All engine modules use config/env, not hardcoded paths
3. Integration adapters are thin wrappers (≤50 lines each)
4. Every module has a clear contract: inputs → outputs → side effects
