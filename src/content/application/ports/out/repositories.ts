import { ContentAsset } from '../../../domain/entities/ContentAsset';
import { Publication } from '../../../domain/entities/Publication';

/** Content repository output ports. */
export interface ContentRepositoryPort {
  saveAsset(asset: ContentAsset): Promise<void>;
  savePublication(publication: Publication): Promise<void>;
  findAssetById(assetId: string): Promise<ContentAsset | null>;
}
