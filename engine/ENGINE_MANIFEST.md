# TigerLab Engine — Architecture Manifest

## Core Principle
The engine is MODULAR and PORTABLE. Zero hard dependency on GitHub.
All business logic lives in `/engine/`. All platform adapters in `/integrations/`.

## Directory Map

```
/engine/
  /runtime/            Gate checks, failure analysis, operational logic
    failures-monitor.mjs   Failure classification & root cause analysis
    production-gate.mjs    Structural checks, gate computation, reports
  /campaigns/          Campaign design, routing, execution
    campaign-designer.mjs  Campaign template generation
    campaign-router.mjs    Multi-channel campaign routing
  /email/              Email templates, prospect selection, AI images
    email-campaign.mjs
    prospect-selector.mjs
  /leads/              Lead scoring, enrichment, ICP matching, outreach
    inegi-seed-generator.mjs  DENUE-INEGI company seed generation (1000+)
    lead-engine.mjs           SQLite DB ops, seed loading, OSM enrichment, CSV export
    lead-intelligence.mjs     ICP-based lead generation, outreach text, pipeline mgmt
  /agents/             Agent definitions, skills, orchestration
    CampaignDesigner.agent.md
  /funnels/            Conversion funnels, landing pages, CTAs
  /analytics/          Dashboards, metrics, reports

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

## Script → Engine Mapping

| Script (thin wrapper) | Engine Module | GitHub Deps in Wrapper |
|---|---|---|
| `scripts/failures-monitor.mjs` | `engine/runtime/failures-monitor.mjs` | `gh run list`, `gh run rerun` |
| `scripts/production-go-no-go.mjs` | `engine/runtime/production-gate.mjs` | `gh run list` (P12, P14), `npm` (P8, P9) |
| `scripts/lead-engine.mjs` | `engine/leads/lead-engine.mjs` | None |
| `scripts/lead-intelligence.mjs` | `engine/leads/lead-intelligence.mjs` | None |

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
