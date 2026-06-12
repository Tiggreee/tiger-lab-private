---
name: market-research
description: 'Ejecuta investigación de mercado profunda para sistemaLead. Usa cuando necesites validar un producto nuevo, identificar audiencia objetivo, encontrar huecos de mercado en México/LATAM, o cuando el engine necesite datos reales para decidir qué construir. Activa este skill para: análisis de demanda CFDI, herramientas SMB, canales de venta B2B, productos digitales sin inversión previa, Jobs to be Done, inteligencia competitiva. NO usar para debugging técnico ni configuración de infraestructura.'
argument-hint: 'Describe el segmento o producto a investigar, por ejemplo: "herramientas de facturación para despachos contables MX" o "automatización operativa para SMB LATAM".'
user-invocable: true
---

# Market Research — sistemaLead

Skill de investigación de mercado profunda para alimentar a los agentes creadores de producto del engine.

## Ideas y conceptos pendientes de validar

Esta sección recibe ideas en bruto para que el investigador las tome como punto de partida. Agregar aquí cualquier concepto, situación o problema que pueda convertirse en producto.

### Ideas activas (agregar abajo):

- **Conector universal entre IAs** — Un producto que funcione como "lazo" o bridge entre modelos de IA distintos (Grok, GPT, Claude, Gemini, etc.) permitiendo orquestar contexto, resultados y flujos entre ellos sin que el usuario sepa qué modelo está usando. Similar a lo que hace tigre-labs-context-engine internamente pero como producto vendible a equipos y empresas. Investigar: ¿cuántos equipos hoy usan 2+ IAs distintas? ¿qué problema operativo genera eso? ¿qué pagan por soluciones similares?

> Para agregar más ideas: escribe una línea con guión bajo comenzando con `**Nombre de idea**` seguido de descripción del problema que resuelve y a quién se lo vendes.

---

## Contexto de sistemaLead

sistemaLead es un engine de monetización autónomo que:
- Genera productos digitales (SaaS, APIs, scripts, kits) desde plantillas de código
- Los publica automáticamente en LinkedIn, X, Facebook, Telegram y Discord
- Captura leads, los califica y los lleva a checkout (PayPal)
- Opera sin inversión inicial: vende primero, integra funcionalidad avanzada después

**Restricción de diseño:** El primer producto viable debe venderse con lo que ya existe en sistemaLead: checkout PayPal + social packs + landing page. Sin costo fijo nuevo antes de validar.

## Procedimiento

### Paso 1: Identificar el segmento objetivo

Determinar si la investigación aplica a:
- Facturación CFDI (contadores, despachos, operaciones SMB)
- Automatización operativa (scripts, runbooks, integraciones)
- Herramientas digitales para SMB México/LATAM
- Otro segmento especificado en el argumento

### Paso 2: Investigar con fuentes de acceso legal

Buscar en fuentes abiertas y recientes (2024-2026). Si no hay evidencia, declararlo explícitamente. No inventar datos.

**Mercado de facturación CFDI México:**
- Volumen de emisores CFDI según SAT/INEGI
- Porcentaje de micros y pequeñas empresas afectadas
- Pain operativo reportado en foros de contadores (grupos FB, Reddit MX, comunidades profesionales)
- Rango de precios que pagan hoy por herramientas de facturación
- Competidores dominantes y sus huecos

**Herramientas de automatización SMB México/LATAM:**
- Herramientas no-ERP, no-CRM que usan hoy
- Disposición a pagar por automatización sin instalación
- Canales de descubrimiento: LinkedIn, YouTube, WhatsApp, foros
- Fuentes: Product Hunt MX, G2, Capterra, grupos LinkedIn SMB MX

**Canales de venta activos para SaaS B2B en México:**
- Canal con mayor tracción real hoy para B2B SMB
- Tipo de oferta que convierte mejor: diagnóstico, demo, prueba gratuita
- Datos de conversión por canal para tickets de 39-99 USD/mes

**Productos digitales sin infra que monetizan en LATAM:**
- Templates, scripts, kits, herramientas de pre-validación
- Marketplaces con tracción: Gumroad, Lemon Squeezy, AppSumo, Hotmart

**Señales de demanda específica:**
- Buscar: "errores CFDI", "automatizar facturación despacho", "API facturación México",
  "automatizar operaciones SMB México", "herramienta contadores México"
- Preguntas recurrentes en LinkedIn, X, Reddit, Quora MX
- Soluciones incompletas de la competencia

### Paso 3: Identificar Jobs to be Done sin resolver

Máximo 5, ordenados por urgencia. Formato: quién, qué trabajo, por qué no está resuelto hoy.

### Paso 4: Construir reporte accionable

Entregar en este formato exacto:

---

**1. Resumen ejecutivo** — 3 a 5 bullets accionables para el engine

**2. Segmento de mayor oportunidad** — quién, tamaño estimado, dolor principal, disposición a pagar

**3. Productos viables sin inversión previa** — qué puede construir sistemaLead ahora mismo con lo que tiene

**4. Canales con mayor ROI para lanzamiento inmediato** — ordenados por tracción real

**5. Competidores y huecos de mercado** — qué no están resolviendo bien

**6. Jobs to be Done sin resolver** — máximo 5, ordenados por urgencia

**7. Recomendación de producto siguiente para el engine** — con justificación de evidencia concreta

**8. Fuentes consultadas** — URL o nombre de fuente para cada dato

---

## Restricciones de entrega

- No proponer productos que requieran costo fijo antes de validar mercado
- No inventar datos: si no hay evidencia, declarar "Sin datos disponibles"
- Priorizar México primero, luego LATAM
- La recomendación final debe ser implementable con: checkout PayPal + social pack + landing page existente

## Referencias del repo

- [PAC_MODE.txt](../../../PAC_MODE.txt) — estado actual de integración PAC (leer antes de proponer productos fiscales)
- [ops/catalog/products.json](../../../ops/catalog/products.json) — catálogo activo
- [ops/catalog/plans.json](../../../ops/catalog/plans.json) — precios actuales
- [scripts/product-operability-report.mjs](../../../scripts/product-operability-report.mjs) — operabilidad por producto
- [docs/internal/AUTOMATED_MONETIZATION_MASTER_PLAN.md](../../../docs/internal/AUTOMATED_MONETIZATION_MASTER_PLAN.md) — plan maestro
