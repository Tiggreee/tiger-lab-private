/** Catalog query contracts (input ports). */
export interface ResolveOfferQuery {
	readonly productId: string;
	readonly planId: string;
	readonly at?: Date;
}

export interface ValidateAvailabilityQuery {
	readonly productId: string;
	readonly planId: string;
	readonly at?: Date;
}
