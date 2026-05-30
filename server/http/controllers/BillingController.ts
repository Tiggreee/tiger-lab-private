import { randomUUID } from 'node:crypto';
import { RegisterPaymentUseCase } from '../../../src/billing/application/use-cases/RegisterPaymentUseCase';
import { ProvisionAccountUseCase } from '../../../src/billing/application/use-cases/ProvisionAccountUseCase';
import { ProvisionProductRequest } from '../contracts/requests/provision-product-request';
import { ProvisionProductResponse } from '../contracts/responses/provision-product-response';
import { RegisterPaymentRequest } from '../contracts/requests/register-payment-request';
import { RegisterPaymentResponse } from '../contracts/responses/register-payment-response';

export class BillingController {
  constructor(
    private readonly registerPaymentUseCase: RegisterPaymentUseCase,
    private readonly provisionAccountUseCase: ProvisionAccountUseCase
  ) {}

  public async registerPayment(request: RegisterPaymentRequest): Promise<RegisterPaymentResponse> {
    const paymentId = request.paymentId || `pay_${randomUUID().slice(0, 8)}`;
    const customerId = request.customerId || 'customer-demo';
    const productId = request.productId || 'facturautentico-cloud';
    const planId = request.planId || 'starter';
    const amount = request.amount ?? 39;
    const currency = request.currency || 'USD';

    await this.registerPaymentUseCase.execute({
      paymentId,
      customerId,
      productId,
      planId,
      amount,
      currency
    });

    return {
      status: 'ok',
      action: 'register-payment',
      result: {
        paymentId,
        customerId,
        productId,
        planId,
        amount,
        currency,
        dryRun: request.dryRun !== false
      }
    };
  }

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
