import { randomUUID } from 'node:crypto';
import { CreateProductUseCase } from '../../../src/product/application/use-cases/CreateProductUseCase';
import { GenerateProductRequest } from '../contracts/requests/generate-product-request';
import { GenerateProductResponse } from '../contracts/responses/generate-product-response';

export class ProductController {
  constructor(private readonly createProductUseCase: CreateProductUseCase) {}

  public async generateProduct(request: GenerateProductRequest): Promise<GenerateProductResponse> {
    const repo = request.repo || 'unknown-repo';
    const type = request.type || 'saas';
    const productId = request.productId || `${repo}-${type}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const name = request.name || repo;

    await this.createProductUseCase.execute({ productId, name });

    return {
      status: 'ok',
      action: 'generate-product',
      result: {
        productId,
        version: '0.1.0',
        artifactPath: `ops/releases/${productId || randomUUID()}.zip`,
        dryRun: request.dryRun !== false
      }
    };
  }
}
