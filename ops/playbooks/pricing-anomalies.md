# Pricing Anomalies Playbook

## Trigger
- Alert rule flags outlier or invalid resolved prices.

## Immediate Actions
1. Inspect pricing metrics and anomaly counters.
2. Confirm catalog plan availability and base prices.
3. Verify active pricing experiment flags.

## Stabilization
- Disable experimental discount flags.
- Force base catalog pricing until anomaly clears.

## Exit Criteria
- No new pricing anomalies in two consecutive diagnostics runs.
