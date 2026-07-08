# Branch Consolidation & Merge Audit (2026-07-08)

Goal: merge/consolidate all repository branches into a single clean `main`, rescuing any
genuinely-missing work and deleting everything already superseded. This document is the
evidence-based record of every branch decision. Every deleted branch's tip SHA is recorded here
for recovery (`git fetch origin <sha>` / restore branch from SHA) if ever needed.

## Result

- **Before:** 24 remote branches (main + 23 others).
- **After:** **1 remote branch — `main`.**
- **Rescued into `main`:** all 11 dependency bumps (consolidated + validated). No feature code
  needed rescuing — it was already in `main`.
- **Deleted:** 22 branches (6 already-merged, 5 superseded feature branches, 11 dependabot after
  consolidation). Plus the session preservation branch (superseded by main's newer dashboard).
- **Validation after consolidation:** `npm install` 0 vulnerabilities, **58/58 unit tests pass**,
  server type-check OK, **prod gate GO 21/0/0**.

## Key finding

Nothing valuable was stranded on any branch. `main` (the July‑2 line) was already ahead of every
other branch and already contained every feature fix that the older branches introduced. The audit
verified this file-by-file rather than assuming it. The only genuinely-unmerged content was the
dependabot dependency/version bumps, which were consolidated into one validated commit on `main`.

## Per-branch decisions

### Already merged — deleted (unique commits already in `main`, ahead:0)
| Branch | SHA | Behind |
|---|---|---|
| copilot/hopw-about-mny-9-agents | b94c54c | 335 |
| copilot/index | b94c54c | 335 |
| copilot/index-again | b94c54c | 335 |
| copilot/stop-and-delete-active-process | b94c54c | 335 |
| hotfix/creative-agent-improvements | 4f972e3 | 64 |
| release/from-main-deploy-fix-20260611 | 614325c | 330 |

### Superseded feature branches — deleted (content verified already in `main`)
| Branch | SHA | Why superseded (verified) |
|---|---|---|
| copilot/fix-full-pipeline-job | 3405865 | autopilot `minChannels >= 0` fix, the zero-ready-channels skip block, AND the 95-line `run-autopilot.integration.test.ts` are all already present in `main`. |
| fix/ci-pr-title-check | 25a0d9e | `main`'s `pr-title-check.yml` already uses the `grep -Eq` form this branch introduced. |
| railway/fix-deploy-3baedd | a426f22 | `main`'s `AutonomousSystemController.ts` already has the inlined `AsyncStatus`/`OnboardingInput` types; the imported `src/ui/modern/types.ts` also exists. |
| Tiggreee-patch-1 | 4201fd1 | README badge edit with broken tab formatting; `main`'s README is newer and cleaner. |
| copilot/explain-repository-structure | 119b39a | Only added 848 lines of runtime `funnel-events.jsonl` log data (a generated artifact, not code). |

### Dependabot — consolidated into `main`, then deleted
Applied as one validated commit (`chore(deps): consolidate dependabot bumps + bump GitHub Actions`):

npm: `sharp 0.35.3`, `mjml 5.4.0`, `tsx 4.22.5`, `puppeteer 25.3.0`, `pg 8.22.0`,
`vitest 4.1.9`, `@vitest/coverage-v8 4.1.9`, `@types/node 26.1.0` (major bump — server
type-check passed, so accepted).

GitHub Actions (all workflows): `actions/checkout v5→v7`, `actions/configure-pages v5→v6`,
`actions/deploy-pages v4→v5`.

| Branch | SHA |
|---|---|
| dependabot/npm_and_yarn/sharp-0.35.3 | fd901c2 |
| dependabot/npm_and_yarn/mjml-5.4.0 | 860e35f |
| dependabot/npm_and_yarn/tsx-4.22.5 | 4c0626e |
| dependabot/npm_and_yarn/puppeteer-25.3.0 | d7a2ec4 |
| dependabot/npm_and_yarn/pg-8.22.0 | e96ce21 |
| dependabot/npm_and_yarn/vitest-4.1.9 | 38d7809 |
| dependabot/npm_and_yarn/vitest/coverage-v8-4.1.9 | 42da1d4 |
| dependabot/npm_and_yarn/types/node-26.1.0 | 19e9117 |
| dependabot/github_actions/actions/checkout-7 | 98c340a |
| dependabot/github_actions/actions/configure-pages-6 | b630878 |
| dependabot/github_actions/actions/deploy-pages-5 | f3c4708 |

### Session preservation branch — deleted (superseded)
| Branch | SHA | Why |
|---|---|---|
| session/operator-console-2026-07-08 | 15dcf00 | This session's operator-console rebuild was based on the stale June‑17 snapshot. `main`'s July‑2 "Tiger Command Center" dashboard is newer and better (real design system; `app.js` fetches live `/runtime/*` data with "no synthetic metrics, jokes, or external calls"; has `command-center:start` + `prod:dashboard:smoke`). Merging the older rebuild would have regressed the dashboard. |

## Product / campaign / dashboard status on `main`

- **Dashboard**: `ops/command-center/index.html` + `app.js` — real functional "Tiger Command
  Center" wired to live runtime data. Served by `npm run command-center:start`; covered by
  `prod:dashboard:smoke` (gate P19 PASS).
- **Campaigns**: campaign pipeline + quality gate + index-alignment check (gate P20 PASS). Real
  production checkout URLs already wired.
- **Products**: 4 active products in `ops/catalog/products.json`; catalog gate PASS.
- **Gate**: GO 21/0/0 with fresh evidence.

The remaining work to actually earn revenue is **not code** — it is setting the payment/CFDI/social
secrets described in `docs/audit/PRODUCTION_REALITY_2026-07-08.md` and
`ops/playbooks/secrets-golive-runbook.md`.

## Recovery note

No commits were force-removed from history. Every deleted branch tip SHA is listed above; any branch
can be restored with `git branch <name> <sha>` after `git fetch origin <sha>` (SHAs remain reachable
via the platform's reflog/PR records). Merged branches' content is already in `main`.
