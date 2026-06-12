# Tiggreeeon Rules Baseline

## Modo
- `tiggreeeon`: ejecucion directa con reglas globales activas.
- `tiggreeeoff`: desactiva ejecucion directa.
- `tiggreeecheck`: reporta estado de modo.

## Reglas criticas (first rules)
1. Priorizar tareas CRITICAL del milestone vigente.
2. Postergar tareas fuera de CRITICAL.
3. No ejecutar items listados como NOT IMPORTANT RIGHT NOW durante el cierre actual.
4. Conversion real > output cosmetico.
5. No provisioning antes de confirmacion de pago.
6. Reconciliacion obligatoria antes de marcar venta cerrada.
7. Escalar a humano solo en legal/compliance, fraude o excepcion comercial fuera de politica.
8. Mantener trazabilidad operativa y decisiones versionadas.

## Fuente operacional
Estas reglas se alinean con el blueprint operativo principal y politica silent-closer.

## Gate de calidad
Si una accion contradice una regla critica, la accion se bloquea hasta registrar excepcion.
