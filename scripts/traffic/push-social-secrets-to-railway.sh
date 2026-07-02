#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${1:-}"
TARGET_ENV="${2:-production}"
SERVICES_CSV="${3:-tiger-backend}"

if [[ -z "${ENV_FILE}" ]]; then
  echo "Usage: $0 <env-file> [railway-environment] [service1,service2,...]" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Error: env file not found: ${ENV_FILE}" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required but not available." >&2
  exit 1
fi

if ! npx @railway/cli whoami >/dev/null 2>&1; then
  echo "Error: Railway CLI is not authenticated. Run: npx @railway/cli login" >&2
  exit 1
fi

required_keys=(
  LINKEDIN_ACCESS_TOKEN
  X_API_KEY
  X_API_SECRET
  X_ACCESS_TOKEN
  X_ACCESS_TOKEN_SECRET
  FACEBOOK_PAGE_ID
  FACEBOOK_PAGE_ACCESS_TOKEN
  TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_ID
  DISCORD_BOT_TOKEN
  DISCORD_CHANNEL_ID
)

placeholder_regex='^(CHANGE_ME|REPLACE_ME|YOUR_.+|EXAMPLE.*)$'

trim() {
  local value="$1"
  value="${value#${value%%[![:space:]]*}}"
  value="${value%${value##*[![:space:]]}}"
  printf '%s' "${value}"
}

read_env_value() {
  local key="$1"
  local raw
  raw="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "${ENV_FILE}" | tail -n 1 || true)"
  if [[ -z "${raw}" ]]; then
    return 1
  fi

  local value="${raw#*=}"
  value="$(trim "${value}")"

  if [[ "${value}" =~ ^\".*\"$ ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "${value}" =~ ^\'.*\'$ ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "${value}"
}

IFS=',' read -r -a services <<< "${SERVICES_CSV}"

echo "Bulk Railway social secrets sync"
echo "Env file: ${ENV_FILE}"
echo "Railway environment: ${TARGET_ENV}"
echo "Services: ${SERVICES_CSV}"
echo

missing=()
for key in "${required_keys[@]}"; do
  if ! value="$(read_env_value "${key}")"; then
    missing+=("${key}")
    continue
  fi
  if [[ -z "${value}" || "${value}" =~ ${placeholder_regex} ]]; then
    missing+=("${key}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "Error: missing or placeholder values in ${ENV_FILE}:" >&2
  for key in "${missing[@]}"; do
    echo " - ${key}" >&2
  done
  exit 1
fi

set_count=0
for key in "${required_keys[@]}"; do
  value="$(read_env_value "${key}")"
  for service in "${services[@]}"; do
    service="$(trim "${service}")"
    if [[ -z "${service}" ]]; then
      continue
    fi

    printf '%s' "${value}" | npx @railway/cli variable set "${key}" --stdin --service "${service}" --environment "${TARGET_ENV}" --skip-deploys >/dev/null
    echo "SET ${key} -> ${service}"
    set_count=$((set_count + 1))
  done
done

echo
echo "Done. Variables synced (without printing secret values): ${set_count}"
echo "Next step: trigger one deploy per service from Railway UI or CLI."
