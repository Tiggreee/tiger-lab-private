import { ProductId } from '../../../shared/domain/value-objects/ProductId';

/** Content asset entity. */
export class ContentAsset {
  public readonly assetId: string;
  public readonly productId: ProductId;
  public readonly body: string;
  public readonly generatedAt: Date;

  constructor(assetId: string, productId: ProductId, body: string, generatedAt = new Date()) {
    const normalizedAssetId = assetId.trim();
    if (normalizedAssetId.length < 2) {
      throw new Error('Asset ID must contain at least 2 characters.');
    }

    if (!body.trim()) {
      throw new Error('Content body cannot be empty.');
    }

    this.assetId = normalizedAssetId;
    this.productId = productId;
    this.body = body;
    this.generatedAt = generatedAt;
  }
}
