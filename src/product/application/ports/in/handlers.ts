import { CreateProductCommand, ReleaseProductCommand } from './commands';
import { GetProductStatusQuery } from './queries';

/** Product command/query handlers (input ports). */
export interface CreateProductCommandHandler {
	execute(command: CreateProductCommand): Promise<void>;
}

export interface ReleaseProductCommandHandler {
	execute(command: ReleaseProductCommand): Promise<void>;
}

export interface GetProductStatusQueryHandler {
	execute(query: GetProductStatusQuery): Promise<void>;
}
