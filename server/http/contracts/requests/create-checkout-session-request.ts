export interface CreateCheckoutSessionRequest {
  readonly productId?: string;
  readonly planId?: string;
  readonly amount?: number;
  readonly currency?: string;
  readonly returnUrl?: string;
  readonly cancelUrl?: string;
}
