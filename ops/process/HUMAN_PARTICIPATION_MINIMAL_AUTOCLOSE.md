# Human Participation Minimal Mode (Autoclose)

Goal: maximize automation in closing and payment flow while preserving safety gates.

## Default mode
- Commercial decision: automated.
- Objection handling: automated by orchestration agent.
- Checkout dispatch: automated.
- Payment confirmation and provisioning: automated once payment is confirmed.

## Human gates (required)
1. Publication/go-live final approval by channel.
2. Contract/commercial exceptions outside policy.
3. Security, fraud, and compliance incidents.

## High-value lead behavior
- Default: auto-close to checkout even for high-value leads.
- Optional manual handoff can be re-enabled with:
  - `COMMERCIAL_REQUIRE_HIGH_VALUE_HANDOFF=true`

## Discount policy operation
- Agent applies only pre-approved discount bands.
- Any discount outside policy escalates to human gate.

## Recommended control loop (15 min/day)
1. Review escalations only (exceptions, security, legal).
2. Approve/deny pending go-live publications.
3. Adjust discount bands and offer policy for next cycle.

## Fast check
- `npm run command-center:summary`
- Confirm blockers list only includes gate tasks, not routine closing tasks.
