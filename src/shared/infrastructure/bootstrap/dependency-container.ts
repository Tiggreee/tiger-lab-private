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
  private readonly assets = new Map<string, ContentAsset>();
  private readonly publications = new Map<string, Publication>();

  public async saveAsset(asset: ContentAsset): Promise<void> {
    this.assets.set(asset.assetId, asset);
  }

  public async savePublication(publication: Publication): Promise<void> {
    this.publications.set(publication.publicationId, publication);
  }

  public async findAssetById(assetId: string): Promise<ContentAsset | null> {
    return this.assets.get(assetId) || null;
  }
}

class InMemoryLeadRepository implements LeadRepositoryPort {
  private readonly leads = new Map<string, Lead>();
  private readonly scores = new Map<string, LeadScoreEntity>();

  public async saveLead(lead: Lead): Promise<void> {
    this.leads.set(lead.leadId.value(), lead);
  }

  public async saveLeadScore(leadScore: LeadScoreEntity): Promise<void> {
    this.scores.set(leadScore.leadId.value(), leadScore);
  }

  public async findLeadById(leadId: string): Promise<Lead | null> {
    const lead = this.leads.get(leadId);
    if (lead) {
      return lead;
    }

    const fallback = new Lead(new LeadId(leadId), 'cli');
    this.leads.set(leadId, fallback);
    return fallback;
  }
}

class InMemoryBillingRepository implements BillingRepositoryPort {
  private readonly payments = new Map<string, Payment>();
  private readonly accounts = new Map<string, ProvisionedAccount>();

  public async savePayment(payment: Payment): Promise<void> {
    this.payments.set(payment.paymentId, payment);
  }

  public async saveProvisionedAccount(account: ProvisionedAccount): Promise<void> {
    this.accounts.set(account.accountId, account);
  }

  public async findPaymentById(paymentId: string): Promise<Payment | null> {
    const payment = this.payments.get(paymentId);
    if (payment) {
      return payment;
    }

    const fallback = new Payment(
      paymentId,
      'cli-customer',
      new ProductId('facturautentico-cloud'),
      new PlanId('starter'),
      new Money(0, new Currency('USD'))
    );
    fallback.markSucceeded();
    this.payments.set(paymentId, fallback);
    return fallback;
  }

  public async findProvisionedAccountById(accountId: string): Promise<ProvisionedAccount | null> {
    return this.accounts.get(accountId) || null;
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
  public async confirmPayment(): Promise<void> {
    return Promise.resolve();
  }
}

class NoopEntitlementPort implements EntitlementPort {
  public async grantEntitlements(): Promise<void> {
    return Promise.resolve();
  }
}

class InMemoryApiKeyPort implements ApiKeyPort {
  public async createApiKey(accountId: string): Promise<string> {
    return `${accountId}_key`;
  }
}

class NoopContentChannelPublisherPort implements ContentChannelPublisherPort {
  public async publish(): Promise<void> {
    return Promise.resolve();
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
