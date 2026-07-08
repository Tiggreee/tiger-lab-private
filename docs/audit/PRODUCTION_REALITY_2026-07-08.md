# Production Reality — Evidence-Based Audit (2026-07-08)

Owner: this document is factual and evidence-based. No marketing language. Every claim below is
backed by a command you can run yourself in this repo. Read the whole thing once before acting.

---

## 0) The single most important finding

Your local working folder was a **stale 15-day-old snapshot** (HEAD dated 2026-06-17). The real
project on `origin/main` was **45 commits / ~23,600 lines ahead** (dated 2026-07-02) and already
contained the **CFDI 4.0 timbrado system**, campaign quality gate, bot orchestrator and their
tests. Your local folder has now been fast-forwarded to that real state.

That is why you said *"they are there, I was getting those by terminal"* — you were right. On the
real code those flows exist. Your local copy simply predated them.

**Verdict on the real code:**

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm run test:unit` | **58/58 pass** |
| Production gate | `npm run prod:gate` | **GO — 21 pass / 0 warn / 0 fail** |
| Fiscal reconciliation | `npm run billing:reconcile:strict` | **MATCH (PASS)** |
| Dashboard smoke | `npm run prod:dashboard:smoke` | **PASS** |

The code is real and structurally healthy. **Nothing is broken in code.** Every red flow you
reported traces to **unset secrets**, not missing functionality.

---

## A) What is REAL and working right now

- **Product catalog + dashboard + approve/deny**: the dashboard smoke and campaign-index alignment
  gates PASS. The console reads real catalog and campaign data.
- **Checkout wiring**: campaign go-live checklist shows the close/CTA links point at a **real
  production URL** (`https://tiger-backend-production.up.railway.app/checkout?product=...`), not
  `example.com`. The plumbing to take money is real.
- **CFDI 4.0 timbrado tooling** (`timbox-*.mjs`, `sign-and-timbrar.php`, `timbox-manifest-e2e-check`):
  real SAT-cadena-original XSLT signing pipeline.
- **LLM layer already integrated** (`tests/unit/runtime/llm-provider.test.ts` passes): uses a real
  provider when a key is present, and a **deterministic template fallback** when it is not. You are
  not blocked on AI to generate copy.
- **Secrets governance**: `.env` / `.env.production` are gitignored. No credential is committed.

## B) What is BLOCKED — and the exact reason (all secrets, not code)

Run `npm run traffic:go-live`. Infra checks PASS; every failure is a **missing secret**:

1. **No revenue** -> billing secrets are not set in the server runtime.
   Required (see `ops/playbooks/secrets-golive-runbook.md` sec.1): `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=live`,
   `PAYPAL_WEBHOOK_ID`, plus real `*_RETURN_URL`/`*_CANCEL_URL`. Without these the checkout page
   cannot charge a card, so revenue is structurally impossible regardless of code quality.
2. **CFDI invoice** -> `FACTURAMA_API_KEY`, `FACTURAMA_API_SECRET` not set (runbook sec.1). Timbrado
   tooling exists but has no PAC credentials to call.
3. **Campaigns only hit your personal account/webpage** -> the 5 automated channels are all
   `FAIL (missing)`: LinkedIn, X, Facebook, Telegram, Discord secrets are absent (runbook sec.2).
   With zero channel tokens, the only place anything can appear is a manual/personal post. Set the
   tokens and each channel flips to READY (`npm run traffic:ready`).
4. **"Agents don't make new products"** -> the engine runs, but with no LLM key it produces
   deterministic template drafts, and nothing auto-promotes to the live catalog without approval.
   That is a safety feature, not a bug. Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` for real
   generation (runbook sec.3).

**Summary: 100% of your red flows are configuration, 0% are code.**

## C) What AI / automation genuinely CANNOT do for you (and why)

These are hard external constraints. No amount of code, prompt, or local model bypasses them,
because they are enforced by third parties and by law. This is the "clarity on AI limits" you asked
for:

1. **Create a payment merchant account.** Stripe/PayPal require KYC identity verification tied to a
   real legal entity/bank. Only you can complete it. Until done, `STRIPE_SECRET_KEY` does not exist
   to set.
2. **Get social publishing approved.** Meta (Facebook), X, LinkedIn each require you to create a
   developer app, request publishing permissions, and pass **app review**. X's write API is a
   **paid** tier. Tokens are issued to *your* account after *their* review — an AI cannot approve
   an app on your behalf.
3. **Issue CFDI.** In Mexico, CFDI 4.0 must be stamped by a **SAT-authorized PAC** using your
   **CSD / e.firma**. That is a government requirement. The code can call a PAC; it cannot *be* one,
   and it cannot self-issue your CSD.
4. **Guarantee a sale.** Automation can publish and present checkout, but a human with a valid card
   must choose to buy. AI cannot manufacture demand or a paying customer.
5. **Turn GitHub credits into cash.** GitHub for Startups / included usage are **discounts on
   GitHub products** (Actions minutes, storage, LFS, Packages), not spendable cloud money and not
   revenue. They lower your infra cost; they do not pay you.

Everything else — scheduling, drafting, packaging, gating, reconciliation — is automatable and is
already built here.

## D) Exact ordered steps to go live (run in this order)

Follow the project's own runbook: `ops/playbooks/secrets-golive-runbook.md`.

**Step 1 — Billing (Tier A, unblocks revenue). Set in the server runtime (Railway service env), not just your shell.**
- Stripe Dashboard -> Developers -> API keys (Live) -> `STRIPE_SECRET_KEY`; Webhooks -> signing
  secret -> `STRIPE_WEBHOOK_SECRET`.
- PayPal Developer -> My Apps (Live) -> `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, set
  `PAYPAL_MODE=live`, and app Webhooks -> `PAYPAL_WEBHOOK_ID`.
- Set real `STRIPE_RETURN_URL`/`STRIPE_CANCEL_URL`/`PAYPAL_RETURN_URL`/`PAYPAL_CANCEL_URL`.
- Verify: `node scripts/production-trial-preflight.mjs` (step T4 must pass) and
  `node scripts/verify-systems.mjs` (Stripe/PayPal leave WARN).

**Step 2 — CFDI (only if you invoice fiscally in MX).**
- Get `FACTURAMA_API_KEY` / `FACTURAMA_API_SECRET` from your PAC panel; set in runtime.
- Verify: `npm run billing:sat:check` and `npm run timbox:manifiesto:check:strict`.

**Step 3 — Publishing (Tier A, at least 1 channel). Set as GitHub repo Secrets (Actions consume them).**
- Fill the exact names from runbook sec.2 for the channel(s) you want (start with Telegram or
  Discord — easiest: `@BotFather` token + chat id / Discord bot token + channel id).
- Helper: `bash scripts/traffic/setup-social-secrets.sh` (interactive) or
  `bash scripts/traffic/push-social-secrets-to-railway.sh`.
- Verify: `npm run traffic:go-live` (target channel flips FAIL->PASS) and
  `node scripts/validate-social-secrets.mjs`.

**Step 4 — (Optional) Real AI copy.**
- Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (runbook sec.3). Without it the deterministic fallback
  keeps working.
- Verify: `node engine/campaigns/creative-agent.mjs --enhance --product "Docflow API" --segment contabilidad`
  (should stop reporting "template").

**Step 5 — Publish + reconcile.**
- `npm run traffic:publish:dry` then `npm run traffic:publish`.
- After any sale: `npm run billing:reconcile:strict` **before** treating it as closed (governance
  guardrail — never provision before payment confirmation).

**Guardrails that never get skipped** (from the runbook / repo governance):
- Never provision before the payment is confirmed.
- Reconciliation (`billing:reconcile:strict`) is required before a sale is "closed".
- Never use `example.com` or placeholder URLs in production.

## E) Local LLM / AI-credits reality

- Your billing screenshot shows **17,901 AI credits remaining** — you are **not** out. If they run
  out, generation is not a hard blocker: the built-in **deterministic fallback** keeps drafting, and
  you can point the LLM layer at any provider key you already pay for.
- A **local LLM** (e.g. Ollama on your other PC) can draft/enhance copy **offline and free** — wire
  it as the provider behind the same `llm-provider` interface. What a local model **cannot** do:
  post to social platforms, charge cards, stamp CFDI, or guarantee factual claims. Those still need
  the third-party credentials in sections B/C.

## F) GitHub benefits — what they actually buy you

Your included usage (50k Actions min, 50GB Actions storage, 250GB LFS, 100GB Packages transfer,
Startups credit) is **infrastructure discount**, spendable only on GitHub products. Best real use
here: run the campaign/publish/reconcile pipelines as **scheduled GitHub Actions** (cron) so the
engine operates without your PC on. That is automation you already have scripts for
(`traffic:pipeline`, `traffic:autopilot`, `billing:reconcile`). It lowers cost and increases
uptime — it does **not** substitute for the merchant/social/PAC accounts in section C.

---

## What was done in this session (for the record)

- Detected the stale-snapshot problem and **preserved** this session's operator-console rebuild +
  cleanup on branch `session/operator-console-2026-07-08` (pushed) instead of overwriting `main`,
  which would have destroyed the 45 commits of real CFDI work.
- Fast-forwarded local `main` to the real `origin/main`.
- Re-verified real state: 58/58 unit tests, gate GO, reconciliation MATCH.
- Wrote this evidence-based reality doc.

**Bottom line:** the engine is real and healthy. You are one configuration pass away from live —
set billing secrets (revenue), then at least 1 social channel (distribution), then CFDI (invoicing).
AI built and can operate all of it; only *you* can supply the verified accounts the law and the
platforms require.
