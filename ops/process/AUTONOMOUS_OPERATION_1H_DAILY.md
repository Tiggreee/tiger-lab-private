# Autonomous Operation (1 Hour Daily)

Goal: run this project with minimal intervention while maintaining commercial control.

## Realistic autonomy target

- 85-90% automation: achievable now.
- 10-15% human control: required for sales judgment, pricing, and incident handling.

## Daily 60-minute control loop

1. Minute 0-10
- Run dashboard and SLA checks.

2. Minute 10-25
- Reply to urgent leads first.
- Prioritize any lead close to payment/proposal stage.

3. Minute 25-40
- Approve one LinkedIn campaign or post.
- Confirm destination links and CTA integrity.

4. Minute 40-50
- Update pipeline next actions.
- Mark overdue tasks and reassign immediate owner.

5. Minute 50-60
- Decide one strategic action for tomorrow:
  - increase outreach,
  - improve conversion copy,
  - improve close handling.

## Required commands

```bash
npm run revenue:daily
npm run traffic:sla
npm run command-center:summary
npm run pipeline:summary
```

## Human-only gates (do not automate away)

- Credential rotation and secret management.
- Final approval for paid campaigns.
- Contract and payment acceptance.
- Incident decisions with customer impact.
