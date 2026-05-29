import { ProvisionAccountCommand, RegisterPaymentCommand } from './commands';
import { GetProvisioningStatusQuery } from './queries';

/** Billing command/query handlers (input ports). */
export interface RegisterPaymentCommandHandler {
	execute(command: RegisterPaymentCommand): Promise<void>;
}

export interface ProvisionAccountCommandHandler {
	execute(command: ProvisionAccountCommand): Promise<void>;
}

export interface GetProvisioningStatusQueryHandler {
	execute(query: GetProvisioningStatusQuery): Promise<void>;
}
