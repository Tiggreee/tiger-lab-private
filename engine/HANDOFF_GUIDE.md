TigerLab Engine — Complete Handoff Guide
===========================================

ARCHITECTURE:
/engine/           → Core business logic. ZERO GitHub deps. Portable.
  /runtime/        → Gate, failures, monitor, startup, full-pipeline
  /campaigns/      → Creative Agent, Campaign Designer, Materializer, Router
  /email/          → Prospect Selector, Email Campaign engine
  /leads/          → Lead Engine (MX), US Lead Generator, Contact Generator
  /rnd/            → R&D Engine (EU), Advanced R&D (25 specialists), Teams
  /agents/         → Agent definitions (.agent.md)
/integrations/     → Thin adapters. GitHub, Railway, Social.
  /github/         → engine-bridge.mjs (calls core from Actions)
/scripts/          → Thin wrappers (≤50 lines). Import from /engine/
/ops/              → Runtime data, database, catalog, MCP tools, command-center
  /command-center/ → Dashboard (index.html + app.js + campaign-preview.html)
  /mcp/            → 40 MCP tool definitions
  /runtime/        → Auto-generated: reports, campaigns, decisions, alerts

CRITICAL FILES:
- engine/runtime/full-pipeline.mjs  → ONE command to run everything
- engine/runtime/production-report.mjs → A+ grade every run
- engine/campaigns/campaign-materializer.mjs → REAL marketing assets
- ops/command-center/index.html → Dashboard (port 4310)
- ops/runtime/campaigns/index.json → Campaign list for dashboard
- engine/CONTINGENCY.md → Plan A/B/C failover

DAILY COMMANDS:
1. npm run command-center          → Start dashboard (localhost:4310)
2. node engine/runtime/full-pipeline.mjs → Run everything
3. Open dashboard → Campaign Panel → Click campaign → APPROVE
4. node scripts/traffic/run-autopilot.mjs --live → Publish approved

PIPELINE SCHEDULE (GitHub Actions):
- Mon-Fri: 6 AM CDT (12 UTC)
- Sat: 6 AM-2 PM CDT (12-20 UTC), every hour
- Sun: OFF

WHAT THE ENGINE DOES (autonomously):
- LinkedIn posting (LIVE token with w_member_social)
- Stripe + PayPal payment processing (LIVE keys)
- Lead generation (2000 MX+US companies, 10K contacts)
- R&D (3 teams, 25 specialists, 5 research lines)
- Campaign generation (6 channels per product)
- Dashboard monitoring (every 15min)
- Production gate (14 checks, GO/NO-GO)

WHAT IT DOES NOT DO:
- Generate professional graphic design (needs DALL-E/Midjourney API)
- Write human-quality creative copy (needs human input)
- Replace a marketing agency

NEXT STEPS FOR NEXT EDITOR:
1. Connect Campaign APPROVE → Autopilot → Publish (currently manual)
2. Add DALL-E API key for real image generation
3. Make dashboard 24/7 (currently runs locally)
4. Close first real sale through Stripe
5. Complete SW Sapien PAC → FacturAutentico (56→84)
6. Improve Lead Engine to 5000+ real companies
