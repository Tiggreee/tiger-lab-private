# Lead Intelligence Agent

**Purpose:** Gestionar leads automáticamente: recolectar, almacenar, y generar outreach sin intervención humana.

## Fuentes de leads

1. **Archivo JSON** — `ops/leads/pipeline.json` (base de datos local de leads)
2. **Inbound webhook** — `POST /api/leads/capture` (desde landing pages)
3. **CSV import** — `ops/leads/import/` (cualquier CSV en esa carpeta se procesa automáticamente)
4. **ICP generator** — Cuando no hay leads, genera leads sintéticos basados en ICP (Ideal Customer Profile)

## Formato de lead

```json
{
  "id": "lead_001",
  "name": "Carlos",
  "company": "Facturapi MX",
  "industry": "fintech",
  "pain": "conciliacion manual de pagos",
  "process": "reconciliacion",
  "source": "linkedin",
  "status": "new",
  "capturedAt": "2026-06-12T00:00:00.000Z"
}
```

## Acciones automáticas

1. **Detectar leads nuevos** — Cada vez que se agrega un lead con status "new", el agente genera outreach automático
2. **Generar outreach** — Usa `scripts/generate-outreach.mjs` para crear mensajes personalizados
3. **Actualizar pipeline** — Cuando se envía outreach, marca el lead como "contacted"
4. **ICP fallback** — Si no hay leads reales, genera 5 leads sintéticos basados en el ICP definido

## Output

- `ops/leads/pipeline.json` — Base de datos de leads
- `ops/sales/outreach/` — Mensajes generados automáticamente
- `ops/leads/icp-config.json` — Configuración del perfil de cliente ideal
