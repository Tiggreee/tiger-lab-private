import { describe, expect, it } from 'vitest';
import { CatalogPlan } from '../../../src/catalog/domain/entities/CatalogPlan';
import { CatalogProduct } from '../../../src/catalog/domain/entities/CatalogProduct';
import { Currency } from '../../../src/shared/domain/value-objects/Currency';
import { Money } from '../../../src/shared/domain/value-objects/Money';
import { PlanId } from '../../../src/shared/domain/value-objects/PlanId';
import { ProductId } from '../../../src/shared/domain/value-objects/ProductId';

describe('Catalog entity invariants', () => {
  it('rejects catalog product without plans', () => {
    expect(() => new CatalogProduct(new ProductId('prod-1'), 'Product', [])).toThrowError(
      'Catalog product must have at least one plan.'
    );
  });

  it('resolves valid plan at active date', () => {
    const plan = new CatalogPlan(
      new PlanId('starter'),
      'Starter',
      new Money(39, new Currency('USD')),
      new Date('2026-01-01T00:00:00.000Z')
    );

    const product = new CatalogProduct(new ProductId('prod-1'), 'Catalog Product', [plan]);
    const resolved = product.resolvePlan(new PlanId('starter'), new Date('2026-02-01T00:00:00.000Z'));

    expect(resolved.planId.value()).toBe('starter');
  });
});
