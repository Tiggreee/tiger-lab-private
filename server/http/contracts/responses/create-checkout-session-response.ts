export interface CreateCheckoutSessionResponse {
  readonly status: 'ok';
  readonly action: 'create-checkout-session';
  readonly result: {
    readonly sessionId: string;
    readonly approvalUrl: string;
    readonly amount: number;
    readonly currency: string;
    readonly productId: string;
    readonly planId: string;
  };
}
