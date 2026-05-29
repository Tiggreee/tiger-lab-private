import { randomUUID } from 'node:crypto';
import { ProvisionAccountUseCase } from '../../../src/billing/application/use-cases/ProvisionAccountUseCase';
import { ProvisionProductRequest } from '../contracts/requests/provision-product-request';
import { ProvisionProductResponse } from '../contracts/responses/provision-product-response';

export class BillingController {
  constructor(private readonly provisionAccountUseCase: ProvisionAccountUseCase) {}

  public async provisionProduct(request: ProvisionProductRequest): Promise<ProvisionProductResponse> {
    const product = request.product || 'unknown-product';
    const accountId = request.accountId || `acct_${randomUUID().slice(0, 8)}`;
    const paymentId = request.paymentId || `pay_${randomUUID().slice(0, 8)}`;

    await this.provisionAccountUseCase.execute({
      accountId,
      paymentId
    });

    return {
      status: 'ok',
      action: 'provision-product',
      result: {
        accountId,
        userId: request.userId || 'anonymous',
        product,
        apiKeyHint: `${product.slice(0, 4)}_***`,
        dryRun: request.dryRun !== false
      }
    };
  }
}
