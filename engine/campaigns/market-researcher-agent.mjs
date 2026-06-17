#!/usr/bin/env node
/**
 * Market Researcher Agent — engine/campaigns/market-researcher-agent.mjs
 * Right hand of Creative Agent. Provides market insights, competitive analysis, audience data.
 * Input: Product. Output: Market briefing with angles, pain points, keywords, positioning.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const RESEARCH_DIR = resolve('ops/runtime/market-research');

// Market intelligence database (Spanish market focus)
const MARKET_DATA = {
  'contabilidad': {
    segments: ['Micro empresas', 'Freelancers', 'PyMEs', 'Contadores'],
    painPoints: [
      'Pérdida de 10+ horas semanales en papeleo',
      'No cumplen con requisitos del SAT a tiempo',
      'Integración manual entre sistemas',
      'Errores en facturación electrónica',
      'Falta de control sobre documentos',
      'No tienen visibilidad en tiempo real de impuestos'
    ],
    keywords: ['Automatización', 'SAT', 'Facturación electrónica', 'CFDI', 'Timbre', 'Deducible', 'Cumplimiento', 'Eficiencia'],
    trendingTopics: ['IA en contabilidad', 'Automatización fiscal', 'Compliance SAT', 'Paperless office'],
    searchVolume: { high: ['CFDI', 'Facturación', 'Contabilidad'], medium: ['Automatización contable', 'Software factura'] }
  },
  'administración': {
    segments: ['Administradores de negocios', 'Dueños PyMEs', 'Gerentes operacionales'],
    painPoints: [
      'Demasiados sistemas desconectados',
      'Información financiera lenta y atrasada',
      'Difícil tomar decisiones rápidas',
      'Equipos pierden tiempo en tareas manuales',
      'Sin visibilidad de cash flow real'
    ],
    keywords: ['Dashboard', 'Integración', 'Automatización', 'Eficiencia operacional', 'Control', 'Visibilidad', 'Decisiones'],
    trendingTopics: ['Dashboards ejecutivos', 'Automatización operacional', 'Inteligencia de negocios', 'Visibilidad en tiempo real'],
    searchVolume: { high: ['Dashboard negocios', 'ERP PYME'], medium: ['Automatización procesos'] }
  },
  'ventas': {
    segments: ['Equipos de ventas', 'Gerentes comerciales', 'Emprendedores'],
    painPoints: [
      'Leads no calificados',
      'Falta de follow-up sistemático',
      'Pipeline desorganizado',
      'Pérdida de clientes por falta de comunicación',
      'Sin ROI claro en campañas'
    ],
    keywords: ['Leads', 'CRM', 'Seguimiento', 'Conversión', 'ROI', 'Pipeline', 'Automatización ventas'],
    trendingTopics: ['Sales automation', 'Lead qualification', 'Intent data', 'Personalization at scale'],
    searchVolume: { high: ['CRM', 'Lead generation'], medium: ['Sales automation'] }
  }
};

// Competitive positioning framework
const POSITIONING_ANGLES = {
  speed: {
    headline: 'Resultados en minutos, no horas',
    problem: 'Los sistemas lentos cuesta dinero',
    solution: 'Implementación ultra-rápida sin configuración compleja',
    proof: 'Usuarios reportan 80% menos tiempo en tareas'
  },
  simplicity: {
    headline: 'Sin curva de aprendizaje',
    problem: 'Capacitación = Dinero desperdiciado',
    solution: 'Interface intuitiva. Onboarding en 5 minutos.',
    proof: 'Equipos productivos desde el día 1'
  },
  compliance: {
    headline: 'Cumplimiento SAT garantizado',
    problem: 'Un error fiscal = Multas + estrés',
    solution: 'Validación automática contra reglas SAT actualizadas',
    proof: '100% de transacciones compliant. Auditoría gratuita.'
  },
  integration: {
    headline: 'Tu stack existente sigue funcionando',
    problem: 'Cambiar sistemas = Perder productividad',
    solution: 'APIs abiertas. Webhooks. Integraciones nativas.',
    proof: 'Conecta con Stripe, PayPal, tu banco, tu ERP'
  },
  savings: {
    headline: '10+ horas/semana recuperadas',
    problem: 'Automatización manual = Tiempo perdido',
    solution: 'Entiende tu negocio. Automatiza lo que importa.',
    proof: 'Usuario típico: 8-10 horas ahorradas semanales'
  }
};

// Copy patterns that resonate with Spanish LATAM market
const PROVEN_PATTERNS = {
  headlines: [
    '🚀 Automatiza {action}. Recupera {time_unit}.',
    '❌ Deja de {problem}. Empieza a {solution}.',
    '💡 {Key_insight} que nadie te cuenta.',
    '⏱️ Hoy: {benefit}. Mañana: {escalate}.',
    '🎯 Para {segment}: {specific_benefit}.'
  ],
  ctas: [
    'Comienza gratis hoy →',
    'Acceso inmediato. Sin tarjeta requerida.',
    'Prueba 7 días sin costo →',
    'Ver demo en vivo (2 min) →',
    'Descarga la guía GRATUITA →'
  ],
  hooks: [
    'Los contadores que usan {tool} ganan 10h/semana',
    'Esto es lo que {competitor} no quiere que sepas',
    'El SAT cambió las reglas en {month}. Acá está cómo adaptarse.',
    'El 87% de las PyMEs pierden dinero aquí',
    '¿Aún escribes facturas a mano?'
  ]
};

function generateMarketBriefing(product, segment = 'contabilidad') {
  const market = MARKET_DATA[segment] || MARKET_DATA['contabilidad'];
  const briefing = {
    timestamp: new Date().toISOString(),
    product,
    segment,
    market: {
      targetSegments: market.segments,
      painPoints: market.painPoints,
      keywords: market.keywords,
      trendingTopics: market.trendingTopics,
      searchVolume: market.searchVolume
    },
    messaging: {
      topAngles: selectTopAngles(product, 3),
      audienceInsights: generateAudienceInsights(segment, product),
      competitiveAdvantage: identifyDifferentiator(product),
      copyGuide: {
        do: [
          '✅ Cuantificar beneficios: "10h/semana", "85% menos errores"',
          '✅ Resolver pain points específicos: SAT, timbre, deducible',
          '✅ Usar urgencia light: "Hoy", "Este mes", "Antes del cambio SAT"',
          '✅ Proof social: "Contadores de X empresa", "1000+ usuarios"',
          '✅ Local language: Usa "Acá", "Contigo", "Tu negocio"'
        ],
        dont: [
          '❌ Jargon técnico sin traducción',
          '❌ Claims sin números (generales)',
          '❌ Olvidar que es mercado LATAM, no USA',
          '❌ Ignorar que el SAT es miedo #1 en contabilidad',
          '❌ Comparar con competitors sin datos'
        ]
      }
    },
    recommendations: {
      copyAngles: PROVEN_PATTERNS.headlines.slice(0, 3),
      strongCTAs: PROVEN_PATTERNS.ctas.slice(0, 3),
      hooks: selectRelevantHooks(product, segment),
      wordsthatConvert: market.keywords.slice(0, 5)
    },
    channelStrategy: {
      linkedin: 'Thought leadership + ROI proof + Case studies',
      x: 'Hot takes on SAT changes + Automation benefits + Problem/Solution',
      email: 'Deep dives + Educational + ROI calculator',
      facebook: 'Community + Success stories + Local proof',
      telegram: 'Direct communication + Offers + Quick wins',
      discord: 'Community building + Support + Tips'
    }
  };

  return briefing;
}

function selectTopAngles(product, count) {
  const angles = Object.entries(POSITIONING_ANGLES)
    .map(([key, angle]) => ({ key, ...angle }))
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
  
  return angles;
}

function generateAudienceInsights(segment, product) {
  return {
    persona: `${segment === 'contabilidad' ? 'Contador/Contable' : segment === 'administración' ? 'Admin Manager' : 'Sales Manager'} en PyME`,
    motivations: [
      'Ahorrar tiempo en tareas repetitivas',
      'Cumplir con regulaciones (SAT, fiscales)',
      'Mejorar accuracy / reducir errores',
      'Scalear sin contratar más gente',
      'Obtener visibilidad en tiempo real'
    ],
    concerns: [
      'Integración con sistemas existentes',
      'Curva de aprendizaje',
      'Costo vs beneficio',
      'Soporte en español',
      'Seguridad de datos'
    ],
    timeline: 'Decision makers en LATAM suelen evaluar 2-4 semanas antes de comprar'
  };
}

function identifyDifferentiator(product) {
  const differentiators = {
    'Docflow API': 'Automatización completa + CFDI nativo + Sin intermediarios',
    'Script Kit': 'No requiere programación. Listo para usar.',
    'FacturAutentico Cloud': 'Único con timbre ilimitado a precio fijo',
    'FacturAutentica': 'Más barato que competencia sin sacrificar features'
  };
  
  return differentiators[product] || 'Implementación 10x más rápida que la competencia';
}

function selectRelevantHooks(product, segment) {
  const hooks = {
    contabilidad: [
      '¿Cuántas horas pierdes cada mes en papeleo?',
      'El SAT cambió en 2024 — esto es lo que cambia para ti',
      'Los contadores que automatizan ganan 15+ horas/mes'
    ],
    administración: [
      'Tu dashboard ejecutivo debería mostrar la verdad',
      'Deja de tomar decisiones con datos atrasados',
      'La integración manual = dinero en el basura'
    ],
    ventas: [
      '¿Cuántos leads pierdes por falta de follow-up?',
      'El pipeline desorganizado cuesta dinero',
      'Los mejores vendedores usan esto'
    ]
  };
  
  return hooks[segment] || hooks.contabilidad;
}

function analyzeCompetition(product, segment) {
  return {
    product,
    segment,
    analysis: {
      strengths: ['Implementación rápida', 'Soporte en español', 'CFDI compliance'],
      weaknesses: ['Menos features que competencia heavy', 'Menor brand awareness'],
      opportunities: ['Enfoque en SMBs underserved', 'Automatización end-to-end', 'Community building'],
      threats: ['Competencia con VC backing', 'Cambios SAT impredecibles']
    },
    positioningStatement: `${product} es la solución de ${segment} más fácil de implementar en LATAM. Para PyMEs que quieren resultados rápido sin complicaciones.`
  };
}

function generateResearchReport(product, segment) {
  const briefing = generateMarketBriefing(product, segment);
  const competition = analyzeCompetition(product, segment);
  const report = {
    generatedAt: new Date().toISOString(),
    product,
    segment,
    brief: briefing,
    competition,
    actionItems: [
      '1. Creative Agent: usa estos 3 angles como base',
      '2. Weave estos keywords en cada pieza de copy',
      '3. Testing: A/B test estos headlines primero',
      '4. Per channel: usa la estrategia recomendada',
      '5. Proof: incluye números de audience insights'
    ]
  };
  
  return report;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--research')) {
    const product = args.includes('--product') ? args[args.indexOf('--product') + 1] : 'Docflow API';
    const segment = args.includes('--segment') ? args[args.indexOf('--segment') + 1] : 'contabilidad';
    
    console.log('=== MARKET RESEARCHER AGENT ===\n');
    console.log(`Product: ${product}`);
    console.log(`Segment: ${segment}\n`);
    
    const report = generateResearchReport(product, segment);
    
    // Save report
    mkdirSync(RESEARCH_DIR, { recursive: true });
    const reportPath = resolve(RESEARCH_DIR, `${product.toLowerCase().replace(/ /g, '-')}-${segment}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    
    console.log('📊 Market Briefing Generated');
    console.log(`\nTarget Segments: ${report.brief.market.targetSegments.join(', ')}`);
    console.log(`\nPain Points (`);
    report.brief.market.painPoints.slice(0, 3).forEach(pp => console.log(`  • ${pp}`));
    console.log(`  ... +${report.brief.market.painPoints.length - 3} more`);
    
    console.log(`\nTop Copy Angles:`);
    report.brief.messaging.topAngles.forEach((a, i) => {
      console.log(`  ${i+1}. ${a.headline}`);
      console.log(`     → ${a.problem}`);
    });
    
    console.log(`\nWords That Convert:`, report.brief.recommendations.wordsthatConvert.join(' • '));
    
    console.log(`\nProv en Hooks:`);
    report.brief.recommendations.hooks.forEach(h => console.log(`  • ${h}`));
    
    console.log(`\nCompetitive Positioning: ${report.competition.positioningStatement}`);
    console.log(`\n📁 Full report saved to: ${reportPath}`);
    console.log(`\n✅ Ready for Creative Agent to use!`);
    
  } else if (args.includes('--briefing')) {
    const product = args.includes('--product') ? args[args.indexOf('--product') + 1] : 'Docflow API';
    const segment = args.includes('--segment') ? args[args.indexOf('--segment') + 1] : 'contabilidad';
    
    const briefing = generateMarketBriefing(product, segment);
    console.log(JSON.stringify(briefing, null, 2));
    
  } else {
    console.log('Market Researcher Agent — Mano Derecha del Creative');
    console.log('\nUsage:');
    console.log('  --research --product "Docflow API" --segment contabilidad');
    console.log('  --briefing --product "Docflow API" --segment contabilidad');
    console.log('\nSegments available: contabilidad, administración, ventas');
  }
}

export { generateMarketBriefing, generateResearchReport, POSITIONING_ANGLES, PROVEN_PATTERNS };
main();
