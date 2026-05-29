import { GenerateContentCommand, PublishContentCommand } from './commands';
import { GetContentStatusQuery } from './queries';

/** Content command/query handlers (input ports). */
export interface GenerateContentCommandHandler {
	execute(command: GenerateContentCommand): Promise<void>;
}

export interface PublishContentCommandHandler {
	execute(command: PublishContentCommand): Promise<void>;
}

export interface GetContentStatusQueryHandler {
	execute(query: GetContentStatusQuery): Promise<void>;
}
