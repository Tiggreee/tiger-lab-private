import { CatalogPlan } from '../../../domain/entities/CatalogPlan';
import { CatalogProduct } from '../../../domain/entities/CatalogProduct';

/** Catalog repository output ports. */
export interface CatalogRepositoryPort {
  saveCatalogProduct(product: CatalogProduct): Promise<void>;
  findProductById(productId: string): Promise<CatalogProduct | null>;
  findPlanById(productId: string, planId: string): Promise<CatalogPlan | null>;
}
