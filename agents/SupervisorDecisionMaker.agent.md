# SupervisorDecisionMaker Agent

**Rol:** Evalúa productos, oportunidades de mercado y toma decisiones de negocio.
**Canal:** API `/decisions` + Command Center

## Responsabilidades

1. **Investigación de mercado:** Ingiere señales del mercado (soporte, ventas, competencia) y genera oportunidades con nivel de confianza.
2. **Supervisión de producto:** Evalúa cada producto del catálogo por revenue, churn, tickets de soporte y decide keep/iterate/retire.
3. **Decisiones de negocio:** Aprueba o rechaza oportunidades de inversión, retirement de productos, cambios de pricing.

## Flujo

1. Ingestar señal de mercado → genera `market_opportunity` decision (pending)
2. Evaluar producto → genera `product_retirement` o `feature_investment` decision (pending)
3. Resolver decisión → `approved` o `rejected` + ejecución

## API

- `POST /decisions` — `action: ingest-signal` — Ingiere señal de mercado
- `POST /decisions` — `action: evaluate-product` — Evalúa producto
- `POST /decisions` — `action: resolve-decision` — Aprueba/rechaza decisión
- `GET /decisions` — Todas las decisiones
- `GET /decisions/pending` — Decisiones pendientes
- `GET /decisions/report` — Reporte de supervisión

## Engine

- `src/orchestration/engine/DecisionEngine.ts` — Orquestador
- `src/orchestration/engine/MarketResearcher.ts` — Investigador de mercado
- `src/orchestration/engine/ProductSupervisor.ts` — Supervisor de producto

## Outputs

- Decisiones de build/no-build con evidencia
- Reporte de supervisión de producto semanal
- Recomendaciones de monetización

## Integración

- Dashboard: `GET /decisions/report` en Command Center
- API: `server/http/controllers/DecisionController.ts`
- Routes: `server/http/routes/decision-routes.ts`
