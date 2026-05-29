import { describe, expect, it } from 'vitest';
import { ContentAsset } from '../../../src/content/domain/entities/ContentAsset';
import { Publication } from '../../../src/content/domain/entities/Publication';
import { ProductId } from '../../../src/shared/domain/value-objects/ProductId';

describe('Content entities invariants', () => {
  it('rejects empty content body', () => {
    expect(() => new ContentAsset('asset-1', new ProductId('prod-1'), '   ')).toThrowError(
      'Content body cannot be empty.'
    );
  });

  it('creates valid publication', () => {
    const publication = new Publication('pub-1', 'asset-1', 'web');
    expect(publication.channel).toBe('web');
  });
});
