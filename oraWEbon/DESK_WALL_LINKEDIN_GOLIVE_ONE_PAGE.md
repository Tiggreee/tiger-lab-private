# Desk/Wall One-Page: LinkedIn Preprod and Go-Live

Date: ____ / ____ / ______   Campaign: ____________________
Environment: production-social

## Gate A: Secrets (required)

- [ ] `gh auth status`
- [ ] Environment `production-social` exists
- [ ] Required secrets set:
  - [ ] LINKEDIN_CLIENT_ID
  - [ ] LINKEDIN_CLIENT_SECRET
  - [ ] LINKEDIN_ORG_ID
  - [ ] LINKEDIN_ACCESS_TOKEN
- [ ] `npm run traffic:ready` -> LinkedIn READY

## Gate B: Landing final (required)

- [ ] Final production URL confirmed
- [ ] URL opens correctly
- [ ] CTA visible and clear
- [ ] Form/booking flow works
- [ ] No placeholder domains

## Gate C: Preprod checks (required)

- [ ] Generate pack with final URL
- [ ] `npm run traffic:go-live -- --campaign "<campaign-id>" --channels "linkedin"` -> PASS
- [ ] `npm run traffic:publish:dry -- --campaign "<campaign-id>" --channels "linkedin"` -> PASS
- [ ] Content QA passed (hook, pain, promise, proof, CTA)

## Gate D: Human final approval (required)

- [ ] Final approval owner: ____________________
- [ ] Approval time: ____________________
- [ ] `npm run traffic:publish -- --campaign "<campaign-id>" --channels "linkedin"` -> SUCCESS

## Gate E: Post-launch 15 min

- [ ] Post visible on LinkedIn
- [ ] Link resolves to final landing
- [ ] First responses logged
- [ ] Daily 1H loop scheduled

Result: [ ] APPROVED LIVE  [ ] BLOCKED
Block reason: ____________________________________________________
