---
applyTo: ".github/copilot/agents/**/*.yaml"
description: "Use when editing Copilot agent YAML files, especially tiggreeeon governance and validation-sensitive fields."
---

# Tiggreeeon Governance Instructions

- Preserve the watch-only contract of `.github/copilot/agents/agent-tiggreeeon.yaml`.
- Do not add `file_editing`, `code_generation`, or `pull_request_creation` capabilities to the tiggreeeon agent.
- Keep required root keys aligned with [scripts/validate-copilot-agents.mjs](../../scripts/validate-copilot-agents.mjs).
- If you change agent YAML, run `npm run check:copilot:agents` before finishing.
- If the edit changes production governance expectations, also run `npm run prod:gate`.