# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-17

### Recent Commits (60d)
- b7af871 2026-06-17 feat(batch): 250 unique posts/day — 25 variants × 5 networks
- 84a0e65 2026-06-17 fix: regenerate campaigns locally + quality verified 2/2
- e1667c2 2026-06-17 fix(pipeline): remove --live — autopilot waits for dashboard APPROVE
- fec4fe9 2026-06-16 fix(qa): proper X≤280 copy, real HTML email, full body telegram/discord, copy validation, live Unsplash/Pexels/Pixabay API, unit tests for campaign pipeline, README updated
- 7ff9a18 2026-06-16 Merge branch 'hotfix/creative-agent-improvements'
- 4f972e3 2026-06-16 docs(campaign-system): add 4-agent campaign creation workflow documentation
- ed93c9f 2026-06-16 feat(campaign-creation): add Visual Designer + Asset Generator agents for professional image sourcing from free stock (Unsplash, Pexels, Pixabay)
- 580262b 2026-06-16 fix(3d): connection references match actual node names
- 2b1da2b 2026-06-16 fix(map): restored 3D — wider, vertical downward layout
- ae44b9b 2026-06-16 feat(creative-agent): add Market Researcher right-hand partner with market insights, copy angles, and segment analysis
- a81ccbe 2026-06-16 fix(autopilot): inject funnel URL into existing landing-social pack
- 76744a7 2026-06-16 feat(map): cascade waterfall layout — 5 layers, drag to rotate 3D
- 4658847 2026-06-16 fix(3d): center map horizontally with margin offset
- 053d0ad 2026-06-16 fix(autopilot): add funnel URL to landing-social pack — go-live now passes
- e0bf11b 2026-06-16 feat(engine): add fail-open module bypass alerts and 5+2 wave planner (max 21); update README
- 725198e 2026-06-16 Fix: Remove fake MCP claims. Add real automated revenue loop workflow (email-only MVP). Update README to reflect actual automation status.
- 910c16f 2026-06-16 fix(governance): harden truth checks and correct status docs
- 07a127e 2026-06-16 chore(domains): remove legacy host traces and unify Railway URLs
- f18abac 2026-06-16 fix: replace dead github.io link with Railway URL in ui-host README
- f336b15 2026-06-16 FASE 1-4: pipeline --live + dependabot + leads + MCP + event logger
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
