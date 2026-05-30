#!/usr/bin/env bash

set -euo pipefail

slug="${1:-}"
if [[ -z "$slug" ]]; then
  echo "Usage: bash scripts/git/start-feature.sh <short-slug>"
  exit 1
fi

safe_slug=$(echo "$slug" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
branch="feat/${safe_slug}"

current=$(git branch --show-current)
if [[ "$current" != "main" ]]; then
  echo "You must run this from main. Current branch: $current"
  exit 1
fi

git pull --rebase origin main
git checkout -b "$branch"

echo "Created branch: $branch"
echo "Next: commit your changes and open PR into main."
