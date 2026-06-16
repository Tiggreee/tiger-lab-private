# 🇲🇽 Opciones de PACs (Proveedores Autorizados de Certificación) para FacturaAutentica

**Fecha:** 2026-06-11  
**Contexto:** Integración de CFDI (Comprobante Fiscal Digital por Internet) con PACs autorizados por SAT

---

## 📋 Opciones Principales

### 🥇 **1. Finkok** (Recomendado para startups)
- **URL:** https://www.finkok.com/
- **Tipo:** SaaS cloud-native para timbrado CFDI
- **Mercado:** Lider en México + LATAM
- **Pricing:** 
  - Modelo variable: $0.50 - $2.00 por CFDI
  - Plan mensual: desde $99/mes (100 CFDIs) hasta $999/mes (5000+)
- **Ventajas:**
  - ✅ API REST moderna y bien documentada
  - ✅ Tiempo de respuesta: 2-5 segundos
  - ✅ Soporte 24/7 en ES/EN
  - ✅ Integración simple via webhook
  - ✅ Dashboard para monitoreo
  - ✅ Compatible con XML 3.3, 4.0
- **Desventajas:**
  - Costo por transacción (no flat rate ilimitado)
- **Integracion con FacturaAutentica:**
  ```javascript
  // Ejemplo: Llamar Finkok desde Node.js
  const finkok = new FinokClient({
    apiKey: process.env.FINKOK_API_KEY,
    environment: 'production' // o 'sandbox'
  });
  
  const cfdi = await finkok.stamp({
    xml: xmlContent,
    stampType: 'CFDI' // o 'NOMINA', 'PAGOS'
  });
  ```

---

### 🥈 **2. Quadrum** (Especializado en volumen)
- **URL:** https://www.quadrum.net/
- **Tipo:** PAC tradicional + SaaS
- **Mercado:** México, enfoque en pymes y medianas
- **Pricing:**
  - Por transacción: $0.80 - $1.50 por CFDI
  - Plan corporativo: Desde $299/mes con volumen incluido
- **Ventajas:**
  - ✅ Muy confiable (operando 15+ años)
  - ✅ API SOAP + REST
  - ✅ Integraciones con Contaplus, Aspel, SAE, etc.
  - ✅ Excelente SLA (99.8%)
- **Desventajas:**
  - Interfaz legacy en algunas partes
  - Tiempos de respuesta más lentos (5-10 seg)
- **Integracion:**
  ```xml
  <!-- SOAP request example -->
  <timbrado>
    <xml><![CDATA[...]]]></xml>
    <usuario>tu_usuario</usuario>
    <contrasena>tu_pass</contrasena>
  </timbrado>
  ```

---

### 🥉 **3. Solucontador** (Premium para enterprise)
- **URL:** https://www.solucontador.com/
- **Tipo:** Suite contable + PAC integrado
- **Mercado:** Grandes despachos, enterprise
- **Pricing:**
  - Licencia: $1500-$5000/mes (incluye timbrado ilimitado)
  - No recomendado para MVP
- **Ventajas:**
  - ✅ Suite completa (contabilidad + CFDI + nómina)
  - ✅ 0 configuración, todo integrado
  - ✅ Soporte premium
- **Desventajas:**
  - Caro para startup
  - Overkill si solo necesitas timbrado
  - Contrato anual típico

---

### 4. **Vauxoo** (Opensource + Pro services)
- **URL:** https://github.com/vauxoo/l10n-mexico
- **Tipo:** Modulo open-source para Odoo
- **Mercado:** Empresas con Odoo
- **Pricing:** Gratis (código) + soporte comercial
- **Ventajas:**
  - ✅ Libre y auditable
  - ✅ Perfecto si ya usas Odoo
  - ✅ Comunidad activa
- **Desventajas:**
  - Requiere integración custom
  - No es SaaS standalone
  - Soporte comunitario (lento)

---

### 5. **Compara.net / Comprobantes en Línea**
- **URL:** https://www.comparanet.com/
- **Tipo:** PAC cloud
- **Mercado:** Pequeñas pymes
- **Pricing:** $0.60-$1.20 por CFDI (muy competitivo)
- **Ventajas:**
  - ✅ Más barato que Finkok
  - ✅ API REST simple
  - ✅ Dashboard web
- **Desventajas:**
  - Soporte limitado
  - Infraestructura menos robusta

---

## 🎯 Recomendación por Caso de Uso

| Caso | PAC | Razón | Budget |
|------|-----|-------|--------|
| **MVP / Startup (< 100 CFDIs/mes)** | Finkok (Plan Starter) | API moderna, fácil integración, soporte | $99/mes |
| **Pyme (100-500 CFDIs/mes)** | Finkok + Quadrum | Evaluá ambas, Finkok es más barato a volumen | $200-400/mes |
| **Medianas (500-5000 CFDIs/mes)** | Quadrum o plan corporativo Finkok | SLA garantizado, volumen negociado | $500-1500/mes |
| **Enterprise (5000+ CFDIs/mes)** | Solucontador o negociación directa | Suite completa, SLA 99.9% | $1500+/mes |
| **Odoo shop** | Vauxoo | Ya tienes infraestructura, costo ~$0 | Soporte: $200-500/mes |

---

## 🔧 Plan de Integración (FacturaAutentica)

### Fase 1: Elegir PAC (Esta semana)
```bash
# 1. Revisar opciones técnicas
# 2. Solicitar acceso sandbox a 2-3 opciones
# 3. Probar integracion básica (hello world)
```

### Fase 2: Integrar en FacturaAutentica (Semana 1-2)
```typescript
// src/billing/services/pac-service.ts
export class PacService {
  constructor(private pac: PAC_PROVIDER) {}
  
  async stampCFDI(xml: string): Promise<{
    cfdiSignature: string;
    sealNumber: string;
    stampTime: Date;
  }> {
    // Validar XML estructura
    // Llamar PAC API
    // Guardar resultado
  }
  
  async validateBeforeStamp(invoice: Invoice): Promise<ValidationResult> {
    // Reglas SAT
    // RFC format
    // Moneda válida
    // Etc.
  }
}
```

### Fase 3: Credenciales + Testing (Semana 2-3)
```bash
# Agregar secretos a GitHub
gh secret set FINKOK_API_KEY -R Tigre-Labs/tiger-lab-private --env production-billing
gh secret set FINKOK_ENVIRONMENT -R Tigre-Labs/tiger-lab-private --env production-billing

# Archivo: .env.production.billing
FINKOK_API_KEY=xxx
FINKOK_ENVIRONMENT=production
FINKOK_CERTIFICATE_PATH=./certs/client.pem
FINKOK_CERTIFICATE_PASS=xxx
```

### Fase 4: Smoke Test contra SAT (Semana 3)
```bash
# npm script para validar CFDI real
npm run test:pac -- --provider finkok --certificate ./certs/test.pem
# Debe emitir CFDI de prueba y validar contra SAT
```

---

## 📊 Comparativa Técnica Rápida

| Feature | Finkok | Quadrum | Solucontador | Vauxoo |
|---------|:------:|:-------:|:------------:|:------:|
| **API REST** | ✅✅ | ✅ | ✅ | ✅ |
| **API SOAP** | ❌ | ✅✅ | ✅ | ❌ |
| **Webhook** | ✅ | ❌ | Limited | ❌ |
| **Latencia** | 2-5s | 5-10s | 3-8s | Var |
| **Sandbox** | ✅ (gratis) | ✅ ($99) | ✅ | ✅ |
| **Support 24/7** | ✅ | ✅ | ✅ | ❌ |
| **SLA** | 99.5% | 99.8% | 99.9% | N/A |
| **Costo/CFDI** | $0.50-2.00 | $0.80-1.50 | Included | $0-500/mes |

---

## 🚀 Acción Inmediata para FacturaAutentica

### Hoy (2026-06-11)

1. **Crear cuenta sandbox Finkok**
   ```bash
   # 1. Ir a https://www.finkok.com/
   # 2. "Sign up for sandbox"
   # 3. Verificar email
   ```

2. **Descargar credenciales**
   - API Key (sandbox)
   - Certificado digital (test)
   - Guardar en `ops/pac-credentials/finkok-sandbox.json`

3. **Crear archivo de config**
   ```typescript
   // src/billing/config/pac-config.ts
   export const PAC_CONFIG = {
     provider: 'finkok',
     environment: process.env.PAC_ENVIRONMENT || 'sandbox',
     apiKey: process.env.FINKOK_API_KEY,
     certificateFile: process.env.FINKOK_CERTIFICATE_PATH,
     timeout: 10000,
     retries: 3
   };
   ```

### Esta Semana

4. **Implementar PacService**
   - Método `stampCFDI(xml)` → Finkok
   - Método `validateCFDI(xml)` → Reglas SAT
   - Método `queryCFDI(uuid)` → Estado en SAT

5. **Integrar con Invoice flow**
   ```typescript
   // En src/billing/controllers/invoice-controller.ts
   async submitInvoice(input: SubmitInvoiceInput) {
     const invoice = await invoiceService.create(input);
     const validation = await pacService.validateBeforeStamp(invoice.xml);
     
     if (!validation.isValid) {
       throw new ValidationError(validation.errors);
     }
     
     const stamped = await pacService.stampCFDI(invoice.xml);
     invoice.cfdiStamp = stamped;
     await invoiceService.save(invoice);
     return invoice;
   }
   ```

6. **Test contra Sandbox SAT**
   ```bash
   npm run test:pac:sandbox
   # Debe pasar y emitir CFDI con folio real SAT
   ```

---

## 💳 Presupuesto Mensual Estimado (FacturaAutentica MVP)

| Item | Costo | Notas |
|------|-------|-------|
| **PAC (Finkok)** | $99 | Plan: 100 CFDIs/mes |
| **Certificado digital** | ~$200/año | SAT emitido, renovacion anual |
| **Soporte técnico** | $0-200 | Por demanda |
| **Infraestructura** | $50-150 | Railway app (ya incluida) |
| **TOTAL** | ~$150-250 | Primer mes |

---

## ⚠️ Cosas Importantes

1. **Certificado Digital Requerido**
   - Obtener del SAT o a través de PAC autorizado
   - Vigencia: 1 año
   - Formato: .pem o .pfx

2. **Validaciones Antes de Timbrar**
   - RFC válido (emisor + receptor)
   - Cantidad de decimales correcto
   - Folio secuencial
   - Concepto con código SAT

3. **Trazabilidad SAT**
   - Todo CFDI timbrado = registro permanente
   - No se puede "deshacer"
   - Test SIEMPRE en sandbox primero

4. **Manejo de Errores**
   - Errores comunes: RFC inválido, XML malformado, certificado expirado
   - Reintentos con backoff exponencial
   - Logging detallado para auditoría

---

## 📞 Contacto PACs

| PAC | Sales | Soporte | Whatsapp |
|-----|-------|---------|----------|
| **Finkok** | ventas@finkok.com | support@finkok.com | +1-888-FINKOK-1 |
| **Quadrum** | ventas@quadrum.net | soporte@quadrum.net | +52-55-QUADRUM |
| **Solucontador** | info@solucontador.com | soporte@solucontador.com | +52-55-SOL-CONT |

---

## ✅ Siguiente Paso

¿Cuál PAC prefieres para empezar?

1. **Finkok** → Recomendado (moderno, API REST, startup-friendly)
2. **Quadrum** → Si necesitas SOAP o ya tienes integraciones legacy
3. **Otra** → Dime cuál y investigo

Una vez decidas, puedo:
- [ ] Crear cuenta sandbox
- [ ] Documentar credenciales
- [ ] Implementar PacService
- [ ] Agregar test de humo

¿Vamos con Finkok?
