# Bot Overuse Playbook

## Trigger
- Bot overuse counter increases for any customer or channel.

## Immediate Actions
1. Identify customer and channel from latest overuse sample.
2. Compare usage against assigned plan limits.
3. Validate quota enforcement behavior.

## Stabilization
- Apply rate reduction for impacted channel.
- Recommend plan upgrade if sustained overuse continues.

## Exit Criteria
- Overuse counter remains stable and no new over-limit snapshots are observed.
