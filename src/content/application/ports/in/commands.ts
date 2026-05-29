/** Content command contracts (input ports). */
export interface GenerateContentCommand {
	readonly assetId: string;
	readonly productId: string;
	readonly body: string;
}

export interface PublishContentCommand {
	readonly publicationId: string;
	readonly assetId: string;
	readonly channel: string;
}
