# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-13

### Recent Commits (60d)
- 2123cbc 2026-06-13 prod-engine: auto-cycle 2026-06-13T18:36

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
