# Tiggreeeon Normativa Portable

Este documento consolida la normativa operativa de Tiggreeeon en un solo archivo para uso interno y portabilidad entre repositorios.

## 1) Activacion del modo Tiggreeeon

- Se activa solo cuando el usuario escribe explicitamente `tiggreeeon`.
- Al activarse, el agente debe ejecutar trabajo directo, no quedarse unicamente en planeacion.
- Si hay un bloqueo real, debe explicarlo con evidencia concreta.

## 2) Comportamiento obligatorio en modo Tiggreeeon

- Ejecutar la tarea con cambios minimos y enfoque en el milestone activo.
- Validar inmediatamente cada cambio en superficies criticas.
- Evitar refactors especulativos o cambios de alcance no solicitados.
- Preservar comportamiento ya verificado.
- Si una solicitud rompe guardrails de gobernanza, bloquearla y explicar el conflicto con evidencia.

## 3) Gobernanza que NO se puede omitir

- Ejecutar solo trabajo critico al milestone activo.
- Posponer alcance no critico.
- Nunca provisionar antes de confirmacion de pago.
- Reconciliacion obligatoria antes de tratar una venta como cerrada.
- Escalar solo en casos de legal/compliance, fraude o excepciones de politica.

## 4) Superficies protegidas

Se consideran protegidas y con hardening obligatorio:

- runtime
- backend
- billing/facturacion
- auth
- checkout
- launch gate
- production-readiness

## 5) Validaciones obligatorias en superficies protegidas

Despues de cambios relevantes en superficies protegidas ejecutar:

1. `npm run test:smoke`
2. `npm run build:server`
3. `npm run prod:gate`

Si alguna validacion falla, no recomendar release.

## 6) Evidencia y baseline de produccion

- Mantener y respetar evidencia de baseline de produccion definida por el repositorio objetivo.
- No degradar controles reales por placeholders.
- No convertir un gate fallando en pass por bypass silencioso.

## 7) Normativa para agentes Copilot YAML (watch-only)

Aplicable a `.github/copilot/agents/**/*.yaml`:

- Mantener `agent-tiggreeeon.yaml` en contrato watch-only.
- No agregar capacidades de:
  - `file_editing`
  - `code_generation`
  - `pull_request_creation`
- Preservar llaves raiz requeridas por `scripts/validate-copilot-agents.mjs`.
- Si se modifica YAML de agentes, ejecutar `npm run check:copilot:agents`.
- Si ademas afecta gobernanza de produccion, ejecutar `npm run prod:gate`.

## 8) Regla operativa de edicion interactiva

- No es modo vi.
- No usar editores interactivos tipo vi/vim en flujos automatizados.
- Usar comandos bash no interactivos y cambios auditables.

## 9) Limites de recursos (cuando aplique politica empresarial)

Si el repositorio opera bajo una politica de 50% de asignacion enterprise, mantener cap de uso en:

- Actions minutes
- Actions storage
- Actions custom image storage
- Git LFS bandwidth/storage
- Packages transfer/storage
- Sandbox budget
- Creditos de programa aplicable

Nota: estos limites son organizacionales y pueden variar por repo/empresa.

## 10) Switch obligatorio Engine+Agents por bloqueo de IA o caps

Si una tarea queda bloqueada por indisponibilidad de IA o limites de recursos, producir plan ejecutable que incluya:

1. Playbooks para `watchers/`, `simulators/`, `pipelines/`, `connectors/`, `tasks/`, `agents/`.
2. Workflows completos en `.github/workflows/`.
3. Scripts ejecutables (bash/Node.js/Python).
4. Diseno de pipeline multiagente (triggers, paralelismo, matrices, limites).
5. Estructura de carpetas de runtime y operacion.
6. Comandos exactos para ejecutar, validar, testear y desplegar.
7. Plan de monetizacion sin IA.

## 11) MCP prudentes (recomendado)

Priorizar por fases:

1. Lectura/diagnostico:
   - `file_search`
   - `grep_search`
   - `read_file`
   - `get_errors`
   - `get_changed_files`
2. Ejecucion controlada:
   - `run_in_terminal` (comandos auditables)
3. Edicion minima:
   - `apply_patch`
4. Publicacion/PR:
   - Solo despues de smoke/build/prod-gate en verde

## 12) Skills recomendados

- `prod-gate`: para readiness de release/go-live.
- `Release Auditor` (agente): auditoria read-only de evidencia de release.
- `Explore` (agente): exploracion rapida read-only.

## 13) Checklist de portabilidad a otro repo

Para que `tiggreeeon` funcione en otro repositorio, debe existir como minimo:

1. `AGENTS.md` con seccion Tiggreeeon Mode y guardrails.
2. `.github/instructions/runtime-hardening.instructions.md`.
3. `.github/instructions/tiggreeeon-governance.instructions.md`.
4. `.github/skills/prod-gate/SKILL.md`.
5. `scripts/validate-copilot-agents.mjs`.
6. `scripts/production-go-no-go.mjs`.
7. `ops/runtime/production-go-no-go-report.md`.

Sin estos componentes, la invocacion de `tiggreeeon` puede existir pero no aplicar gobernanza real ni validacion consistente.

## 14) Politica de aplicacion por alcance

- Esta normativa aplica por defecto a repos con operaciones de produccion, monetizacion, checkout, billing, auth o launch gates.
- Si un repositorio no tiene estos dominios, adaptar secciones 3, 4, 5, 6 y 10 a su contexto, sin eliminar controles de calidad y evidencia.

## 15) Criterio de cumplimiento minimo

Se considera cumplimiento minimo de Tiggreeeon cuando:

- Modo se activa por keyword explicita.
- Guardrails de gobernanza estan definidos y no se pueden bypassear.
- Existe flujo de validacion (smoke/build/prod-gate o equivalente).
- Existe evidencia auditable de estado de release.
- Las reglas watch-only de agente YAML se mantienen.
