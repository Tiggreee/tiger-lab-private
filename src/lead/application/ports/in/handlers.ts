import { CaptureLeadCommand, ScoreLeadCommand } from './commands';
import { GetLeadScoreQuery } from './queries';

/** Lead command/query handlers (input ports). */
export interface CaptureLeadCommandHandler {
	execute(command: CaptureLeadCommand): Promise<void>;
}

export interface ScoreLeadCommandHandler {
	execute(command: ScoreLeadCommand): Promise<void>;
}

export interface GetLeadScoreQueryHandler {
	execute(query: GetLeadScoreQuery): Promise<void>;
}
