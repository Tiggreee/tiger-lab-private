/** Publication entity. */
export class Publication {
  public readonly publicationId: string;
  public readonly assetId: string;
  public readonly channel: string;
  public readonly publishedAt: Date;

  constructor(publicationId: string, assetId: string, channel: string, publishedAt = new Date()) {
    if (!publicationId.trim()) {
      throw new Error('Publication ID cannot be empty.');
    }

    if (!assetId.trim()) {
      throw new Error('Asset ID cannot be empty.');
    }

    if (!channel.trim()) {
      throw new Error('Channel cannot be empty.');
    }

    this.publicationId = publicationId;
    this.assetId = assetId;
    this.channel = channel;
    this.publishedAt = publishedAt;
  }
}
