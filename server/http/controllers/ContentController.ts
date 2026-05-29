import { randomUUID } from 'node:crypto';
import { GenerateContentUseCase } from '../../../src/content/application/use-cases/GenerateContentUseCase';
import { GenerateContentRequest } from '../contracts/requests/generate-content-request';
import { GenerateContentResponse } from '../contracts/responses/generate-content-response';

export class ContentController {
  constructor(private readonly generateContentUseCase: GenerateContentUseCase) {}

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
}
