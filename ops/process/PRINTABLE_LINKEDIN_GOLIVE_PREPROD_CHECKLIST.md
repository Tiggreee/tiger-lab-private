# Printable Checklist: LinkedIn Preprod and Go-Live Approval

Date: ____ / ____ / ______
Owner: ____________________
Campaign ID: ____________________
Environment: production-social

Objective: execute a safe LinkedIn launch with detailed preprod gates before live approval.

## A. Secret setup gate (required)

[ ] 1. Confirm GitHub authentication
- Command: `gh auth status`
- Logged in account: ____________________

[ ] 2. Confirm environment exists
- GitHub repository settings -> Environments -> `production-social`
- Exists and accessible: YES / NO

[ ] 3. Set LinkedIn required secrets in `production-social`
- Required secret names:
  - `LINKEDIN_CLIENT_ID`
  - `LINKEDIN_CLIENT_SECRET`
  - `LINKEDIN_ORG_ID`
  - `LINKEDIN_ACCESS_TOKEN`

- Optional CLI example (run each with real value):
  - `gh secret set LINKEDIN_CLIENT_ID --env production-social --body "VALUE"`
  - `gh secret set LINKEDIN_CLIENT_SECRET --env production-social --body "VALUE"`
  - `gh secret set LINKEDIN_ORG_ID --env production-social --body "VALUE"`
  - `gh secret set LINKEDIN_ACCESS_TOKEN --env production-social --body "VALUE"`

[ ] 4. Validate social readiness report
- Command: `npm run traffic:ready`
- LinkedIn status READY: YES / NO
- If NO, stop and fix secrets.

## B. Landing final confirmation gate (required)

[ ] 5. Confirm landing URL final
- URL must be production real URL, no placeholders.
- Final URL:
  _______________________________________________

[ ] 6. Validate landing health manually
- Opens correctly in browser: YES / NO
- CTA visible above fold: YES / NO
- Form/booking works: YES / NO
- UTM/campaign params preserved: YES / NO

[ ] 7. Build campaign pack using final URL
- Command template:
  - `npm run traffic:pack -- --topic "..." --audience "..." --offer "..." --campaign "..." --baseLink "https://final-real-landing.com" --closeChannel "calendar" --closeDestination "https://cal.com/tu-enlace"`
- Pack generated without error: YES / NO

## C. Preprod checklist gate (required)

[ ] 8. Run go-live validation for LinkedIn only
- Command: `npm run traffic:go-live -- --campaign "<campaign-id>" --channels "linkedin"`
- Result PASS: YES / NO
- If NO, stop and fix before continuing.

[ ] 9. Run dry publish
- Command: `npm run traffic:publish:dry -- --campaign "<campaign-id>" --channels "linkedin"`
- Dry publish success: YES / NO
- Output reviewed: YES / NO

[ ] 10. Final content QA
- Hook, pain, promise, proof, CTA present: YES / NO
- Tone aligns with ICP: YES / NO
- Link points to final landing: YES / NO
- No typo in offer or CTA: YES / NO

## D. Live approval gate (human decision)

[ ] 11. Approve live launch explicitly
- Approval owner: ____________________
- Approval time: ____________________
- Approval note:
  ________________________________________________________________

[ ] 12. Execute live publish
- Command: `npm run traffic:publish -- --campaign "<campaign-id>" --channels "linkedin"`
- Live publish success: YES / NO

[ ] 13. Immediate post-launch validation (first 15 min)
- Post visible in channel: YES / NO
- Link resolves correctly: YES / NO
- First inbound responses logged: YES / NO

## E. Daily low-touch handoff

[ ] 14. Activate daily loop
- Run:
  - `npm run revenue:daily`
  - `npm run traffic:sla`
  - `npm run command-center:summary`
  - `npm run pipeline:summary`

[ ] 15. Confirm max 1h daily review plan
- Daily review slot booked: ____:____
- Owner confirmed: YES / NO

Final status: [ ] APPROVED FOR LIVE  [ ] BLOCKED
Block reason (if any):
________________________________________________________________

Signature: ____________________   Time: __________
