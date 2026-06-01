export interface DecideCommercialActionInput {
  readonly leadScore: number;
  readonly requestedProductId: string;
  readonly catalogAvailablePlans: string[];
  readonly hasSuccessfulPayment: boolean;
  readonly hasOutstandingInvoice: boolean;
  readonly customerSegment?: 'new' | 'existing';
  readonly requireHighValueHandoff?: boolean;
}

export interface DecideCommercialActionResult {
  readonly recommendedPlan: string;
  readonly nextAction:
    | 'collect_requirements'
    | 'send_checkout'
    | 'request_payment_method'
    | 'provision_account'
    | 'handoff_to_sales';
  readonly reasonCodes: string[];
}

interface LeadPolicyResult {
  readonly recommendedPlan: string;
  readonly reasonCodes: string[];
}

interface CatalogPolicyResult {
  readonly allowedPlan: string;
  readonly reasonCodes: string[];
}

interface BillingPolicyResult {
  readonly nextAction: DecideCommercialActionResult['nextAction'];
  readonly reasonCodes: string[];
}

/**
 * Minimal commercial policy orchestrator.
 * Integrates lead, catalog and billing policy decisions.
 */
export class DecideCommercialActionUseCase {
  public execute(input: DecideCommercialActionInput): DecideCommercialActionResult {
    const leadPolicy = this.evaluateLeadPolicy(input.leadScore, input.customerSegment);
    const catalogPolicy = this.evaluateCatalogPolicy(leadPolicy.recommendedPlan, input.catalogAvailablePlans);
    const billingPolicy = this.evaluateBillingPolicy(input);

    const reasonCodes = [
      ...leadPolicy.reasonCodes,
      ...catalogPolicy.reasonCodes,
      ...billingPolicy.reasonCodes
    ];

    return {
      recommendedPlan: catalogPolicy.allowedPlan,
      nextAction: billingPolicy.nextAction,
      reasonCodes
    };
  }

  private evaluateLeadPolicy(leadScore: number, customerSegment?: 'new' | 'existing'): LeadPolicyResult {
    if (leadScore >= 85) {
      return {
        recommendedPlan: 'enterprise',
        reasonCodes: ['LEAD_HIGH_INTENT']
      };
    }

    if (leadScore >= 60) {
      return {
        recommendedPlan: 'pro',
        reasonCodes: ['LEAD_MEDIUM_INTENT']
      };
    }

    if (customerSegment === 'existing') {
      return {
        recommendedPlan: 'pro',
        reasonCodes: ['LEAD_EXISTING_CUSTOMER']
      };
    }

    return {
      recommendedPlan: 'starter',
      reasonCodes: ['LEAD_LOW_INTENT']
    };
  }

  private evaluateCatalogPolicy(recommendedPlan: string, availablePlans: string[]): CatalogPolicyResult {
    if (availablePlans.length === 0) {
      return {
        allowedPlan: 'starter',
        reasonCodes: ['CATALOG_EMPTY']
      };
    }

    if (availablePlans.includes(recommendedPlan)) {
      return {
        allowedPlan: recommendedPlan,
        reasonCodes: ['CATALOG_PLAN_AVAILABLE']
      };
    }

    return {
      allowedPlan: availablePlans[0],
      reasonCodes: ['CATALOG_FALLBACK_PLAN']
    };
  }

  private evaluateBillingPolicy(input: DecideCommercialActionInput): BillingPolicyResult {
    const requireHighValueHandoff =
      input.requireHighValueHandoff ?? process.env.COMMERCIAL_REQUIRE_HIGH_VALUE_HANDOFF === 'true';

    if (input.hasOutstandingInvoice) {
      return {
        nextAction: 'request_payment_method',
        reasonCodes: ['BILLING_BLOCKED_INVOICE']
      };
    }

    if (input.hasSuccessfulPayment) {
      return {
        nextAction: 'provision_account',
        reasonCodes: ['BILLING_PAYMENT_CONFIRMED']
      };
    }

    if (input.leadScore >= 90 && requireHighValueHandoff) {
      return {
        nextAction: 'handoff_to_sales',
        reasonCodes: ['BILLING_HIGH_VALUE_HANDOFF']
      };
    }

    if (input.leadScore >= 90 && !requireHighValueHandoff) {
      return {
        nextAction: 'send_checkout',
        reasonCodes: ['BILLING_HIGH_VALUE_AUTOCLOSE']
      };
    }

    if (input.requestedProductId.trim().length === 0) {
      return {
        nextAction: 'collect_requirements',
        reasonCodes: ['BILLING_MISSING_PRODUCT_CONTEXT']
      };
    }

    return {
      nextAction: 'send_checkout',
      reasonCodes: ['BILLING_READY_FOR_CHECKOUT']
    };
  }
}
