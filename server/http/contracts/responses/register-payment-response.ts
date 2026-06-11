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
    readonly invoice: {
      readonly status: 'issued' | 'skipped' | 'failed';
      readonly detail: string;
      readonly cfdiUuid?: string;
      readonly recipients: readonly string[];
    };
  };
}
