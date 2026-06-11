export interface RegisterPaymentRequest {
  readonly paymentId?: string;
  readonly customerId?: string;
  readonly productId?: string;
  readonly planId?: string;
  readonly amount?: number;
  readonly currency?: string;
  readonly buyerEmail?: string;
  readonly sellerEmail?: string;
  readonly accountantEmail?: string;
  readonly dryRun?: boolean;
}
