import { DomainEvent } from '../../../../../shared/domain/events/DomainEvent';

/** Product external service output ports. */
export interface RepoScannerPort {
  scan(repoName: string): Promise<void>;
}

export interface ArtifactStoragePort {
  storeArtifact(productId: string, version: string): Promise<void>;
}

export interface ProductReleaseApiPort {
  publishRelease(productId: string, version: string): Promise<void>;
}

export interface ProductDomainEventPublisherPort {
  publish(event: DomainEvent<unknown>): Promise<void>;
}
