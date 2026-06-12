# Lead Intelligence Agent

**Purpose:** Generar, almacenar y calificar leads reales del mercado mexicano usando múltiples fuentes gratuitas + base de datos SQL relacional.

## Base de Datos (SQL — Oracle-compatible)

- **Engine:** SQLite via sql.js (file-based, 0 costo, standard SQL)
- **Ubicación:** `ops/database/leads.db`
- **Oracle DDL:** `ops/database/oracle-import-ddl.sql`
- **Export CSV:** `ops/database/exports/`
- **Skills Oracle:** CREATE TABLE, INSERT, SELECT, JOIN, INDEX, SEQUENCE, IMPORT DATA
- **Importación:** SQL Developer → Tables → Import Data → CSV

### Schema
- `companies` — nombre, RFC, industria, ciudad, teléfono, website, geo
- `contacts` — nombre, título, email, linkedin, decision_maker
- `leads` — status (new/contacted/qualified/converted), score, source
- `interactions` — tipo (email/call/demo), dirección, outcome
- `sources` — nombre, tipo (api/scraper/manual), activo, leads generados
- `github_credits` — recurso, límite, usado, unidad, mes
- `source_runs` — historial de ejecuciones por fuente

## Skills

1. **Seed Data** — Carga inicial de 68 empresas reales mexicanas (DENUE-INEGI + cámaras empresariales)
2. **OpenStreetMap Nominatim** — Búsqueda gratuita, 1 req/s, sin API key
3. **Overpass API** — Consultas OSM avanzadas por categoría/ciudad
4. **Google Maps Places (opcional)** — API key necesaria, free tier 30k req/mes
5. **CSV Import** — Carga manual desde CSV vía SQL Developer
6. **Enrichment** — Enriquecimiento vía OSM (teléfono, website)
7. **Score** — Scoring automático por industria, ciudad, fuente
8. **Export** — CSV export para Oracle SQL Developer
9. **GitHub Credits Tracking** — Monitoreo de límites GitHub for Startups ($4,982.40/mes)

## MCP Integrations

- **File System MCP** — Lee/escribe DB, CSVs, configs
- **GitHub MCP** — Monitorea créditos, Actions usage, Packages storage
- **Process MCP** — Ejecuta scripts secuenciales (seed → enrich → export)
- **Database MCP** — Consultas SQL directas a la base de leads

## Fuentes de Datos (por orden de prioridad)

1. **Seed DENUE** (gratis, 0 costo) — 68 empresas reales MX cargadas
2. **OpenStreetMap** (gratis, 0 costo) — Nominatim + Overpass API
3. **Google Maps Places** (free tier) — Requiere API key, 30k req/mes gratis
4. **CSV Import** (manual) — Carga de tus propias listas desde Oracle SQL Developer
5. **Apollo.io / LinkedIn** (pago) — Para evaluación futura vs fuente gratuita

## GitHub Credits Awareness

Este agente NO debe consumir créditos de IA después del día 5 del mes.
Límite GitHub for Startups: $4,982.40/mes — usar máximo 50% ($2,491.20).
Recurso más valioso: Actions minutes (50,000/mes, 50% = 25,000).

## Outputs

- `ops/database/leads.db` — Base de datos SQL relacional
- `ops/database/exports/*.csv` — Exportaciones para Oracle
- `ops/runtime/dashboard-unified.json` — Stats para el dashboard
- `ops/runtime/implementation-report.json` — Reporte de implementación

## Comandos

```bash
# Cargar seed data (primera vez)
node scripts/lead-engine.mjs --mode seed

# Enriquecer con OpenStreetMap
node scripts/lead-engine.mjs --mode enrich

# Exportar a CSV para Oracle
node scripts/lead-engine.mjs --mode export
```
