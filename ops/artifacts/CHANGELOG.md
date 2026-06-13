# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-13

### Recent Commits (60d)
- 53e71f5 2026-06-13 fix(rnd): R&D engine startup fixed — 12/12 agents PASS
- a7ff69b 2026-06-13 feat(report): live production report 92/100 A+ + animated agent bars
- e54085b 2026-06-13 fix(dash): agent efficiency sorted descending — best agents on top
- 736d6ad 2026-06-13 feat(dash): agent efficiency table — 21 agents with real-time % bars
- be10e78 2026-06-13 fix(dash): ALL data dynamic — product scores, leads, campaigns from live JSON
- 6ad44f3 2026-06-13 feat(dash): neon PRODUCTION before title + toggle + real-time 30s refresh
- baaa32d 2026-06-13 feat(dash): neon PRODUCTION sign replaces green dot — retro blink
- 112e355 2026-06-13 feat(engine): full startup sequence — 11/12 agents PASS, UI refinement 89/100, decisions logged
- bc66e22 2026-06-13 docs(engine): launch cadence — 2 products/sprint, 7-day cycles
- 69dde60 2026-06-13 feat(rnd): R&D pipeline feeds into Product Development Engine
- a7655d4 2026-06-13 feat(rnd): Product R&D Department — EU SaaS research + decision engine
- 1687697 2026-06-13 feat(agent): Creative Agent alive — persistent memory, 80/100 score, 6-channel output
- 5b1606f 2026-06-13 feat(agents): Campaign Designer v2 + Creative Agent with persistent memory
- 9e5e362 2026-06-13 feat(bot): real dashboard data + random facts from uselessfacts/cat/norris APIs
- 44bb88a 2026-06-13 fix(campaign): real data panel replaces shit popups — revenue, reach, headlines
- bc83ecc 2026-06-13 feat(bot): click sound + 6-click shit explosion (💩💥)
- bf664ca 2026-06-13 fix(bot): bigger face (80×100), thinner border (1px), less green glow
- 31b1ac5 2026-06-13 fix(bot): use original Copilot PNGs directly — no extraction
- e6e3c2e 2026-06-13 fix(bot): 9 Copilot faces, 10s cycle, cleaned unused faces
- 41137d2 2026-06-13 ElCaronFinal
- 9281385 2026-06-13 feat(bot): oval face + 12 Copilot faces cycling
- dcb78d2 2026-06-13 fix(bot): oval face (64×80px) + 273×340 resize for face fit
- 22ee097 2026-06-13 fix(bot): v3 smart crop — background removed BEFORE boundary detection
- 12936bc 2026-06-12 fix(bot): smart crop v2 — face detection, tight crop, 273×273 square
- a3d39c4 2026-06-13 failures-monitor: scan 2026-06-13T05:58
- 8cc6e45 2026-06-12 feat(bot): 12 individual face PNGs extracted with transparent backgrounds
- 2558076 2026-06-12 feat(bot): bot bubble cycles real dashboard facts every 4.5s
- cb3701c 2026-06-12 feat(bot): Tiger AI bot — 12 faces cycling, live dashboard data bubble
- 5572a83 2026-06-12 ProStudioPicsForHelpAIBot
- 2aa9071 2026-06-13 prod-engine: auto-cycle 2026-06-13T05:38

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
