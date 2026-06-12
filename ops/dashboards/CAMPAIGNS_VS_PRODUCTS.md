# 🎯 CLARIFICACIÓN: Campañas vs Productos

## 📦 PRODUCTOS en Catálogo (ops/catalog/products.json)

```
1. ✅ facturautentico              (active)
2. ✅ facturautentico-cloud        (active)
3. ✅ docflow-api                  (active)
4. ✅ script-premium-kit           (active)
5. ⏳ sentrylog-lite               (planned)
```

**Total: 5 productos activos + 1 planned**

---

## 📢 CAMPAÑAS ACTUALES (Social Packs = Anuncios en Redes)

### ✅ CAMPAÑAS REALES (Promocionan productos que EXISTEN)

| Campaña | Promociona | Catálogo | Status | URL |
|---------|-----------|----------|--------|-----|
| **facturaautentica-railway-ready-2026-06-01** | FacturaAutentica | ✓ EXISTE | 🟢 READY | Railway ✓ |
| **mcp-cfdi-2026-06-11** | FacturaAutentica | ✓ EXISTE | 🟢 READY | External |
| **mcp-leads-2026-06-11** | FacturaAutentica Growth | ✓ EXISTE* | 🟢 READY | External |
| **facturautentico-cloud-pilot** | FacturAutentico Cloud | ✓ EXISTE | 🟢 READY | Staging |
| **script-premium-kit-pilot** | Script Premium Kit | ✓ EXISTE | 🟢 READY | Staging |
| **docflow-api-pilot** | Docflow API | ✓ EXISTE | 🟢 READY | Staging |

**Total: 6 campañas REALES**

---

### ⚠️ CAMPAÑAS PROBLEMÁTICAS (Promocionan productos que NO EXISTEN)

| Campaña | Promociona | En Catálogo? | Problema |
|---------|-----------|-------------|----------|
| **all-about-money-pilot** | "all-about-money" | ❌ NO | Producto no existe en catálogo |
| **launch-4-products** | "(Genérico)" | ❌ NO | Sin brand.productName, solo WhatsApp |

**Total: 2 campañas PROBLEMÁTICAS**

---

## 🔍 Análisis por Campaña

```
CAMPAÑAS REALES (6):
├─ facturaautentica-railway-ready    ✅ Puedo lanzar (tengo producto + PAC pending)
├─ mcp-cfdi                           ✅ Puedo lanzar (mismo producto)
├─ mcp-leads                          ✅ Puedo lanzar (mismo producto)
├─ facturautentico-cloud-pilot       ✅ Puedo lanzar (tengo producto)
├─ script-premium-kit-pilot          ✅ Puedo lanzar (tengo producto)
└─ docflow-api-pilot                 ✅ Puedo lanzar (tengo producto)

CAMPAÑAS PROBLEMÁTICAS (2):
├─ all-about-money-pilot             ❓ ¿Existe el producto all-about-money?
└─ launch-4-products                 ❓ ¿Cuáles son los 4 productos?
```

---

## ❓ Preguntas Críticas para Ti

1. **all-about-money-pilot**
   - ¿Es un producto real que debería estar en el catálogo?
   - ¿Es un test/pilot que no querés publicitar?
   - **Acción:** Confirmar o eliminar

2. **launch-4-products**
   - ¿Es una campaña genérica multiproducto?
   - ¿O es un test?
   - **Acción:** Confirmar productos o eliminar

3. **MCP Leads/CFDI**
   - ¿Son campañas diferentes de facturaautentica-railway-ready?
   - ¿O son variantes de la misma campaña de FacturaAutentica?
   - Si son iguales → Consolidar en una sola

---

## 🎬 Resumen Estado

```
Campañas que PUEDO LANZAR AHORA (si confirmas PAC):
├─ facturaautentica-railway-ready    (Score 95, Railway ✓)
├─ mcp-cfdi-2026-06-11               (Score 100, FacturaAutentica)
├─ mcp-leads-2026-06-11              (Score 97, FacturaAutentica)
├─ facturautentico-cloud-pilot       (Score 100, staging)
├─ script-premium-kit-pilot          (Score 100, staging)
└─ docflow-api-pilot                 (Score 100, staging)

Campañas que NECESITO ACLARACIÓN:
├─ all-about-money-pilot             (¿Producto existente o test?)
└─ launch-4-products                 (¿Genérico o test?)
```

---

**¿Las 2 campañas problemáticas son basura también, o son reales?**
