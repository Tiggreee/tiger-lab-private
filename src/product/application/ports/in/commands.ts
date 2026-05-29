/** Product command contracts (input ports). */
export interface CreateProductCommand {
	readonly productId: string;
	readonly name: string;
}

export interface ReleaseProductCommand {
	readonly productId: string;
	readonly version: string;
}
