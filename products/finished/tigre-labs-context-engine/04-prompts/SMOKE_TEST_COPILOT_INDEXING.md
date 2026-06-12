# Smoke Test Copilot Indexing

## Objetivo
Verificar rapido que Copilot lea el contexto del repo y responda con precision.

## Precondicion
- Repo abierto en VS Code.
- Sesion con cuenta GitHub Copilot Enterprise habilitada.
- Ejecutar `@workspace index` antes de las pruebas.

## Pruebas (5 prompts)
1. `@workspace Resume el North Star y los no-negociables actuales.`
2. `@workspace Cuales son las reglas criticas de tiggreeeon y que bloquean?`
3. `@workspace Dame el contrato de actualizacion del engine y que carpetas toca cada cambio.`
4. `@workspace Lista los KPIs oficiales canon y los KPIs operativos semanales.`
5. `@workspace Cual es la cadencia del Weekly Context Review y que salida obligatoria exige?`

## Criterio de aprobado
- Respuestas citan documentos correctos por dominio.
- No inventa reglas fuera del contexto.
- Usa terminologia interna coherente (North Star, CRITICAL, reconciliacion, gates).

## Si falla
1. Re-ejecutar `@workspace index`.
2. Reabrir ventana de VS Code.
3. Verificar sesion Enterprise activa.
4. Repetir prueba 1 y 4 como control rapido.
