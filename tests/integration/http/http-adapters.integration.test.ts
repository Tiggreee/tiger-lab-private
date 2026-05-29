import { describe, expect, it } from 'vitest';
import { CatalogController } from '../../../server/http/controllers/CatalogController';
import { ProductController } from '../../../server/http/controllers/ProductController';
import { validateGenerateProductRequest } from '../../../server/http/contracts/validators/validate-generate-product-request';
import { CreateProductUseCase } from '../../../src/product/application/use-cases/CreateProductUseCase';

class InMemoryProductRepository {
  public async saveProduct(): Promise<void> {}
  public async saveProductRelease(): Promise<void> {}
  public async findProductById(): Promise<null> {
    return null;
  }
}

class NoopProductPublisher {
  public async publish(): Promise<void> {}
}

describe('HTTP adapters integration (without real server)', () => {
  it('validates and handles generate-product request through controller', async () => {
    const request = validateGenerateProductRequest({
      repo: 'FacturAutentico',
      type: 'saas',
      dryRun: true
    });

    const useCase = new CreateProductUseCase(
      new InMemoryProductRepository() as never,
      new NoopProductPublisher() as never
    );

    const controller = new ProductController(useCase);
    const response = await controller.generateProduct(request);

    expect(response.status).toBe('ok');
    expect(response.action).toBe('generate-product');
    expect(response.result.productId).toContain('facturautentico');
  });

  it('queries catalog adapter without binding HTTP server', async () => {
    const controller = new CatalogController();
    const response = await controller.query({
      action: 'resolve-offer',
      productId: 'facturautentico-cloud',
      planId: 'starter'
    });

    expect(response.status).toBe('ok');
    expect(response.action).toBe('catalog-query');
    expect(response.result).toHaveProperty('data');
  });
});
