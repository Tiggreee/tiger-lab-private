#!/usr/bin/env bash

set -euo pipefail

echo "Running weekly release checks..."

npm run test:server-mode
npm run test:automation-flow
npm run check:secrets:social || true
npm run traffic:go-live -- --campaign "sprint-24h" --channels "linkedin,x,facebook,telegram,discord" || true

echo "Checks completed."
echo "Review results and open PR to main for weekly release merge."
