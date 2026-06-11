import { Product } from '../../domain/entities/Product';
import { ProductCreatedEvent } from '../../domain/events/ProductCreatedEvent';
import { ProductId } from '../../../shared/domain/value-objects/ProductId';
import { CreateProductCommand } from '../ports/in/commands';
import { CreateProductCommandHandler } from '../ports/in/handlers';
import { ProductRepositoryPort } from '../ports/out/repositories';
import { ProductDomainEventPublisherPort } from '../ports/out/external';

/** Create product use case. */
export class CreateProductUseCase implements CreateProductCommandHandler {
  constructor(
    private readonly productRepository: ProductRepositoryPort,
    private readonly eventPublisher: ProductDomainEventPublisherPort
  ) {}

  public async execute(command: CreateProductCommand): Promise<void> {
    const product = new Product(new ProductId(command.productId), command.name);
    await this.productRepository.saveProduct(product);

    const event = new ProductCreatedEvent({
      productId: product.productId.value(),
      name: product.name
    });

    await this.eventPublisher.publish(event);
  }
}
