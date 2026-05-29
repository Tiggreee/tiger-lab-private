/** Lead command contracts (input ports). */
export interface CaptureLeadCommand {
	readonly leadId: string;
	readonly source: string;
}

export interface ScoreLeadCommand {
	readonly leadId: string;
	readonly score: number;
}
