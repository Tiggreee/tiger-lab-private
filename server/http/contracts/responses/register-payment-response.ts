export interface RegisterPaymentResponse {
  readonly status: 'ok';
  readonly action: 'register-payment';
  readonly result: {
    readonly paymentId: string;
    readonly customerId: string;
    readonly productId: string;
    readonly planId: string;
    readonly amount: number;
    readonly currency: string;
    readonly dryRun: boolean;
  };
}
