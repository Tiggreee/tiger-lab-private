# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-16

### Recent Commits (60d)
- 337e656 2026-06-16 fix(dashboard): Railway static routing — added checkout, client-dash, botFace, map-b
- 700a9b6 2026-06-16 feat: Discovery Agent + Design Agent wired to pipeline + top 3 MCP active
- dbbcb20 2026-06-16 migrate: Tiggreee → Tigre-Labs — 14 references updated in 8 files
- c866698 2026-06-16 fix(ui-host): remove public lock screen gate for main routes
- 27139fb 2026-06-16 MVP: Product API + Quality Verifier + README update + Bots vs Agents vs MCP
- ff499b3 2026-06-16 MVP: dual pricing MX/US + client portal + PLATA research
- 2a54730 2026-06-16 failures-monitor: scan 2026-06-16T06:18
- 4b32356 2026-06-16 PRODUCTION LAUNCH: 2 campaigns 100% ready + dead files purged + checkout fixed
- 2377108 2026-06-16 prod-engine: auto-cycle 2026-06-16T05:58
- 589d71a 2026-06-15 fix(linkedin): post to COMPANY PAGE (ORG_ID) not personal profile
- 95acdf3 2026-06-15 FASE 1-5: Design Agent + R&D recovered + 2000 leads + sandbox launch
- 0eb47c1 2026-06-15 feat(checkout): unified landing — Stripe + PayPal, per product pricing
- ef07d4c 2026-06-15 feat(payments): Stripe + PayPal URLs in every approved campaign
- 394c180 2026-06-15 feat(approval): REAL approval engine — campaign → social pack → funnel URL → ready to publish
- c243e26 2026-06-15 fix(pipeline): skip go-live check in DRY — non-critical autopilot
- a1e7792 2026-06-15 feat(db): unified event logger — SQL for ALL engine activity
- 983bb89 2026-06-15 stress-test: pipeline ON, autopilot DRY — no publish, 20min run
- 6ce773b 2026-06-15 fix(mcp): real MCP client working — 20 fake wrappers deleted, 3 functional
- 6f74453 2026-06-15 feat(mcp): 20 connectors generated + 20 agents restored + dashboard ranking
- ae287e6 2026-06-15 feat(mcp): activity tracker + ranking panel — usage %, top 10, impact scoring
- 0723946 2026-06-15 feat(mcp): 20 external MCP toggle panel in dashboard
- 37be5f6 2026-06-16 failures-monitor: scan 2026-06-16T03:45
- 20be17c 2026-06-16 prod-engine: auto-cycle 2026-06-16T03:18
- 75651b1 2026-06-15 fix: restore bot face (smaller), hover tooltips on all buttons, enrich map descriptions, Monitor/Supervisor now RECOVERY instead of INACTIVE
- 41be730 2026-06-15 fix(3D): shift entire scene 7vw right for visual centering
- 0b22cd0 2026-06-15 style: space theme redesign -- glass panels, indigo-teal gradient, no emojis, Pipeline renamed to Funnel in 3D, pivot shifted right, rotation sensitivity reduced
- 243e33d 2026-06-15 feat: add dev-engine + dev-portfolio agents, fix 3D viewport centering, add 3D nav button to infrastructure map
- fb01195 2026-06-15 fix(maps): 3D arrow — connections rotate with modules + B at 80% viewport
- 5f40d23 2026-06-15 feat(map): Design A fixed (growing L→R) + Design C 3D rotatable (drag to spin)
- 21479e7 2026-06-16 failures-monitor: scan 2026-06-16T01:35

### Added
- Stripe payment service with checkout, webhook, and signature verification
- PayPal payment service as fallback provider
- Lead intelligence pipeline with ICP config, outreach generation
- Social landing pages for 5 products across 5 channels
- Agent monitor scanning 22 agents across project
- Verification supervisor with 24 system checks
- Unified dashboard in ops/command-center/
- R&D INVEST pipeline: 7 ideas scored for EU market

### Changed
- Dashboard server root to ops/ for broader data access
- Payment routing to support dual provider (Stripe default, PayPal fallback)

### Fixed
- Dashboard fetch paths for unified data loading

### Security
- Payment signature verification for Stripe webhooks
- Auth middleware for billing routes
