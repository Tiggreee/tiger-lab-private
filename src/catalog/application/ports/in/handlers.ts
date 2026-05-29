import { UpdateCatalogCommand } from './commands';
import { ResolveOfferQuery, ValidateAvailabilityQuery } from './queries';

/** Catalog command/query handlers (input ports). */
export interface UpdateCatalogCommandHandler {
	execute(command: UpdateCatalogCommand): Promise<void>;
}

export interface ResolveOfferQueryHandler {
	execute(query: ResolveOfferQuery): Promise<void>;
}

export interface ValidateAvailabilityQueryHandler {
	execute(query: ValidateAvailabilityQuery): Promise<void>;
}
