#!/usr/bin/env bash
set -euo pipefail

# Basic guardrail to avoid accidental secret commits.
PATTERNS=(
  "AKIA[0-9A-Z]{16}"
  "-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----"
  "gh[pousr]_[A-Za-z0-9._-]{36,}"
  "AIza[0-9A-Za-z-_]{35}"
)

EXIT=0
for p in "${PATTERNS[@]}"; do
  if grep -RIE --exclude-dir=.git --exclude-dir=node_modules "$p" . >/dev/null 2>&1; then
    echo "Potential secret found for pattern: $p"
    EXIT=1
  fi
done

if [[ $EXIT -eq 0 ]]; then
  echo "No obvious secret patterns found."
fi

exit $EXIT
