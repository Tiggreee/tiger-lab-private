import { ProductId } from '../../../shared/domain/value-objects/ProductId';
import { ProductRelease } from './ProductRelease';

/** Product aggregate root. */
export class Product {
  public readonly productId: ProductId;
  public readonly name: string;
  public readonly createdAt: Date;
  private releases: ProductRelease[];

  constructor(productId: ProductId, name: string, createdAt = new Date()) {
    const normalized = name.trim();
    if (normalized.length < 2) {
      throw new Error('Product name must contain at least 2 characters.');
    }

    this.productId = productId;
    this.name = normalized;
    this.createdAt = createdAt;
    this.releases = [];
  }

  public addRelease(release: ProductRelease): void {
    this.releases.push(release);
  }

  public getReleases(): readonly ProductRelease[] {
    return this.releases;
  }
}
