import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const LANDINGS_DIR = join(ROOT, 'ops', 'landings');
const CATALOG_PATH = join(ROOT, 'ops', 'catalog', 'products.json');

const CHANNELS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    tone: 'thought-leadership, profesional, casos de uso',
    maxChars: 2800,
    format: 'long-form post'
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    tone: 'directo, punchy, con call-to-action',
    maxChars: 280,
    format: 'tweet thread or single tweet'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    tone: 'comunitario, testimonial, conversacional',
    maxChars: 63206,
    format: 'post con storytelling'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    tone: 'directo, propositivo, enlace directo',
    maxChars: 4096,
    format: 'mensaje con call-to-action inmediato'
  },
  {
    id: 'discord',
    name: 'Discord',
    tone: 'tecnico, detallado, para early adopters',
    maxChars: 2000,
    format: 'anuncio tecnico con detalles de implementacion'
  }
];

function loadPlans() {
  const plansPath = join(ROOT, 'ops', 'catalog', 'plans.json');
  if (!existsSync(plansPath)) return {};
  try {
    const raw = readFileSync(plansPath, 'utf-8');
    const data = JSON.parse(raw);
    const map = {};
    for (const pl of (data.plans || [])) {
      map[pl.id] = pl;
    }
    return map;
  } catch {
    return {};
  }
}

function resolveProductPlans(product) {
  const planMap = loadPlans();
  if (product.plans && Array.isArray(product.plans) && product.plans.length > 0) {
    return product.plans;
  }
  const planIds = product.planIds || product.plans || [];
  return planIds.map(id => {
    if (typeof id === 'object') return id;
    const plan = planMap[id];
    return plan ? { name: plan.name, price: plan.priceMonthly } : null;
  }).filter(Boolean);
}

function loadProducts() {
  if (!existsSync(CATALOG_PATH)) {
    console.error('Catalog not found at', CATALOG_PATH);
    return [];
  }
  const raw = readFileSync(CATALOG_PATH, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.error('Invalid JSON in catalog');
    return [];
  }
  const products = data.products || data || [];
  return Array.isArray(products) ? products : [];
}

function landingContent(product, channel) {
  const productName = product.name || product.id;
  const resolvedPlans = resolveProductPlans(product);
  const tagline = product.tagline || product.description || `${productName} - Automatizacion inteligente`;
  const priceInfo = resolvedPlans.length > 0
    ? resolvedPlans.map(p => `${p.name}: $${p.price}/mo`).join(' | ')
    : '$39-$99/mo';
  const cheapestPlan = resolvedPlans.length > 0
    ? `$${Math.min(...resolvedPlans.map(p => p.price || 999))}/mo`
    : '$39/mo';
  const status = product.status || 'active';
  const statusNote = status === 'paused'
    ? ' (PROXIMAMENTE: requiere PAC para facturacion CFDI)'
    : '';

  product._resolvedPlans = resolvedPlans;
  product._cheapestPlan = cheapestPlan;

  const landing = {
    productId: product.id,
    productName: productName,
    channelId: channel.id,
    channelName: channel.name,
    generatedAt: new Date().toISOString(),
    status: status,
    seo: {
      title: `${productName} en ${channel.name} | Tiger Lab`,
      description: tagline.substring(0, 160),
      keywords: [productName, channel.name.toLowerCase(), 'automatizacion', 'tiger lab'],
      ogImage: null
    },
    copy: {
      headline: generateHeadline(productName, tagline, channel),
      body: generateBody(product, channel),
      cta: status === 'active' ? 'Agenda tu diagnostico gratis: https://cal.com/victor-tigerlab/diagnostic' : 'Proximamente. Notificame cuando este disponible.',
      tone: channel.tone
    },
    tracking: {
      utmSource: channel.id.toLowerCase().replace(/\s+/g, ''),
      utmCampaign: `landing-${product.id}-${channel.id}`,
      utmContent: `social-landing-${Date.now()}`
    },
    metrics: {
      targetChars: channel.maxChars,
      actualChars: 0,
      qualityScore: null
    }
  };

  landing.metrics.actualChars = landing.copy.headline.length + landing.copy.body.length + landing.copy.cta.length;
  landing.metrics.qualityScore = Math.min(100, Math.round((1 - Math.abs(landing.metrics.actualChars - channel.maxChars * 0.7) / (channel.maxChars * 0.7)) * 80 + 20));

  return landing;
}

function generateHeadline(name, tagline, channel) {
  const headlines = {
    linkedin: [
      `Como ${name.toLowerCase()} esta transformando la operacion de SMBs en Mexico`,
      `${name}: La herramienta que tu equipo necesita para dejar de hacer procesos manuales`,
      `De lo manual a lo automatico: ${name}`
    ],
    twitter: [
      `${name} ya esta aqui. Automatiza tu operacion en minutos.`,
      `${name} → Deja de perder tiempo en procesos manuales.`,
      `${name} para equipos que quieren crecer sin contratar mas gente.`
    ],
    facebook: [
      `🤖 ${name} - La historia de como dejamos de hacer procesos manuales`,
      `Tu negocio merece herramientas profesionales. ${name}`,
      `${name} ya esta disponible para equipos como el tuyo`
    ],
    telegram: [
      `${name} - Automatizacion para SMBs Mexicanas`,
      `${name}: Precio accesible, resultados reales`,
      `${name} - Prueba gratis 14 dias`
    ],
    discord: [
      `${name} - Release Notes & Tech Specs`,
      `${name} esta disponible. Integracion tecnica y API docs.`,
      `${name} - Para devs que construyen el futuro de las SMBs`
    ]
  };
  const pool = headlines[channel.id] || [tagline];
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateBody(product, channel) {
  const productName = product.name || product.id;
  const cheap = product._cheapestPlan || '$39/mo';
  const cheapestPlan = cheap.includes('/mo') ? cheap : `${cheap}/mo`;
  const features = product.features || ['API Access', 'Automation', 'Reports', 'Support'];

  const bodies = {
    linkedin: [
      `En Tiger Lab construimos ${productName} para resolver los problemas reales de las SMBs en Mexico.

Sabemos que la mayoria de los equipos pequenos no tienen un area de tecnologia dedicada. Por eso creamos una herramienta que:
• ${features.slice(0, 3).join('\n• ')}

Con ${cheapestPlan} empiezas. Sin contratos largos. Sin equipo tecnico.

La pregunta no es si necesitas automatizar. Es cuanto tiempo mas puedes permitirte no hacerlo.

Agenda un diagnostico gratuito de 15 min y descubre como ${productName} puede transformar tu operacion.`,
      `${productName} no es solo software. Es la respuesta a "no tenemos tiempo para implementar tecnologia".

Construimos para el founder que hace de CTO, el COO que tapita incendios, el equipo que crece sin procesos.

✅ ${features.slice(0, 4).join('\n✅ ')}

Resultados en semanas, no en meses. Desde ${cheapestPlan}.`
    ],
    twitter: [
      `${productName} para SMBs Mexicanas.

✅ ${features.slice(0, 3).join('\n✅ ')}

Desde ${cheapestPlan} · 14 dias gratis
→ Agenda: https://cal.com/victor-tigerlab/diagnostic`,
      `${productName} esta vivo.

${features.slice(0, 2).join('\n')}

${cheapestPlan} · Sin equipo tecnico necesario
Diagnostico gratis: https://cal.com/victor-tigerlab/diagnostic`
    ],
    facebook: [
      ` 🚀 Lanzamos ${productName} para equipos pequenos en Mexico.

Historia rapida: Trabajamos con decenas de SMBs que nos decian "no tenemos tiempo para implementar tecnologia". Tienen el dinero, tienen la intencion, pero no el equipo interno.

Construimos ${productName} para ellos.

🔹 ${features.slice(0, 3).join('\n🔹 ')}

Desde ${cheapestPlan}. 14 dias de prueba gratis.

Agenda tu diagnostico: https://cal.com/victor-tigerlab/diagnostic

Comparte este post con alguien que este creciendo su operacion.`,
      `${productName} ya esta disponible.

Si tu equipo:
• Pasa mas de 5 horas/semana en ${['reportes manuales', 'conciliacion', 'facturacion', 'deploys'][Math.floor(Math.random() * 4)]}
• No tiene area de tecnologia dedicada
• Esta creciendo y los procesos se estan quedando atras

Esto es para ti.

${features.slice(0, 3).join(', ')}.

Desde ${cheapestPlan}. Diagnostico gratis.`
    ],
    telegram: [
      `${productName} - Automatizacion directa para tu operacion.

${features.slice(0, 3).map(f => `• ${f}`).join('\n')}

Precio: ${cheapestPlan}
Prueba: 14 dias gratis

Agenda: https://cal.com/victor-tigerlab/diagnostic`,
      `${productName} disponible.

${features.slice(0, 2).map(f => `• ${f}`).join('\n')}

$${cheapestPlan.split('/mo')[0].replace('$', '')}/mes · 14 dias gratis
→ https://cal.com/victor-tigerlab/diagnostic`
    ],
    discord: [
      `**${productName} — Now Available**

**Status**: Active | **Pricing**: ${cheapestPlan}
**Stack**: Node.js 20+, TypeScript, REST API
**Auth**: API Key via header \`X-API-Key\`

**Features**:
${features.map(f => `• \`${f.toLowerCase().replace(/\s+/g, '-')}\``).join('\n')}

**Docs**: https://tigerlab.dev/docs/${product.id}
**Support**: Discord ticket or victor@tigerlab.dev

To get started, book a diagnostic: https://cal.com/victor-tigerlab/diagnostic`,
      `**${productName} Release**

Target: SMBs in Mexico (3-50 employees)
Pricing: ${cheapestPlan}
Trial: 14 days, no credit card required

**Integration Guide**:
1. Book diagnostic
2. We configure your instance
3. Start automating

Questions? Open a ticket.`
    ]
  };

  const pool = bodies[channel.id] || [`${productName} disponible en ${channel.name}. Agenda tu demo.`];
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateIndex(allLandings) {
  const byProduct = {};
  for (const l of allLandings) {
    if (!byProduct[l.productId]) byProduct[l.productId] = { product: l.productName, status: l.status, channels: [] };
    byProduct[l.productId].channels.push(l.channelName);
  }

  const activeProducts = Object.values(byProduct).filter(p => p.status === 'active');
  const pausedProducts = Object.values(byProduct).filter(p => p.status === 'paused');

  return {
    title: 'Tiger Lab - Social Landing Pages Index',
    generatedAt: new Date().toISOString(),
    summary: {
      totalProducts: Object.keys(byProduct).length,
      activeProducts: activeProducts.length,
      pausedProducts: pausedProducts.length,
      totalLandingPages: allLandings.length,
      channelsUsed: CHANNELS.map(c => c.name)
    },
    products: byProduct,
    activeProducts: activeProducts.map(p => p.product),
    pausedProducts: pausedProducts.map(p => ({ name: p.product, note: 'Requiere PAC Finkok para CFDI. Presupuestado $99/mes.' })),
    cta: 'https://cal.com/victor-tigerlab/diagnostic',
    note: 'Cada landing page esta optimizada para el tono y formato de su canal social.'
  };
}

function saveLanding(landing) {
  const dir = join(LANDINGS_DIR, landing.productId);
  mkdirSync(dir, { recursive: true });
  const filename = `landing-${landing.productId}-${landing.channelId}.json`;
  const filepath = join(dir, filename);
  writeFileSync(filepath, JSON.stringify(landing, null, 2), 'utf-8');
  return filepath;
}

function saveIndex(index) {
  const filepath = join(LANDINGS_DIR, 'index.json');
  writeFileSync(filepath, JSON.stringify(index, null, 2), 'utf-8');
  return filepath;
}

function saveSocialPackFromLandings(allLandings) {
  const socialPacksDir = join(ROOT, 'ops', 'traffic', 'outbox');
  mkdirSync(socialPacksDir, { recursive: true });

  const byChannel = {};
  for (const l of allLandings) {
    const ch = l.channelId;
    if (!byChannel[ch]) byChannel[ch] = { id: ch, name: l.channelName, channelType: ch, products: [] };
    byChannel[ch].products.push({
      id: l.productId,
      name: l.productName,
      headline: l.copy.headline,
      body: l.copy.body,
      cta: l.copy.cta,
      tracking: l.tracking,
      qualityScore: l.metrics.qualityScore
    });
  }

  const pack = {
    campaign: `landing-social-${new Date().toISOString().slice(0, 10)}`,
    generatedAt: new Date().toISOString(),
    funnel: {
      trafficDestination: 'https://tiger-backend-production.up.railway.app/checkout?product=docflow-api',
      closeChannel: 'landing',
      closeDestination: 'https://tiger-backend-production.up.railway.app/checkout?product=docflow-api',
      closeLink: 'https://tiger-backend-production.up.railway.app/checkout?product=docflow-api'
    },
    channels: {},
    summary: { totalProducts: Object.keys(byChannel).length > 0 ? [...new Set(allLandings.map(l => l.productId))].length : 0, totalChannels: Object.keys(byChannel).length }
  };

  for (const [chId, chData] of Object.entries(byChannel)) {
    const topProducts = chData.products.slice(0, 3);
    pack.channels[chId] = {
      channelName: chData.name,
      copyPaste: topProducts.map(p => `${p.headline}\n\n${p.body}\n\nCTA: ${p.cta}`).join('\n\n---\n\n'),
      productCount: chData.products.length,
      appendedUTM: topProducts[0]?.tracking?.utmSource || chId,
      disclaimer: 'Generated by LandingSocialAgent. Validate CTA links before publishing.'
    };
  }

  const packPath = join(socialPacksDir, `social-pack-landing-social.json`);
  writeFileSync(packPath, JSON.stringify(pack, null, 2), 'utf-8');
  return packPath;
}

function main() {
  console.log('Generating social landing pages for all products...\n');

  const products = loadProducts();
  if (products.length === 0) {
    console.warn('No products found in catalog. Run product registration first.');
    return;
  }

  const allLandings = [];

  for (const product of products) {
    console.log(`  Processing: ${product.name || product.id} (${product.status || 'unknown'})`);
    for (const channel of CHANNELS) {
      const landing = landingContent(product, channel);
      const path = saveLanding(landing);
      allLandings.push(landing);
      console.log(`    -> ${channel.name}: ${path}`);
    }
    console.log('');
  }

  const index = generateIndex(allLandings);
  const indexPath = saveIndex(index);
  console.log(`Index: ${indexPath}`);

  const packPath = saveSocialPackFromLandings(allLandings);
  console.log(`Social pack (autopilot): ${packPath}`);

  console.log(`\nTotal: ${allLandings.length} landing pages for ${products.length} products across ${CHANNELS.length} channels.`);
}

main();
