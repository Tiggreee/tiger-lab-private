# Institutional Memory

## Uso
Registrar aprendizajes no obvios, decisiones operativas y lecciones recurrentes.

## Formato recomendado
- Fecha:
- Dominio:
- Hallazgo:
- Implicacion:
- Accion aplicada:
- Resultado:

## Entradas
### 2026-06-08
- Dominio: Foundation
- Hallazgo: separar contexto en repo dedicado mejora consistencia de ejecucion.
- Implicacion: reduce dependencia de memoria de chat/sesion.
- Accion aplicada: creacion de `tigre-labs-context-engine`.
- Resultado: baseline operativo instalado.

### 2026-06-08
- Dominio: Governance
- Hallazgo: tiggreeeon requiere reglas criticas explicitas para evitar drift de foco.
- Implicacion: sin gate CRITICAL, se fuga esfuerzo a tareas no prioritarias.
- Accion aplicada: documento `03-engine/TIGGREEEON_RULES_BASELINE.md` y smoke tests de indexado.
- Resultado: base v1.1 lista para validacion operativa.
