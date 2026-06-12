# Context Index

Indice canonico del repositorio para localizar contexto rapido por dominio.

## Index Metadata
- Fecha: 2026-06-09
- Owner: Victor Manuel Salgado Luna
- Motivo: ampliar navegacion operativa con prioridad y rutas por rol

## Critical Docs Matrix (Priority + Owner)
| Documento | Prioridad | Owner |
|---|---|---|
| 90-governance/CONTEXT_CHARTER.md | P0 | Victor Manuel Salgado Luna |
| 90-governance/OWNERSHIP_AND_RACI.md | P0 | Victor Manuel Salgado Luna |
| 01-strategy/MASTER_PLAN.md | P0 | Victor Manuel Salgado Luna |
| 02-architecture/SYSTEM_OVERVIEW.md | P0 | Victor Manuel Salgado Luna |
| 03-engine/ENGINE_CONTRACT.md | P0 | Victor Manuel Salgado Luna |
| 03-engine/TIGGREEEON_RULES_BASELINE.md | P0 | Victor Manuel Salgado Luna |
| 04-prompts/BASE_PROMPT_POLICY.md | P1 | Victor Manuel Salgado Luna |
| 05-operations/SOP_WEEKLY_CONTEXT_REVIEW.md | P1 | Victor Manuel Salgado Luna |
| 07-pipelines/CONTEXT_REFRESH_PIPELINE.md | P1 | Victor Manuel Salgado Luna |
| 08-memory/INSTITUTIONAL_MEMORY.md | P1 | Victor Manuel Salgado Luna |

## Minimal Reading Paths By Role

### Founder / Owner
1. 90-governance/CONTEXT_CHARTER.md
2. 90-governance/OWNERSHIP_AND_RACI.md
3. 01-strategy/MASTER_PLAN.md
4. PLAN_MAESTRO.md

### Product Architect
1. 02-architecture/SYSTEM_OVERVIEW.md
2. 02-architecture/adr/ADR-0001-context-engine-as-source-of-truth.md
3. 03-engine/ENGINE_CONTRACT.md
4. 06-standards/CODE_AND_DOC_STANDARDS.md

### Ops Lead
1. 05-operations/SOP_WEEKLY_CONTEXT_REVIEW.md
2. 05-operations/INCIDENT_PLAYBOOK.md
3. 07-pipelines/CONTEXT_REFRESH_PIPELINE.md
4. 07-pipelines/MONTHLY_CONTEXT_AUDIT.md

### Engineering Lead
1. 03-engine/AGENT_OPERATING_RULES.md
2. 03-engine/SKILLS_CATALOG.md
3. 03-engine/TIGGREEEON_RULES_BASELINE.md
4. 04-prompts/SMOKE_TEST_COPILOT_INDEXING.md

### Agent Maintainer
1. .github/agents/agent-master.yaml
2. .github/copilot/agents/agent-master.yaml
3. 04-prompts/PROMPT_TEMPLATE.md
4. 04-prompts/BASE_PROMPT_POLICY.md

## Root
- PLAN_MAESTRO.md
- README.md
- CONTEXT_INDEX.md

## 01-strategy
- 01-strategy/MASTER_PLAN.md
- 01-strategy/OPERATING_SYSTEM.md

## 02-architecture
- 02-architecture/SYSTEM_OVERVIEW.md
- 02-architecture/adr/ADR-0001-context-engine-as-source-of-truth.md
- 02-architecture/adr/ADR-TEMPLATE.md

## 03-engine
- 03-engine/AGENT_OPERATING_RULES.md
- 03-engine/ENGINE_CONTRACT.md
- 03-engine/SKILLS_CATALOG.md
- 03-engine/TIGGREEEON_RULES_BASELINE.md

## 04-prompts
- 04-prompts/BASE_PROMPT_POLICY.md
- 04-prompts/PROMPT_TEMPLATE.md
- 04-prompts/SMOKE_TEST_COPILOT_INDEXING.md

## 05-operations
- 05-operations/INCIDENT_PLAYBOOK.md
- 05-operations/SOP_WEEKLY_CONTEXT_REVIEW.md

## 06-standards
- 06-standards/CODE_AND_DOC_STANDARDS.md

## 07-pipelines
- 07-pipelines/CONTEXT_REFRESH_PIPELINE.md
- 07-pipelines/MONTHLY_CONTEXT_AUDIT.md

## 08-memory
- 08-memory/INSTITUTIONAL_MEMORY.md
- 08-memory/READY_FOR_NEXT_BLOCK.md
- 08-memory/WEEKLY_CONTEXT_DIGEST.md

## 90-governance
- 90-governance/CONTEXT_CHARTER.md
- 90-governance/OWNERSHIP_AND_RACI.md

## Agent Catalogs
- .github/agents/agent-audit.yaml
- .github/agents/agent-bots.yaml
- .github/agents/agent-docs.yaml
- .github/agents/agent-master.yaml
- .github/agents/agent-pipelines.yaml
- .github/agents/agent-products.yaml
- .github/agents/agent-runtime.yaml
- .github/agents/agent-tiggreeeon.yaml
- .github/agents/agent-traffic.yaml
- .github/copilot/agents/agent-audit.yaml
- .github/copilot/agents/agent-bots.yaml
- .github/copilot/agents/agent-docs.yaml
- .github/copilot/agents/agent-master.yaml
- .github/copilot/agents/agent-pipelines.yaml
- .github/copilot/agents/agent-products.yaml
- .github/copilot/agents/agent-runtime.yaml
- .github/copilot/agents/agent-tiggreeeon.yaml
- .github/copilot/agents/agent-traffic.yaml

## How To Use With Copilot
1. Abre este repo en VS Code.
2. Ejecuta @workspace index.
3. Pide contexto por area y archivo.
4. Antes de ejecutar cambios, valida contra governance y ADR.

## Update Rule
Si agregas un documento critico, indexarlo aqui es obligatorio.
