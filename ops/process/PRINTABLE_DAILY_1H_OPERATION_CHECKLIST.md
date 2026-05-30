# Printable Checklist: Daily 1H Operation

Date: ____ / ____ / ______
Owner: ____________________
Primary channel: LinkedIn

Objective: keep the system in low-touch mode with one focused daily review.

## A. Start block (minute 0-10)

[ ] 1. Run daily dashboard
- Command: `npm run revenue:daily`
- Record:
  - Conversations this week: __________
  - Paid revenue this week (USD): __________
  - Weighted pipeline (USD): __________
  - Weighted MRR (USD): __________

[ ] 2. Run SLA check
- Command: `npm run traffic:sla`
- Record:
  - Samples: __________
  - Average response time: __________ min
  - Breaches (>15 min): __________

[ ] 3. Run command center and pipeline summary
- Commands:
  - `npm run command-center:summary`
  - `npm run pipeline:summary`
- Record urgent tasks count: __________
- Record urgent human actions count: __________

## B. Revenue priority block (minute 10-25)

[ ] 4. Reply to urgent leads first
- Rule: any lead near payment/proposal stage has top priority.
- Rule: keep first human response under 15 min when active.

[ ] 5. Update response evidence
- File: `ops/traffic/lead-response-log.json`
- Confirm new entries added today: YES / NO

## C. LinkedIn execution block (minute 25-40)

[ ] 6. Approve one LinkedIn action
- Choose one:
  - [ ] one post
  - [ ] one outbound sequence
  - [ ] one follow-up wave

[ ] 7. Validate CTA and destination before publish/send
- CTA text final: _______________________________________________
- Destination URL final: _________________________________________
- URL check passed (no placeholders): YES / NO

## D. Control block (minute 40-50)

[ ] 8. Update pipeline next actions
- Move leads to correct stage.
- Add due date and owner for each next action.

[ ] 9. Re-schedule overdue tasks
- Overdue tasks rescheduled: __________
- Critical blockers identified: _________________________________

## E. Decision block (minute 50-60)

[ ] 10. Choose one strategic focus for tomorrow
- [ ] increase outreach volume
- [ ] improve conversion copy
- [ ] improve close handling

Chosen focus note:
________________________________________________________________
________________________________________________________________

## End-of-day quality gate

[ ] North star reviewed
[ ] SLA reviewed
[ ] LinkedIn action completed
[ ] Pipeline updated
[ ] Tomorrow focus decided

Status: [ ] GREEN  [ ] YELLOW  [ ] RED
Reason:
________________________________________________________________

Signature: ____________________   Time: __________
