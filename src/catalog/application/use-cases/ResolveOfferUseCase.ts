import { CatalogPlan } from '../../domain/entities/CatalogPlan';
import { CatalogProduct } from '../../domain/entities/CatalogProduct';
import { CatalogOfferResolvedEvent } from '../../domain/events/CatalogOfferResolvedEvent';
import { PlanId } from '../../../shared/domain/value-objects/PlanId';
import { ResolveOfferQuery } from '../ports/in/queries';
import { ResolveOfferQueryHandler } from '../ports/in/handlers';
import { CatalogRepositoryPort } from '../ports/out/repositories';
import { CatalogDomainEventPublisherPort } from '../ports/out/external';

export interface ResolveOfferResult {
  readonly product: CatalogProduct;
  readonly plan: CatalogPlan;
}

/** Resolve offer use case. */
export class ResolveOfferUseCase implements ResolveOfferQueryHandler {
  constructor(
    private readonly catalogRepository: CatalogRepositoryPort,
    private readonly eventPublisher: CatalogDomainEventPublisherPort
  ) {}

  public async execute(query: ResolveOfferQuery): Promise<void> {
    const product = await this.catalogRepository.findProductById(query.productId);
    if (!product) {
      throw new Error('Catalog product does not exist.');
    }

    const at = query.at ?? new Date();
    const plan = product.resolvePlan(new PlanId(query.planId), at);

    const event = new CatalogOfferResolvedEvent({
      productId: query.productId,
      planId: plan.planId.value()
    });

    await this.eventPublisher.publish(event);
  }
}
