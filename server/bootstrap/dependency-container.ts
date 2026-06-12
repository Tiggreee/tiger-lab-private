import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RegisterPaymentUseCase } from '../../src/billing/application/use-cases/RegisterPaymentUseCase';
import { ProvisionAccountUseCase } from '../../src/billing/application/use-cases/ProvisionAccountUseCase';
import { BillingRepositoryPort } from '../../src/billing/application/ports/out/repositories';
import {
  ApiKeyPort,
  BillingDomainEventPublisherPort,
  EntitlementPort,
  PaymentGatewayPort
} from '../../src/billing/application/ports/out/external';
import { Payment } from '../../src/billing/domain/entities/Payment';
import { ProvisionedAccount } from '../../src/billing/domain/entities/ProvisionedAccount';
import { ResolveOfferUseCase } from '../../src/catalog/application/use-cases/ResolveOfferUseCase';
import { CatalogRepositoryPort } from '../../src/catalog/application/ports/out/repositories';
import { CatalogDomainEventPublisherPort } from '../../src/catalog/application/ports/out/external';
import { CatalogPlan } from '../../src/catalog/domain/entities/CatalogPlan';
import { CatalogProduct } from '../../src/catalog/domain/entities/CatalogProduct';
import { GenerateContentUseCase } from '../../src/content/application/use-cases/GenerateContentUseCase';
import { PublishContentUseCase } from '../../src/content/application/use-cases/PublishContentUseCase';
import { ContentRepositoryPort } from '../../src/content/application/ports/out/repositories';
import { ContentChannelPublisherPort, ContentDomainEventPublisherPort } from '../../src/content/application/ports/out/external';
import { ContentAsset } from '../../src/content/domain/entities/ContentAsset';
import { Publication } from '../../src/content/domain/entities/Publication';
import { CaptureLeadUseCase } from '../../src/lead/application/use-cases/CaptureLeadUseCase';
import { ScoreLeadUseCase } from '../../src/lead/application/use-cases/ScoreLeadUseCase';
import { LeadRepositoryPort } from '../../src/lead/application/ports/out/repositories';
import { LeadDomainEventPublisherPort } from '../../src/lead/application/ports/out/external';
import { Lead } from '../../src/lead/domain/entities/Lead';
import { LeadScore as LeadScoreEntity } from '../../src/lead/domain/entities/LeadScore';
import { LeadScore as LeadScoreValue } from '../../src/shared/domain/value-objects/LeadScore';
import { CreateProductUseCase } from '../../src/product/application/use-cases/CreateProductUseCase';
import { ProductRepositoryPort } from '../../src/product/application/ports/out/repositories';
import { ProductDomainEventPublisherPort } from '../../src/product/application/ports/out/external';
import { Product } from '../../src/product/domain/entities/Product';
import { ProductRelease } from '../../src/product/domain/entities/ProductRelease';
import { Currency } from '../../src/shared/domain/value-objects/Currency';
import { LeadId } from '../../src/shared/domain/value-objects/LeadId';
import { Money } from '../../src/shared/domain/value-objects/Money';
import { PlanId } from '../../src/shared/domain/value-objects/PlanId';
import { ProductId } from '../../src/shared/domain/value-objects/ProductId';
import { Version } from '../../src/shared/domain/value-objects/Version';
import { readRuntimeState, updateRuntimeState } from '../../src/shared/infrastructure/persistence/runtime-state';
import { BillingController } from '../http/controllers/BillingController';
import { BotController } from '../http/controllers/BotController';
import { ContentController } from '../http/controllers/ContentController';
import { HealthController } from '../http/controllers/HealthController';
import { LinkedInIntegrationController } from '../http/controllers/LinkedInIntegrationController';
import { ProductController } from '../http/controllers/ProductController';
import { PayPalPaymentService } from './paypal-payment-service';
import { FacturamaResendInvoiceAutomationService } from './invoice-automation-service';
import { LinkedInOAuthService } from './linkedin-oauth-service';

class InMemoryProductRepository implements ProductRepositoryPort {
  private readonly products = new Map<string, Product>();
  private readonly releases = new Map<string, ProductRelease>();

  public async saveProduct(product: Product): Promise<void> {
    this.products.set(product.productId.value(), product);
  }

  public async saveProductRelease(release: ProductRelease): Promise<void> {
    this.releases.set(`${release.productId.value()}-${release.version.value()}`, release);
  }

  public async findProductById(productId: string): Promise<Product | null> {
    return this.products.get(productId) || null;
  }
}

class InMemoryContentRepository implements ContentRepositoryPort {
  public async saveAsset(asset: ContentAsset): Promise<void> {
    await updateRuntimeState((state) => ({
      ...state,
      assets: {
        ...state.assets,
        [asset.assetId]: {
          assetId: asset.assetId,
          productId: asset.productId.value(),
          body: asset.body,
          generatedAt: asset.generatedAt.toISOString()
        }
      }
    }));
  }

  public async savePublication(publication: Publication): Promise<void> {
    await updateRuntimeState((state) => ({
      ...state,
      publications: {
        ...state.publications,
        [publication.publicationId]: {
          publicationId: publication.publicationId,
          assetId: publication.assetId,
          channel: publication.channel,
          publishedAt: publication.publishedAt.toISOString()
        }
      }
    }));
  }

  public async findAssetById(assetId: string): Promise<ContentAsset | null> {
    const state = await readRuntimeState();
    const asset = state.assets[assetId];
    if (!asset) {
      return null;
    }

    return new ContentAsset(
      asset.assetId,
      new ProductId(asset.productId),
      asset.body,
      new Date(asset.generatedAt)
    );
  }
}

class InMemoryLeadRepository implements LeadRepositoryPort {
  public async saveLead(lead: Lead): Promise<void> {
    await updateRuntimeState((state) => ({
      ...state,
      leads: {
        ...state.leads,
        [lead.leadId.value()]: {
          leadId: lead.leadId.value(),
          source: lead.source,
          createdAt: lead.createdAt.toISOString(),
          score: lead.getScore()?.value
        }
      }
    }));
  }

  public async saveLeadScore(leadScore: LeadScoreEntity): Promise<void> {
    await updateRuntimeState((state) => ({
      ...state,
      leadScores: {
        ...state.leadScores,
        [leadScore.leadId.value()]: {
          leadId: leadScore.leadId.value(),
          value: leadScore.value.value,
          scoredAt: leadScore.scoredAt.toISOString()
        }
      }
    }));
  }

  public async findLeadById(leadId: string): Promise<Lead | null> {
    const state = await readRuntimeState();
    const item = state.leads[leadId];
    if (!item) {
      return null;
    }

    const lead = new Lead(new LeadId(item.leadId), item.source, new Date(item.createdAt));
    if (typeof item.score === 'number') {
      lead.applyScore(new LeadScoreValue(item.score));
    }

    return lead;
  }
}

class InMemoryBillingRepository implements BillingRepositoryPort {
  public async savePayment(payment: Payment): Promise<void> {
    await updateRuntimeState((state) => ({
      ...state,
      payments: {
        ...state.payments,
        [payment.paymentId]: {
          paymentId: payment.paymentId,
          customerId: payment.customerId,
          productId: payment.productId.value(),
          planId: payment.planId.value(),
          amount: payment.amount.amount,
          currency: payment.amount.currency.value(),
          createdAt: payment.createdAt.toISOString(),
          status: payment.isSucceeded() ? 'succeeded' : 'pending'
        }
      }
    }));
  }

  public async saveProvisionedAccount(account: ProvisionedAccount): Promise<void> {
    await updateRuntimeState((state) => ({
      ...state,
      accounts: {
        ...state.accounts,
        [account.accountId]: {
          accountId: account.accountId,
          customerId: account.customerId,
          productId: account.productId.value(),
          planId: account.planId.value(),
          provisionedAt: account.provisionedAt.toISOString()
        }
      }
    }));
  }

  public async findPaymentById(paymentId: string): Promise<Payment | null> {
    const state = await readRuntimeState();
    const item = state.payments[paymentId];
    if (!item) {
      return null;
    }

    const payment = new Payment(
      item.paymentId,
      item.customerId,
      new ProductId(item.productId),
      new PlanId(item.planId),
      new Money(item.amount, new Currency(item.currency)),
      new Date(item.createdAt)
    );

    if (item.status === 'succeeded') {
      payment.markSucceeded();
    }

    return payment;
  }

  public async findProvisionedAccountById(accountId: string): Promise<ProvisionedAccount | null> {
    const state = await readRuntimeState();
    const item = state.accounts[accountId];
    if (!item) {
      return null;
    }

    return new ProvisionedAccount(
      item.accountId,
      item.customerId,
      new ProductId(item.productId),
      new PlanId(item.planId),
      new Date(item.provisionedAt)
    );
  }
}

class InMemoryCatalogRepository implements CatalogRepositoryPort {
  private readonly products: Map<string, CatalogProduct>;

  constructor() {
    this.products = this.loadProducts();
  }

  private loadProducts(): Map<string, CatalogProduct> {
    const defaults = new Map<string, CatalogProduct>();

    const fallbackPlan = new CatalogPlan(
      new PlanId('starter'),
      'Starter',
      new Money(39, new Currency('USD')),
      new Date('2026-01-01T00:00:00.000Z')
    );

    defaults.set(
      'facturautentico-cloud',
      new CatalogProduct(new ProductId('facturautentico-cloud'), 'FacturAutentico Cloud', [fallbackPlan])
    );

    try {
      const filePath = path.resolve('ops/catalog/products.json');
      const raw = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw) as {
        products?: Array<{
          id?: string;
          name?: string;
          planIds?: string[];
        }>;
      };

      const rows = Array.isArray(parsed.products) ? parsed.products : [];
      if (rows.length === 0) {
        return defaults;
      }

      const map = new Map<string, CatalogProduct>();
      for (const row of rows) {
        const productId = String(row.id || '').trim();
        if (!productId) {
          continue;
        }

        const plans = this.buildPlans(row.planIds || ['starter']);
        map.set(
          productId,
          new CatalogProduct(
            new ProductId(productId),
            String(row.name || productId),
            plans.length > 0 ? plans : [fallbackPlan]
          )
        );
      }

      return map.size > 0 ? map : defaults;
    } catch {
      return defaults;
    }
  }

  private buildPlans(planIds: string[]): CatalogPlan[] {
    const seen = new Set<string>();
    const priceByPlan: Record<string, number> = {
      starter: 39,
      pro: 99,
      growth: 149,
      enterprise: 299
    };

    return planIds
      .map((value) => String(value || '').trim().toLowerCase())
      .filter((planId) => {
        if (!planId || seen.has(planId)) {
          return false;
        }

        seen.add(planId);
        return true;
      })
      .map((planId) => {
        const amount = priceByPlan[planId] ?? 59;
        const planName = `${planId.charAt(0).toUpperCase()}${planId.slice(1)}`;
        return new CatalogPlan(
          new PlanId(planId),
          planName,
          new Money(amount, new Currency('USD')),
          new Date('2026-01-01T00:00:00.000Z')
        );
      });
  }

  public async saveCatalogProduct(): Promise<void> {
    return Promise.resolve();
  }

  public async findProductById(productId: string): Promise<CatalogProduct | null> {
    return this.products.get(productId) || null;
  }

  public async findPlanById(productId: string, planId: string): Promise<CatalogPlan | null> {
    const product = this.products.get(productId);
    if (!product) {
      return null;
    }

    try {
      return product.resolvePlan(new PlanId(planId), new Date());
    } catch {
      return null;
    }
  }
}

class NoopEventPublisher
  implements
    ProductDomainEventPublisherPort,
    ContentDomainEventPublisherPort,
    LeadDomainEventPublisherPort,
    BillingDomainEventPublisherPort,
    CatalogDomainEventPublisherPort
{
  public async publish(): Promise<void> {
    return Promise.resolve();
  }
}

class NoopPaymentGateway implements PaymentGatewayPort {
  public async confirmPayment(paymentId: string): Promise<void> {
    const endpoint = process.env.PAYMENT_GATEWAY_CONFIRM_URL;
    if (!endpoint) {
      throw new Error('PAYMENT_GATEWAY_CONFIRM_URL is required for payment confirmation.');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.PAYMENT_GATEWAY_TOKEN
          ? { Authorization: `Bearer ${process.env.PAYMENT_GATEWAY_TOKEN}` }
          : {})
      },
      body: JSON.stringify({ paymentId })
    });

    if (!response.ok) {
      throw new Error(`Payment gateway failed with status ${response.status}.`);
    }
  }
}

class NoopEntitlementPort implements EntitlementPort {
  public async grantEntitlements(accountId: string, productId: string, planId: string): Promise<void> {
    const endpoint = process.env.ENTITLEMENT_API_URL;
    if (!endpoint) {
      throw new Error('ENTITLEMENT_API_URL is required for entitlement grants.');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ENTITLEMENT_API_TOKEN
          ? { Authorization: `Bearer ${process.env.ENTITLEMENT_API_TOKEN}` }
          : {})
      },
      body: JSON.stringify({ accountId, productId, planId })
    });

    if (!response.ok) {
      throw new Error(`Entitlement API failed with status ${response.status}.`);
    }
  }
}

class InMemoryApiKeyPort implements ApiKeyPort {
  public async createApiKey(accountId: string): Promise<string> {
    return `${accountId}_key`;
  }
}

class NoopContentChannelPublisherPort implements ContentChannelPublisherPort {
  public async publish(channel: string, body: string): Promise<void> {
    const endpoint = process.env.CONTENT_PUBLISHER_API_URL;
    if (!endpoint) {
      throw new Error('CONTENT_PUBLISHER_API_URL is required for content publication.');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CONTENT_PUBLISHER_API_TOKEN
          ? { Authorization: `Bearer ${process.env.CONTENT_PUBLISHER_API_TOKEN}` }
          : {})
      },
      body: JSON.stringify({ channel, body })
    });

    if (!response.ok) {
      throw new Error(`Content publisher API failed with status ${response.status}.`);
    }
  }
}

export interface ServerDependencyContainer {
  readonly healthController: HealthController;
  readonly linkedInIntegrationController: LinkedInIntegrationController;
  readonly productController: ProductController;
  readonly contentController: ContentController;
  readonly billingController: BillingController;
  readonly botController: BotController;
}

function assertRequiredEnv(keys: readonly string[]): void {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function validateServerEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  assertRequiredEnv([
    'PAYMENT_GATEWAY_CONFIRM_URL',
    'ENTITLEMENT_API_URL',
    'CONTENT_PUBLISHER_API_URL',
    'API_KEY_REGISTRY'
  ]);

  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (paypalClientId || paypalClientSecret) {
    assertRequiredEnv([
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'PAYPAL_WEBHOOK_ID',
      'PAYPAL_RETURN_URL',
      'PAYPAL_CANCEL_URL'
    ]);

    if (
      String(process.env.PAYPAL_RETURN_URL).includes('example.com') ||
      String(process.env.PAYPAL_CANCEL_URL).includes('example.com')
    ) {
      throw new Error('PAYPAL_RETURN_URL and PAYPAL_CANCEL_URL cannot contain example.com in production.');
    }
  }
}

export function createServerDependencyContainer(): ServerDependencyContainer {
  validateServerEnvironment();
  const eventPublisher = new NoopEventPublisher();

  const productRepository = new InMemoryProductRepository();
  const contentRepository = new InMemoryContentRepository();
  const leadRepository = new InMemoryLeadRepository();
  const billingRepository = new InMemoryBillingRepository();
  const catalogRepository = new InMemoryCatalogRepository();

  const createProductUseCase = new CreateProductUseCase(productRepository, eventPublisher);
  const generateContentUseCase = new GenerateContentUseCase(contentRepository, eventPublisher);
  const publishContentUseCase = new PublishContentUseCase(
    contentRepository,
    new NoopContentChannelPublisherPort(),
    eventPublisher
  );

  const captureLeadUseCase = new CaptureLeadUseCase(leadRepository, eventPublisher);
  const scoreLeadUseCase = new ScoreLeadUseCase(leadRepository, eventPublisher);
  const resolveOfferUseCase = new ResolveOfferUseCase(catalogRepository, eventPublisher);

  const payPalClientId = process.env.PAYPAL_CLIENT_ID;
  const payPalClientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const payPalLiveMode = process.env.PAYPAL_MODE === 'live';

  const payPalService =
    payPalClientId && payPalClientSecret
      ? new PayPalPaymentService(payPalClientId, payPalClientSecret, payPalLiveMode)
      : undefined;

  const paymentGateway: PaymentGatewayPort = payPalService ?? new NoopPaymentGateway();
  const invoiceAutomationService = new FacturamaResendInvoiceAutomationService();

  const registerPaymentUseCase = new RegisterPaymentUseCase(
    billingRepository,
    paymentGateway,
    eventPublisher
  );

  const provisionAccountUseCase = new ProvisionAccountUseCase(
    billingRepository,
    new NoopEntitlementPort(),
    new InMemoryApiKeyPort(),
    eventPublisher
  );

  return {
    healthController: new HealthController(),
    linkedInIntegrationController: new LinkedInIntegrationController(new LinkedInOAuthService()),
    productController: new ProductController(createProductUseCase),
    contentController: new ContentController(generateContentUseCase, publishContentUseCase),
    billingController: new BillingController(
      registerPaymentUseCase,
      provisionAccountUseCase,
      payPalService,
      invoiceAutomationService
    ),
    botController: new BotController(resolveOfferUseCase, captureLeadUseCase, scoreLeadUseCase)
  };
}
