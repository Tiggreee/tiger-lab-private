import { ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ResolvedCheckoutPrice {
  readonly amount: number;
  readonly currency: string;
  readonly productName: string;
  readonly planName: string;
}

interface PricingPlan {
  readonly productId?: string;
  readonly productName?: string;
  readonly planName?: string;
  readonly price?: number;
  readonly currency?: string;
  readonly status?: string;
}

let cachedPlans: PricingPlan[] | null = null;

function loadPlans(): PricingPlan[] {
  if (cachedPlans) {
    return cachedPlans;
  }
  const pricingPath = resolve('ops/runtime/pricing.json');
  if (!existsSync(pricingPath)) {
    cachedPlans = [];
    return cachedPlans;
  }
  try {
    const parsed = JSON.parse(readFileSync(pricingPath, 'utf8')) as { plans?: PricingPlan[] };
    cachedPlans = Array.isArray(parsed.plans) ? parsed.plans : [];
  } catch {
    cachedPlans = [];
  }
  return cachedPlans;
}

/**
 * Resolve the real published price for a product/plan from ops/runtime/pricing.json.
 * Returns undefined when the product/plan is not present so callers can fall back to defaults.
 */
export function resolveCheckoutPrice(productId: string, planId: string): ResolvedCheckoutPrice | undefined {
  const plans = loadPlans();
  if (plans.length === 0) {
    return undefined;
  }
  const normalizedPlan = planId.trim().toLowerCase();
  const productPlans = plans.filter((plan) => plan.productId === productId && typeof plan.price === 'number');
  if (productPlans.length === 0) {
    return undefined;
  }
  const match =
    productPlans.find((plan) => (plan.planName || '').trim().toLowerCase() === normalizedPlan) || productPlans[0];
  if (typeof match.price !== 'number') {
    return undefined;
  }
  return {
    amount: match.price,
    currency: (match.currency || 'USD').toUpperCase(),
    productName: match.productName || productId,
    planName: match.planName || planId
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render a safe, buyer-facing fallback page when a live checkout session cannot be created
 * (e.g. no payment provider configured in the runtime). Never leaves the buyer on a 404/500.
 */
export function renderCheckoutFallback(
  res: ServerResponse,
  productId: string,
  price: ResolvedCheckoutPrice | undefined
): void {
  const productName = escapeHtml(price?.productName || productId);
  const priceLabel = price ? `${price.currency} $${price.amount}/mo` : 'Contact for pricing';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Checkout — ${productName}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#0b0f14; color:#e6edf3; margin:0; display:flex; min-height:100vh; align-items:center; justify-content:center; }
  .card { max-width:520px; padding:40px; background:#111823; border:1px solid #223; border-radius:16px; box-shadow:0 10px 40px rgba(0,0,0,.4); }
  h1 { margin:0 0 8px; font-size:22px; }
  .price { font-size:18px; color:#6cc; margin:0 0 20px; }
  p { line-height:1.55; color:#aab7c4; }
  a.btn { display:inline-block; margin-top:16px; padding:12px 20px; background:#2563eb; color:#fff; text-decoration:none; border-radius:10px; }
</style>
</head>
<body>
  <div class="card">
    <h1>${productName}</h1>
    <p class="price">${escapeHtml(priceLabel)}</p>
    <p>Estamos activando el pago en línea para este producto. El checkout automático estará disponible en breve.</p>
    <p>Para completar tu compra ahora mismo, escríbenos y te enviamos el enlace de pago seguro.</p>
    <a class="btn" href="mailto:ventas@tigrelabs.com?subject=Compra%20${encodeURIComponent(productId)}">Solicitar enlace de pago</a>
  </div>
</body>
</html>`;
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(html)
  });
  res.end(html);
}
