import { describe, expect, it } from 'vitest';
import { Product } from '../../../src/product/domain/entities/Product';
import { ProductRelease } from '../../../src/product/domain/entities/ProductRelease';
import { ProductId } from '../../../src/shared/domain/value-objects/ProductId';
import { Version } from '../../../src/shared/domain/value-objects/Version';

describe('Product entity invariants', () => {
  it('rejects invalid product name', () => {
    expect(() => new Product(new ProductId('p1'), ' ')).toThrowError(
      'Product name must contain at least 2 characters.'
    );
  });

  it('adds and returns releases', () => {
    const product = new Product(new ProductId('prod-1'), 'FacturAutentico');
    const release = new ProductRelease(new ProductId('prod-1'), new Version('1.0.0'));

    product.addRelease(release);

    expect(product.getReleases()).toHaveLength(1);
    expect(product.getReleases()[0].version.value()).toBe('1.0.0');
  });
});
