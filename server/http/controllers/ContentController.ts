import { randomUUID } from 'node:crypto';
import { GenerateContentUseCase } from '../../../src/content/application/use-cases/GenerateContentUseCase';
import { PublishContentUseCase } from '../../../src/content/application/use-cases/PublishContentUseCase';
import { GenerateContentRequest } from '../contracts/requests/generate-content-request';
import { GenerateContentResponse } from '../contracts/responses/generate-content-response';
import { PublishContentRequest } from '../contracts/requests/publish-content-request';
import { PublishContentResponse } from '../contracts/responses/publish-content-response';
import { trackFunnelEvent } from '../../../src/shared/infrastructure/observability/funnel-telemetry';

export class ContentController {
  constructor(
    private readonly generateContentUseCase: GenerateContentUseCase,
    private readonly publishContentUseCase: PublishContentUseCase
  ) {}

  public async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    const productId = request.productId || request.product || 'unknown-product';
    const contentType = request.type || 'post';
    const channel = request.channel || 'web';
    const contentId = request.assetId || `content_${randomUUID().slice(0, 8)}`;

    await this.generateContentUseCase.execute({
      assetId: contentId,
      productId,
      body: request.body || `Auto-generated ${contentType} for ${productId}.`
    });

    await trackFunnelEvent('content_generated', {
      contentId,
      productId,
      contentType,
      channel,
      dryRun: request.dryRun !== false
    });

    return {
      status: 'ok',
      action: 'generate-content',
      result: {
        contentId,
        file: `ops/content/${productId}-${contentType}-${channel}.md`,
        channel,
        dryRun: request.dryRun !== false
      }
    };
  }

  public async publishContent(request: PublishContentRequest): Promise<PublishContentResponse> {
    const publicationId = request.publicationId || `pub_${randomUUID().slice(0, 8)}`;
    const assetId = request.assetId || `content_${randomUUID().slice(0, 8)}`;
    const channel = request.channel || 'web';

    await this.publishContentUseCase.execute({
      publicationId,
      assetId,
      channel
    });

    await trackFunnelEvent('content_published', {
      publicationId,
      assetId,
      channel,
      dryRun: request.dryRun !== false
    });

    return {
      status: 'ok',
      action: 'publish-content',
      result: {
        publicationId,
        assetId,
        channel,
        dryRun: request.dryRun !== false
      }
    };
  }
}
