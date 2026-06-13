# TigerLab — Contingency & Fallback Plan
# Engine: /engine/CONTINGENCY.md
# Activated automatically on failure detection.

## Plan A: Normal Operation (6 AM daily)
```
lead-engine → prospect-selector → email-campaign → creative-agent → autopilot → publish
```
All 12 agents fire. All 6 channels publish. Dashboard updates. Report generated.

## Plan B: Degraded Mode (if any critical agent fails)

### Trigger: Agent failure detected by Failures Monitor
```
IF lead-engine FAILS → skip lead generation, use cached leads (last 24h)
IF creative-agent FAILS → use last approved campaign (CAMP-latest)
IF autopilot FAILS → publish to LinkedIn only (most reliable channel)
IF gate NOT GO → pause all publishing, alert dashboard
IF Stripe FAILS → fallback to PayPal only
IF Railway BACKEND DOWN → serve from GitHub Pages (static mode)
IF GitHub Actions DOWN → switch to local cron + Railway direct
IF LinkedIn token EXPIRES → remove LinkedIn from channels, keep 5/6
```

### Maximum degraded mode still delivers:
- 3/6 channels minimum (LinkedIn + email + Telegram)
- Last-known campaigns (from cache)
- Dashboard still accessible (GitHub Pages fallback)
- Revenue collection still active (Stripe + PayPal)

## Plan C: Full Recovery (triggered after any failure)
```
1. Failures monitor detects issue
2. Dashboard monitor alerts
3. Engine startup retries failed agents (max 3 retries)
4. If retries exhausted → Plan B
5. Hourly health check: if agent recovers → back to Plan A
```

## Contingency Checklist

| Scenario | Auto-action | Manual action |
|---|---|---|
| Stripe API down | Switch to PayPal | Check Stripe status page |
| LinkedIn 403 | Skip LinkedIn, keep 5 channels | Verify token in LinkedIn Dev Console |
| Railway deploy fails | GitHub Pages fallback | `railway up` from CLI |
| Lead DB empty | Use US + MX seed generator | Run `node engine/leads/us-lead-generator.mjs` |
| All channels down | Queue campaigns, retry at next cycle | Check API keys in GitHub Secrets |
| GitHub Actions disabled | Local cron: `node engine/runtime/engine-startup.mjs` | Verify GitHub billing |
| 0 revenue for 7 days | Auto-escalate: `ops/runtime/escalation.json` | Check Stripe + PayPal dashboards |

## Self-Healing
- Every 2h: Failures Monitor scans all agents
- Every 15m: Dashboard Monitor checks health
- Every 6h: Engine startup retry (if degraded)
- Every 24h: Production report regenerates grade
