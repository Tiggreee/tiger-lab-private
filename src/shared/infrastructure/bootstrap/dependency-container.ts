import { RegisterPaymentUseCase } from '../../../billing/application/use-cases/RegisterPaymentUseCase';
import { ProvisionAccountUseCase } from '../../../billing/application/use-cases/ProvisionAccountUseCase';
import { BillingRepositoryPort } from '../../../billing/application/ports/out/repositories';
import {
  ApiKeyPort,
  BillingDomainEventPublisherPort,
  EntitlementPort,
  PaymentGatewayPort
} from '../../../billing/application/ports/out/external';
import { RegisterPaymentCommandHandler, ProvisionAccountCommandHandler } from '../../../billing/application/ports/in/handlers';
import { Payment } from '../../../billing/domain/entities/Payment';
import { ProvisionedAccount } from '../../../billing/domain/entities/ProvisionedAccount';
import { ResolveOfferUseCase } from '../../../catalog/application/use-cases/ResolveOfferUseCase';
import { CatalogRepositoryPort } from '../../../catalog/application/ports/out/repositories';
import { CatalogDomainEventPublisherPort } from '../../../catalog/application/ports/out/external';
import { ResolveOfferQueryHandler } from '../../../catalog/application/ports/in/handlers';
import { CatalogPlan } from '../../../catalog/domain/entities/CatalogPlan';
import { CatalogProduct } from '../../../catalog/domain/entities/CatalogProduct';
import { GenerateContentUseCase } from '../../../content/application/use-cases/GenerateContentUseCase';
import { PublishContentUseCase } from '../../../content/application/use-cases/PublishContentUseCase';
import { ContentRepositoryPort } from '../../../content/application/ports/out/repositories';
import {
  ContentChannelPublisherPort,
  ContentDomainEventPublisherPort
} from '../../../content/application/ports/out/external';
import { GenerateContentCommandHandler, PublishContentCommandHandler } from '../../../content/application/ports/in/handlers';
import { ContentAsset } from '../../../content/domain/entities/ContentAsset';
import { Publication } from '../../../content/domain/entities/Publication';
import { CaptureLeadUseCase } from '../../../lead/application/use-cases/CaptureLeadUseCase';
import { ScoreLeadUseCase } from '../../../lead/application/use-cases/ScoreLeadUseCase';
import { LeadRepositoryPort } from '../../../lead/application/ports/out/repositories';
import { LeadDomainEventPublisherPort } from '../../../lead/application/ports/out/external';
import { CaptureLeadCommandHandler, ScoreLeadCommandHandler } from '../../../lead/application/ports/in/handlers';
import { Lead } from '../../../lead/domain/entities/Lead';
import { LeadScore as LeadScoreEntity } from '../../../lead/domain/entities/LeadScore';
import { CreateProductUseCase } from '../../../product/application/use-cases/CreateProductUseCase';
import { ProductRepositoryPort } from '../../../product/application/ports/out/repositories';
import { ProductDomainEventPublisherPort } from '../../../product/application/ports/out/external';
import { CreateProductCommandHandler } from '../../../product/application/ports/in/handlers';
import { Product } from '../../../product/domain/entities/Product';
import { ProductRelease } from '../../../product/domain/entities/ProductRelease';
import { Currency } from '../../domain/value-objects/Currency';
import { LeadId } from '../../domain/value-objects/LeadId';
import { Money } from '../../domain/value-objects/Money';
import { PlanId } from '../../domain/value-objects/PlanId';
import { ProductId } from '../../domain/value-objects/ProductId';
import { readRuntimeState, updateRuntimeState } from '../persistence/runtime-state';

/**
 * Shared dependency container for scripts and runtime adapters.
 * Uses in-memory implementations to keep wiring lightweight.
 */
export interface DependencyContainer {
  readonly initialized: boolean;
  readonly createProductHandler: CreateProductCommandHandler;
  readonly generateContentHandler: GenerateContentCommandHandler;
  readonly publishContentHandler: PublishContentCommandHandler;
  readonly captureLeadHandler: CaptureLeadCommandHandler;
  readonly scoreLeadHandler: ScoreLeadCommandHandler;
  readonly resolveOfferHandler: ResolveOfferQueryHandler;
  readonly registerPaymentHandler: RegisterPaymentCommandHandler;
  readonly provisionAccountHandler: ProvisionAccountCommandHandler;
}

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
      lead.applyScore(new LeadScore(item.score));
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
  private readonly product: CatalogProduct;

  constructor() {
    const defaultPlan = new CatalogPlan(
      new PlanId('starter'),
      'Starter',
      new Money(39, new Currency('USD')),
      new Date('2026-01-01T00:00:00.000Z')
    );

    this.product = new CatalogProduct(new ProductId('facturautentico-cloud'), 'FacturAutentico Cloud', [defaultPlan]);
  }

  public async saveCatalogProduct(): Promise<void> {
    return Promise.resolve();
  }

  public async findProductById(productId: string): Promise<CatalogProduct | null> {
    if (this.product.productId.value() === productId) {
      return this.product;
    }

    return null;
  }

  public async findPlanById(productId: string, planId: string): Promise<CatalogPlan | null> {
    if (productId !== this.product.productId.value()) {
      return null;
    }

    try {
      return this.product.resolvePlan(new PlanId(planId), new Date());
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

export function createDependencyContainer(): DependencyContainer {
  const eventPublisher = new NoopEventPublisher();

  const productRepository = new InMemoryProductRepository();
  const contentRepository = new InMemoryContentRepository();
  const leadRepository = new InMemoryLeadRepository();
  const billingRepository = new InMemoryBillingRepository();
  const catalogRepository = new InMemoryCatalogRepository();

  const createProductHandler = new CreateProductUseCase(productRepository, eventPublisher);
  const generateContentHandler = new GenerateContentUseCase(contentRepository, eventPublisher);
  const publishContentHandler = new PublishContentUseCase(
    contentRepository,
    new NoopContentChannelPublisherPort(),
    eventPublisher
  );
  const captureLeadHandler = new CaptureLeadUseCase(leadRepository, eventPublisher);
  const scoreLeadHandler = new ScoreLeadUseCase(leadRepository, eventPublisher);
  const resolveOfferHandler = new ResolveOfferUseCase(catalogRepository, eventPublisher);
  const registerPaymentHandler = new RegisterPaymentUseCase(
    billingRepository,
    new NoopPaymentGateway(),
    eventPublisher
  );
  const provisionAccountHandler = new ProvisionAccountUseCase(
    billingRepository,
    new NoopEntitlementPort(),
    new InMemoryApiKeyPort(),
    eventPublisher
  );

  return {
    initialized: true,
    createProductHandler,
    generateContentHandler,
    publishContentHandler,
    captureLeadHandler,
    scoreLeadHandler,
    resolveOfferHandler,
    registerPaymentHandler,
    provisionAccountHandler
  };
}
