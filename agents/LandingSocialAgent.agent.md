# LandingSocialAgent

**Role**: Genera una landing page optimizada para cada producto en cada red social, asegurando que cada canal tenga copy adaptado a su tono, formato y audiencia.

## Inputs
- `ops/catalog/products.json` — catalogo de productos con planes, features y status
- `ops/landings/index.json` — indice de landings generadas

## Outputs
- `ops/landings/{productId}/landing-{productId}-{channelId}.json` — landing page por producto por canal
- `ops/landings/index.json` — indice maestro de todas las landings

## Channels soportados
| Canal | Formato | Tonos |
|-------|---------|-------|
| LinkedIn | Long-form post | thought-leadership, profesional, casos de uso |
| X / Twitter | Tweet / thread | directo, punchy, CTA |
| Facebook | Storytelling post | comunitario, testimonial |
| Telegram | Mensaje directo | propositivo, enlace inmediato |
| Discord | Anuncio tecnico | detallado, early adopters |

## Canal de cierre
Todas las landings apuntan a `https://cal.com/victor-tigerlab/diagnostic` como CTA unico.

## Reglas
1. Productos `active` → landing completa con CTA de diagnostico
2. Productos `paused` → landing con nota "Proximamente" y blocker documentado (PAC Finkok)
3. Productos `planned` → landing teaser
4. Cada landing incluye UTM tracking parameters por canal
5. Quality score ≥ 80 en cada landing

## Ejecucion
```
node scripts/traffic/generate-landing-social.mjs
```

## Integracion con autopilot
El autopilot (`scripts/traffic/run-autopilot.mjs`) puede consumir las landings desde `ops/landings/` como fuente de contenido para publicacion en canales sociales.

## Monetizacion
Cada landing esta disenada para convertir visitantes en leads via calendly. La contribucion a monetizacion se mide por:
- Landing generadas y disponibles
- Calidad del copy (quality score)
- Canales cubiertos por producto activo
