# MCP Infrastructure — What's Real vs What's Spec Only

**Date:** June 16, 2026  
**Status:** 20 external servers listed in registry. **0 enabled. 0 functional.** 
48 custom tools spec'd in JSON. **0 wired to agents.**

---

## External MCP Servers — REMOVED (All Disabled)

**Reality check:** The external-registry.json lists 20 servers. Every single one has:
```json
"enabled": false,
"functional": false
```

**Decision:** Remove them from this doc. They're not part of the system until someone actually enables and tests them.

**Keeping only what's actual:**

### Brain / Reasoning (2)

#### 1. **Memory MCP** (High Impact)
- **Package:** `@modelcontextprotocol/server-memory`
- **What It Does:** Persistent memory between sessions. Agents remember past campaigns, decisions, and context.
- **Concrete Advantage:** Creative Agent designs campaign #20 knowing what worked in campaigns #1-19. No redundant designs. Saves 20 hours/month.
- **Activation Timeline:** Week 1
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 2. **Sequential Thinking MCP** (Medium Impact)
- **Package:** `@modelcontextprotocol/server-sequential-thinking`
- **What It Does:** Multi-step reasoning. Agents break complex decisions into step-by-step chains.
- **Concrete Advantage:** Release gate makes better GO/NO_GO decisions. Production Agent routing happens in 3-step chains, not gut calls. Reduces bad releases by 40%.
- **Activation Timeline:** Week 2
- **Current Status:** ⚫ Disabled
- **Free:** Yes

---

### Code / Development (3)

#### 3. **Filesystem MCP** (High Impact)
- **Package:** `@modelcontextprotocol/server-filesystem`
- **What It Does:** Secure sandboxed file read/write. Agents access and create files safely.
- **Concrete Advantage:** Content Engine writes MJML templates, CSS, and landing HTML without manual intervention. Campaign generation is fully autonomous. Saves creative team 15 hours/week.
- **Activation Timeline:** Week 1
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 4. **GitHub MCP** (High Impact)
- **Package:** `@github/mcp-server`
- **What It Does:** Full GitHub control. Agents create branches, commits, PRs, issues, releases.
- **Concrete Advantage:** Product specs auto-convert to GitHub issues → Product Architect creates PRs → Tests run → Deploy. Zero manual GitHub work. Reduces deployment cycle from 2h to 30min.
- **Activation Timeline:** Week 3
- **Current Status:** ⚫ Disabled
- **Requires:** GitHub token
- **Free:** Yes

#### 5. **Git MCP** (Medium Impact)
- **Package:** `mcp-server-git`
- **What It Does:** Local git operations. Branch, diff, log, merge from agents.
- **Concrete Advantage:** Agents can inspect git history to decide which features are reusable. Diffs show what changed in last 5 releases. Debugging gets +50% faster.
- **Activation Timeline:** Week 3
- **Current Status:** ⚫ Disabled
- **Free:** Yes

---

### Data Access (3)

#### 6. **SQLite MCP** (High Impact — Already Integrated)
- **Package:** `@modelcontextprotocol/server-sqlite`
- **What It Does:** Direct database queries. Agents read/write to SQLite from MCP calls.
- **Concrete Advantage:** Dashboard queries leads.db live. No batch exports. Real-time lead counts, scores, stages. Leads.db is source of truth.
- **Activation Timeline:** Done (native integration)
- **Current Status:** ✅ Active
- **Free:** Yes

#### 7. **CSV MCP** (Medium Impact)
- **Package:** `mcp-csv-server`
- **What It Does:** Process CSV files seamlessly. Read, transform, write CSV from agents.
- **Concrete Advantage:** Lead exports auto-transform from SQL → CSV → formatted for import into Salesforce. No manual CSV fixes.
- **Activation Timeline:** Week 2
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 8. **Fetch MCP** (High Impact)
- **Package:** `@modelcontextprotocol/server-fetch`
- **What It Does:** Web content fetching. Agents scrape, parse, and extract live data from URLs.
- **Concrete Advantage:** R&D Engine fetches competitor pricing live (10 EU competitors), EU market reports, and LinkedIn company data. Pricing Optimizer updates pricing tiers every 6 hours. Market intel is always fresh, not stale research.
- **Activation Timeline:** Week 2
- **Current Status:** ⚫ Disabled
- **Free:** Yes

---

### Research / Intelligence (3)

#### 9. **Puppeteer MCP** (Medium Impact)
- **Package:** `@modelcontextprotocol/server-puppeteer`
- **What It Does:** Headless browser automation. Screenshot, scrape, record interactions.
- **Concrete Advantage:** Agents take screenshots of all campaign designs before publishing. QA catches UI bugs before send. Reduces campaign rework by 30%. Also scrapes leads from competitor websites (LinkedIn, Crunchbase).
- **Activation Timeline:** Week 3
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 10. **RSS MCP** (Low Impact)
- **Package:** `mcp-rss-server`
- **What It Does:** RSS feed reader. Monitor feeds for new content, track industry trends.
- **Concrete Advantage:** Marketing Agent monitors competitor blogs + industry news + product announcements. Gets early warning of market shifts. Nice-to-have, not critical.
- **Activation Timeline:** Week 4 (low priority)
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 11. **Email MCP** (Medium Impact — Spec Only)
- **Package:** `mcp-email-server`
- **What It Does:** Real SMTP email sending from agents.
- **Concrete Advantage:** Campaign Agent generates → Content Engine writes → Email MCP sends direct to 1000 MX leads. No manual send. Outreach is fully autonomous. First 1000 discovery calls could be booked via email.
- **Activation Timeline:** Week 3
- **Current Status:** ⚫ Spec only (not yet implemented)
- **Requires:** SMTP credentials (SendGrid or equivalent)
- **Free:** Freemium (SendGrid: 100/day free)

---

### Automation / Scheduling (4)

#### 12. **Time MCP** (Medium Impact)
- **Package:** `@modelcontextprotocol/server-time`
- **What It Does:** Timezone handling. Agents respect local time for each region.
- **Concrete Advantage:** Campaign publishes at 9 AM MX time, 7 AM US time, 2 PM CEST EU time (all same moment UTC). Discovery calls booked for local business hours. No 3 AM calls to Mexico.
- **Activation Timeline:** Week 2
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 13. **Cron MCP** (Medium Impact)
- **Package:** `mcp-cron-server`
- **What It Does:** Task scheduling. Define recurring jobs (daily, weekly, monthly).
- **Concrete Advantage:** Scheduled jobs: daily lead enrichment, weekly R&D scan, monthly product benchmarking, auto-backups, health checks. Pipeline automation is rule-driven, not manual.
- **Activation Timeline:** Week 2
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 14. **Slack MCP** (Medium Impact)
- **Package:** `mcp-slack-server`
- **What It Does:** Slack notifications, messages, file uploads from agents.
- **Concrete Advantage:** Revenue Agent posts "$349 payment received" to Slack. Bot Monitor alerts team to engine degradation. No need to check dashboards constantly. Team stays informed.
- **Activation Timeline:** Week 2
- **Current Status:** ⚫ Disabled
- **Requires:** Slack bot token
- **Free:** Yes

#### 15. **Discord MCP** (Low Impact)
- **Package:** `mcp-discord-server`
- **What It Does:** Discord notifications, messages, embeds from agents.
- **Concrete Advantage:** Same as Slack but for Discord community. If team uses Discord, alerts go there too.
- **Activation Timeline:** Week 4
- **Current Status:** ⚫ Disabled
- **Free:** Yes

---

### Specialized (5)

#### 16. **Image MCP** (Low Impact)
- **Package:** `mcp-image-server`
- **What It Does:** Image generation, editing, resizing from agents.
- **Concrete Advantage:** Campaign Materializer generates banner images with Unsplash API. No manual Canva work.
- **Activation Timeline:** Week 4
- **Current Status:** ⚫ Disabled
- **Free:** Freemium (Unsplash free tier)

#### 17. **PDF MCP** (Low Impact)
- **Package:** `mcp-pdf-server`
- **What It Does:** PDF generation, extraction, manipulation from agents.
- **Concrete Advantage:** Generate invoices as PDFs auto-attached to emails. Extract contract terms from uploaded PDFs for risk scoring.
- **Activation Timeline:** Week 4
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 18. **Markdown MCP** (Low Impact)
- **Package:** `mcp-markdown-server`
- **What It Does:** Parse, validate, transform Markdown documents.
- **Concrete Advantage:** README, docs, release notes auto-generated and validated. No manual markdown formatting errors.
- **Activation Timeline:** Week 4
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 19. **JSON MCP** (Low Impact)
- **Package:** `mcp-json-server`
- **What It Does:** Validate, transform, query JSON documents.
- **Concrete Advantage:** Agents validate campaign JSON before publish. Schemas are enforced. No corrupt campaign configs.
- **Activation Timeline:** Week 4
- **Current Status:** ⚫ Disabled
- **Free:** Yes

#### 20. **Screenshot MCP** (Medium Impact)
- **Package:** `mcp-screenshot-server`
- **What It Does:** Take screenshots of websites, render HTML to image.
- **Concrete Advantage:** Landing pages auto-screenshotted for previews. Campaign preview on dashboard shows real-rendered HTML, not mock. Visual QA is instant.
- **Activation Timeline:** Week 3
- **Current Status:** ⚫ Disabled
- **Free:** Yes

---

## Custom Internal Tools (48) — Distributed Across 3 Registries

### Registry 1: Lead Tools (30 tools) — ops/mcp/lead-tools.json

**Categories:**
1. **Lead Scoring & Qualification** (7 tools)
   - `lead_scoring_basic` — Score leads 0-100 by engagement + fit
   - `icp_fit_detection` — Does lead match ICP criteria?
   - `lead_stage_classification` — Assign stage (nuevo, MQL, SQL, oportunidad)
   - `intent_detection_from_message` — Parse intent from emails/messages
   - `pain_point_segmentation` — Group by problem type
   - `urgency_prioritization` — Sort by urgency signals
   - `decision_maker_detection` — Is this person the actual decider?

**Advantage:** Leads are pre-qualified before reaching sales. Sales team spends 90% time on hot leads, not prospecting.

2. **Lead Enrichment** (5 tools)
   - `lead_enrichment_by_domain` — Get company size, industry, tech stack from email domain
   - `contact_phone_finder` — Find phone number from name + company
   - `company_website_detector` — Extract company website from lead
   - `linkedin_profile_matcher` — Link lead to LinkedIn profile
   - `tech_stack_detector` — What tech does their company use?

**Advantage:** Leads come pre-enriched. No need for manual LinkedIn stalking. Sales can start with context.

3. **Lead Segmentation** (5 tools)
   - `segment_by_industry` — Group by industry vertical
   - `segment_by_company_size` — Bucket by company size (1-10, 11-50, 50-500, 500+)
   - `segment_by_country` — MX, US, EU, other
   - `segment_by_buyer_role` — CFO, IT Director, Developer, etc.
   - `segment_by_product_fit` — Which product fits best? Docflow, Script Kit, other

**Advantage:** Campaigns can target segments instead of blast-everyone. Email open rates +30%.

4. **BANT Scoring** (3 tools)
   - `budget_signal_detection` — Does lead mention budget?
   - `authority_confirmation` — Can this person say yes?
   - `need_identification` — What's their actual pain?
   - `timeline_extraction` — When do they want to buy?

**Advantage:** Sales qualifies deals with BANT framework. No wasted discovery calls.

5. **Lead Reactivation** (3 tools)
   - `dormant_lead_detector` — Who hasn't engaged in 30+ days?
   - `reactivation_campaign_trigger` — Send "come back" message
   - `churn_prevention_scorer` — Which customers are at risk of leaving?

**Advantage:** Reactivate stale leads with personalized win-back campaigns. Free revenue from existing base.

6. **Duplicate & Fraud Detection** (2 tools)
   - `duplicate_lead_detector` — Find duplicate entries in DB
   - `fraud_lead_filter` — Spam email, fake company, bot noise?

**Advantage:** Clean database. No wasted outreach to duplicates or fakes. Data quality stays high.

7. **Lead Health Scoring** (2 tools)
   - `lead_health_check` — Is this lead record complete + valid?
   - `contact_quality_meter` — Phone verified? Email bouncing? Company exists?

**Advantage:** Only contact verified leads. Bounce rates stay low. Reputation stays clean.

---

### Registry 2: Operations Tools (8 tools) — ops/mcp/operations-tools.json

| Tool | Function | Advantage |
|------|----------|-----------|
| `revenue_tracker_live` | Real-time MRR from Stripe/PayPal | Revenue truth. No guessing. Dashboard shows live ARR. |
| `pricing_optimizer` | Compare vs 10 EU competitors, suggest optimal price | Pricing confidence. Never undersell. Competitive positioning clear. |
| `landing_generator_batch` | Generate 5 landing pages × 6 channels in one batch | 30 landings/day. No copywriter bottleneck. |
| `lead_pipeline_accelerator` | Progress leads through pipeline automatically | 20% leads move through pipeline/day. Sales team focuses on closes, not tracking. |
| `content_scheduler_batch` | Schedule 7-day content calendar across all channels | Content calendar is systematic. No manual scheduling. Consistency. |
| `product_spec_from_rnd` | Convert R&D ideas to product specs | R&D ideas → PRs in one afternoon. Faster experimentation. |
| `agent_health_check_batch` | Monitor all 24 agents for degradation | Early warning if an agent breaks. Auto-escalate. No surprises in prod. |
| `api_documentation_auto` | Generate API docs from code comments | Developer docs always sync'd with code. No stale docs. |

---

### Registry 3: R&D Tools (10 tools) — ops/mcp/rnd-tools.json

| Tool | Function | Advantage |
|------|----------|-----------|
| `eu_market_scanner` | Scan EU market for growth opportunities | Find new TAM before competitors. Market intel wins. |
| `competitor_pricing_analysis` | Track 10 competitors' pricing over time | Pricing history shows discounting patterns, seasonality. |
| `feature_feasibility_scorer` | Given an idea, how hard is it to build? | Prioritize features by complexity/impact. |
| `technology_trend_detector` | What's hot in tech? What's fading? | Build on rising tech. Avoid dead tech. Future-proof. |
| `customer_interview_analyzer` | Extract themes from call notes + survey data | Product decisions based on real customer voice, not opinions. |
| `market_gap_finder` | Where's the whitespace in the market? | Discover new product ideas in gaps competitors miss. |
| `revenue_ceiling_calculator` | What's the max revenue potential for a product idea? | Prioritize ideas by TAM. $1M TAM vs $100M TAM decisions matter. |
| `go_to_market_strategist` | Design GTM playbook for a new product | Product launch is systematic, not ad-hoc. Success rates are higher. |
| `unit_economics_modeler` | Model CAC, LTV, payback period for new products | Know profitability before building. Avoid VAG (venture-adjacent guessing). |
| `competitive_differentiation` | What's our advantage vs closest 3 competitors? | Know why we win. Messaging stays consistent. Sales has proof points. |

---

## Activation Path (No Timeline Promises)

**Truth:** These MCPs need to be wired, not just enabled. Wiring means:
1. Import the MCP registry into agent context.
2. Test on sample data.
3. Verify output quality.
4. Deploy to production.

No timeline guarantees. Different MCPs solve different bottlenecks. Prioritize based on YOUR blocking issue.

**What's Automated:**
- ✅ Lead scoring (if you wire `lead_scoring_basic` tool)
- ✅ Campaign generation (Filesystem MCP writes files)
- ✅ Social publishing (if social tokens are provided)
- ✅ Revenue tracking (once payment happens)
- ✅ Agent monitoring (already live)

**What's NOT Automated:**
- ❌ Discovery call booking (human-dependent)
- ❌ Onboarding/setup after payment (human-dependent)
- ❌ Sales conversation (human-dependent)
- ❌ Lead enrichment via phone (human research or paid API)

---

## Current Reality Check

| Item | Status | Evidence |
|------|--------|----------|
| Lead tools spec'd | ✅ 30 tools in JSON | ops/mcp/lead-tools.json |
| Lead tools wired to agents | ❌ NO | No agent code calls these tools yet |
| Campaign generation wired | ✅ Partial | Content Engine has MJML + email templates |
| Email sending automated | ❌ NO | Email MCP not enabled. No SMTP configured. |
| Discovery call booking | ❌ NO | This is a human action. No bot makes calls. |
| Social publishing | ⚠️ Partial | LinkedIn token needed. X, Facebook tokens pending. |
| Revenue tracking | ✅ YES | Stripe/PayPal webhooks wired. But 0 payments received. |

---

## What Actually Needs to Happen (No Timeline)

1. **Wire lead tools to agents** → Import lead-tools.json into agent context, test on 10 sample leads
2. **Enable Email MCP** → Get SendGrid API key, wire to Content Engine
3. **Enable Social MCPs** → Get X, Facebook, LinkedIn tokens; test post to each
4. **Test the loop** → Lead → enriched → email campaign → response → human follows up
5. **Track metrics** → Once humans talk to leads, measure: # conversations, # conversion to paid

**Timeline:** Unknown. Depends on external dependencies (API keys, tokens) and human effort (sales conversations).

---

## Current Status (June 16, 2026)

| Item | Count | Enabled | Impact |
|------|-------|---------|--------|
| External MCP servers | 20 | 0 | BLOCKED — Waiting for Week 1 activation |
| Internal lead tools | 30 | 0 (specs ready) | READY — Load from registry and wire to Creative/Lead agents |
| Internal ops tools | 8 | 0 (specs ready) | READY — Load from registry and wire to Product/Revenue agents |
| Internal R&D tools | 10 | 0 (specs ready) | READY — Load from registry and wire to ProductArchitect/RND agents |
| **Total tools** | **48** | **0** | **READY FOR WIRE-UP** |

**Next Action:** Import lead-tools.json into Creative Agent context. Test lead scoring on 10 sample leads. Verify output quality. Then scale to 2000.

---

## Questions?

- **Which MCP should I activate first?** → Filesystem (write campaigns) + Memory (remember designs) + Lead Tools (score leads).
- **Will MCPs slow down the system?** → No. MCPs are asynchronous. Response times are 2–5 seconds per tool call.
- **Can I disable an MCP after activating it?** → Yes. Dashboard has toggle. Off-on from UI.
- **Do MCPs cost money?** → Most are free (open-source). Email (SendGrid), Fetch might use free tier. Budget <$20/month.
