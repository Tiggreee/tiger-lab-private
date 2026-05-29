import { Product } from '../../../domain/entities/Product';
import { ProductRelease } from '../../../domain/entities/ProductRelease';

/** Product repository output ports. */
export interface ProductRepositoryPort {
  saveProduct(product: Product): Promise<void>;
  saveProductRelease(release: ProductRelease): Promise<void>;
  findProductById(productId: string): Promise<Product | null>;
}
