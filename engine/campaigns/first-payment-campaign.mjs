#!/usr/bin/env node
/**
 * First Payment Campaign — engine/campaigns/first-payment-campaign.mjs
 * One campaign. One goal: first payment. Direct to Stripe checkout.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve('ops/runtime/campaigns/FIRST-PAYMENT');

const STRIPE_CHECKOUT_URL = 'https://tiger-backend-production.up.railway.app/api/checkout?product=docflow-api&plan=starter';

// 6-channel campaign — all pointing to same checkout
const campaign = {
  id: 'FIRST-PAYMENT',
  product: 'Docflow API',
  goal: 'First payment — OBJ-01',
  createdAt: new Date().toISOString(),
  checkoutUrl: STRIPE_CHECKOUT_URL,
  channels: {
    email: {
      subject: 'Docflow API — Automatiza tu flujo documental hoy',
      body: `Hola,

Imagina recuperar 10 horas por semana que hoy pierdes en papeleo.

Docflow API automatiza TODO tu flujo documental:
✅ Flujos de trabajo automatizados
✅ CFDI 4.0 nativo (facturación electrónica MX)
✅ Integración con tu stack en minutos

Primer mes a precio de lanzamiento: $69 USD.

👉 Pruébalo ahora: ${STRIPE_CHECKOUT_URL}

— Tiger Lab`,
      format: 'email'
    },
    linkedin: {
      body: `🔥 Recupera 10h/semana en papeleo.

Docflow API automatiza tu flujo documental completo:
✅ Workflows automatizados
✅ CFDI 4.0 nativo MX
✅ API-first. Sin fricción.

💡 Primer mes: $69 USD
👉 ${STRIPE_CHECKOUT_URL}

#Automatización #SaaS #PyMEs #Productividad`,
      format: 'text'
    },
    x: {
      body: `🔥 Recupera 10h/semana. Docflow API automatiza tu flujo documental. CFDI 4.0 nativo. $69/mes. ${STRIPE_CHECKOUT_URL}`,
      format: 'text'
    },
    facebook: {
      body: `🔥 Deja de perder 10 horas por semana en papeleo.

Docflow API automatiza todo tu flujo documental:
✅ Workflows inteligentes
✅ Facturación electrónica CFDI 4.0 nativa
✅ Integración en minutos, no meses

💡 Primer mes a solo $69 USD.

👉 ${STRIPE_CHECKOUT_URL}

Tu tiempo vale más. Automatízalo.`,
      format: 'text'
    },
    telegram: {
      body: `*Docflow API* 🔥\n\nRecupera 10h/semana en papeleo.\n\n✅ Workflows automatizados\n✅ CFDI 4.0 nativo\n✅ API-first\n\n💡 $69/mes — [Pruébalo aquí](${STRIPE_CHECKOUT_URL})`,
      format: 'markdown'
    },
    discord: {
      body: `**Docflow API** 🔥\n\nRecupera 10h/semana automatizando tu flujo documental.\n\n✅ Workflows | ✅ CFDI 4.0 | ✅ API-first\n\n💡 $69/mes → ${STRIPE_CHECKOUT_URL}`,
      format: 'markdown'
    }
  }
};

mkdirSync(OUT, { recursive: true });

for (const [ch, data] of Object.entries(campaign.channels)) {
  const ext = ch === 'email' ? 'html' : ch === 'telegram' || ch === 'discord' ? 'md' : 'txt';
  writeFileSync(resolve(OUT, `${ch}.${ext}`), data.body, 'utf8');
}

writeFileSync(resolve(OUT, 'campaign.json'), JSON.stringify(campaign, null, 2), 'utf8');

// Update campaign index
const indexDir = resolve('ops/runtime/campaigns');
const index = { updated: new Date().toISOString(), total: 1, campaigns: [{ id:'FIRST-PAYMENT', product:'Docflow API', score:90, status:'draft', channels:Object.keys(campaign.channels), createdAt:campaign.createdAt }] };
writeFileSync(resolve(indexDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');

console.log('=== FIRST PAYMENT CAMPAIGN ===');
console.log(`ID: FIRST-PAYMENT`);
console.log(`Product: Docflow API`);
console.log(`Goal: First payment`);
console.log(`Checkout: ${STRIPE_CHECKOUT_URL}`);
console.log(`Channels: ${Object.keys(campaign.channels).join(', ')}`);
console.log(`\n📂 Files in ${OUT}/`);
console.log(`\n⏭️  Next:`);
console.log(`   1. Open dashboard → Campaign Panel → Approve FIRST-PAYMENT`);
console.log(`   2. Click checkout link → pay $69 (or $1 test)`);
console.log(`   3. OBJ-01 ✅ First payment DONE`);
