/** Billing command contracts (input ports). */
export interface RegisterPaymentCommand {
	readonly paymentId: string;
	readonly customerId: string;
	readonly productId: string;
	readonly planId: string;
	readonly amount: number;
	readonly currency: string;
}

export interface ProvisionAccountCommand {
	readonly accountId: string;
	readonly paymentId: string;
}
