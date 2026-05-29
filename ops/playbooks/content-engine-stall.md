# Content Engine Stall Playbook

## Trigger
- Product release events occur without content.autopublished follow-up.

## Immediate Actions
1. Verify release event listener wiring.
2. Inspect event bus stream for product.released and content.generated.
3. Confirm channel publication simulation status.

## Stabilization
- Re-run release simulation for affected product.
- Temporarily publish through direct auto publisher invocation.

## Exit Criteria
- New release events consistently produce content.autopublished events.
