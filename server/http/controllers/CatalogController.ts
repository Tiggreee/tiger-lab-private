import { CatalogFileRepository } from '../../../src/catalog/infrastructure/CatalogFileRepository';
import { CatalogQueryRequest } from '../contracts/requests/catalog-query-request';
import { CatalogQueryResponse } from '../contracts/responses/catalog-query-response';

export class CatalogController {
  constructor(private readonly catalogRepository: CatalogFileRepository = new CatalogFileRepository()) {}

  public async query(request: CatalogQueryRequest): Promise<CatalogQueryResponse> {
    switch (request.action) {
      case 'get-product': {
        const result = this.catalogRepository.getProduct(request.productId as string);
        return this.ok(result);
      }
      case 'get-plan': {
        const result = this.catalogRepository.getPlan(request.planId as string);
        return this.ok(result);
      }
      case 'resolve-offer': {
        const at = request.at ? new Date(request.at) : new Date();
        const result = this.catalogRepository.resolveOffer(
          request.productId as string,
          request.planId,
          at
        );
        return this.ok(result);
      }
      case 'is-available-for-channel': {
        const available = this.catalogRepository.isAvailableForChannel(
          request.productId as string,
          request.planId as string,
          request.channel as string
        );

        return this.ok({
          available,
          productId: request.productId,
          planId: request.planId,
          channel: request.channel
        });
      }
      default:
        return this.ok(null);
    }
  }

  private ok(result: unknown): CatalogQueryResponse {
    return {
      status: 'ok',
      action: 'catalog-query',
      result: {
        data: result
      }
    };
  }
}
