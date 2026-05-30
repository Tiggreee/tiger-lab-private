#!/usr/bin/env bash

set -euo pipefail

REPO="${1:-Tiggreee/tiger-lab-private}"
ENV_NAME="${2:-production-social}"

SECRETS=(
  LINKEDIN_CLIENT_ID
  LINKEDIN_CLIENT_SECRET
  LINKEDIN_ORG_ID
  LINKEDIN_ACCESS_TOKEN
  X_API_KEY
  X_API_SECRET
  X_BEARER_TOKEN
  X_CLIENT_ID
  X_CLIENT_SECRET
  X_ACCESS_TOKEN
  X_ACCESS_TOKEN_SECRET
  FACEBOOK_APP_ID
  FACEBOOK_APP_SECRET
  FACEBOOK_PAGE_ID
  FACEBOOK_PAGE_ACCESS_TOKEN
  TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_ID
  DISCORD_BOT_TOKEN
  DISCORD_APPLICATION_ID
  DISCORD_PUBLIC_KEY
  DISCORD_CHANNEL_ID
)

PLACEHOLDER_REGEX='^(CHANGE_ME|REPLACE_ME|YOUR_.+|EXAMPLE.*)$'

echo "Social secrets interactive setup"
echo "Repo: ${REPO}"
echo "Environment: ${ENV_NAME}"
echo

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI is required but not installed." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

printf "Upload secrets to GitHub environment too? [y/N]: "
read -r upload_to_github

echo
echo "Type each value. Input is hidden. Press Enter to keep existing shell value if present."
echo

loaded=0
skipped=0

for name in "${SECRETS[@]}"; do
  current="${!name:-}"
  if [[ -n "${current}" && ! "${current}" =~ ${PLACEHOLDER_REGEX} ]]; then
    printf "%s already set in shell. Re-enter? [y/N]: " "${name}"
    read -r replace_existing
    if [[ ! "${replace_existing}" =~ ^[Yy]$ ]]; then
      if [[ "${upload_to_github}" =~ ^[Yy]$ ]]; then
        printf "%s" "${current}" | gh secret set "${name}" -R "${REPO}" --env "${ENV_NAME}" >/dev/null
      fi
      loaded=$((loaded + 1))
      continue
    fi
  fi

  printf "%s: " "${name}"
  read -rs value
  echo

  if [[ -z "${value}" ]]; then
    skipped=$((skipped + 1))
    echo "SKIP ${name}"
    continue
  fi

  if [[ "${value}" =~ ${PLACEHOLDER_REGEX} ]]; then
    skipped=$((skipped + 1))
    echo "SKIP ${name} (placeholder detected)"
    continue
  fi

  export "${name}=${value}"

  if [[ "${upload_to_github}" =~ ^[Yy]$ ]]; then
    printf "%s" "${value}" | gh secret set "${name}" -R "${REPO}" --env "${ENV_NAME}" >/dev/null
  fi

  loaded=$((loaded + 1))
done

echo
echo "Loaded: ${loaded}"
echo "Skipped: ${skipped}"
echo
echo "Running local readiness check with current shell exports..."
node scripts/traffic/check-social-ready.mjs