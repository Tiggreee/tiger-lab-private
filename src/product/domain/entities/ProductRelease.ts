import { ProductId } from '../../../shared/domain/value-objects/ProductId';
import { Version } from '../../../shared/domain/value-objects/Version';

/** Product release entity. */
export class ProductRelease {
  public readonly productId: ProductId;
  public readonly version: Version;
  public readonly releasedAt: Date;

  constructor(productId: ProductId, version: Version, releasedAt = new Date()) {
    this.productId = productId;
    this.version = version;
    this.releasedAt = releasedAt;
  }
}
