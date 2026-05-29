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
import { ContentRepositoryPort } from '../../src/content/application/ports/out/repositories';
import { ContentChannelPublisherPort, ContentDomainEventPublisherPort } from '../../src/content/application/ports/out/external';
import { ContentAsset } from '../../src/content/domain/entities/ContentAsset';
import { Publication } from '../../src/content/domain/entities/Publication';
import { CaptureLeadUseCase } from '../../src/lead/application/use-cases/CaptureLeadUseCase';
import { ScoreLeadUseCase } from '../../src/lead/application/use-cases/ScoreLeadUseCase';
import { LeadRepositoryPort } from '../../src/lead/application/ports/out/repositories';
import { LeadDomainEventPublisherPort } from '../../src/lead/application/ports/out/external';
import { Lead } from '../../src/lead/domain/entities/Lead';
import { LeadScore } from '../../src/lead/domain/entities/LeadScore';
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
import { BillingController } from '../http/controllers/BillingController';
import { BotController } from '../http/controllers/BotController';
import { ContentController } from '../http/controllers/ContentController';
import { HealthController } from '../http/controllers/HealthController';
import { ProductController } from '../http/controllers/ProductController';

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
  private readonly scores = new Map<string, LeadScore>();

  public async saveLead(lead: Lead): Promise<void> {
    this.leads.set(lead.leadId.value(), lead);
  }

  public async saveLeadScore(leadScore: LeadScore): Promise<void> {
    this.scores.set(leadScore.leadId.value(), leadScore);
  }

  public async findLeadById(leadId: string): Promise<Lead | null> {
    const lead = this.leads.get(leadId);
    if (lead) {
      return lead;
    }

    const placeholder = new Lead(new LeadId(leadId), 'bot');
    this.leads.set(leadId, placeholder);
    return placeholder;
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
      'anonymous',
      new ProductId('unknown-product'),
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

export interface ServerDependencyContainer {
  readonly healthController: HealthController;
  readonly productController: ProductController;
  readonly contentController: ContentController;
  readonly billingController: BillingController;
  readonly botController: BotController;
}

export function createServerDependencyContainer(): ServerDependencyContainer {
  const eventPublisher = new NoopEventPublisher();

  const productRepository = new InMemoryProductRepository();
  const contentRepository = new InMemoryContentRepository();
  const leadRepository = new InMemoryLeadRepository();
  const billingRepository = new InMemoryBillingRepository();
  const catalogRepository = new InMemoryCatalogRepository();

  const createProductUseCase = new CreateProductUseCase(productRepository, eventPublisher);
  const generateContentUseCase = new GenerateContentUseCase(contentRepository, eventPublisher);

  const captureLeadUseCase = new CaptureLeadUseCase(leadRepository, eventPublisher);
  const scoreLeadUseCase = new ScoreLeadUseCase(leadRepository, eventPublisher);
  void captureLeadUseCase;

  const resolveOfferUseCase = new ResolveOfferUseCase(catalogRepository, eventPublisher);

  const registerPaymentUseCase = new RegisterPaymentUseCase(
    billingRepository,
    new NoopPaymentGateway(),
    eventPublisher
  );
  void registerPaymentUseCase;

  const provisionAccountUseCase = new ProvisionAccountUseCase(
    billingRepository,
    new NoopEntitlementPort(),
    new InMemoryApiKeyPort(),
    eventPublisher
  );

  return {
    healthController: new HealthController(),
    productController: new ProductController(createProductUseCase),
    contentController: new ContentController(generateContentUseCase),
    billingController: new BillingController(provisionAccountUseCase),
    botController: new BotController(resolveOfferUseCase, scoreLeadUseCase)
  };
}
