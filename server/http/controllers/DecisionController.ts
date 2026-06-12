import { randomUUID } from 'node:crypto';
import { DecisionEngine } from '../../../src/orchestration/engine/DecisionEngine';
import { MarketSignal } from '../../../src/orchestration/engine/MarketResearcher';

export interface DecisionRequestBody {
  action: 'ingest-signal' | 'evaluate-product' | 'resolve-decision' | 'get-decisions' | 'get-report' | 'get-pending';
  signal?: {
    source: 'direct' | 'inbound' | 'social' | 'support' | 'competitor';
    topic: string;
    intent: string;
    frequency: number;
    urgency: 'low' | 'medium' | 'high';
    segment?: string;
  };
  product?: {
    productId: string;
    productName: string;
    revenue30d: number;
    activeCustomers: number;
    supportTickets30d: number;
    churnRate: number;
    growthRate: number;
  };
  decisionId?: string;
  decisionStatus?: 'approved' | 'rejected';
}

export interface DecisionActionResponse {
  status: 'ok' | 'error';
  action: string;
  result: Record<string, unknown>;
  error?: string;
}

export class DecisionController {
  constructor(private readonly decisionEngine: DecisionEngine) {}

  public async handle(body: DecisionRequestBody): Promise<DecisionActionResponse> {
    switch (body.action) {
      case 'ingest-signal':
        return this.ingestSignal(body);
      case 'evaluate-product':
        return this.evaluateProduct(body);
      case 'resolve-decision':
        return this.resolveDecision(body);
      case 'get-decisions':
        return this.getDecisions();
      case 'get-pending':
        return this.getPending();
      case 'get-report':
        return this.getReport();
      default:
        return {
          status: 'error',
          action: 'decision',
          result: {},
          error: `Unknown action: ${body.action}`,
        };
    }
  }

  private ingestSignal(body: DecisionRequestBody): DecisionActionResponse {
    if (!body.signal) {
      return { status: 'error', action: 'ingest-signal', result: {}, error: 'signal required' };
    }
    const marketSignal: MarketSignal = {
      source: body.signal.source,
      topic: body.signal.topic,
      intent: body.signal.intent,
      frequency: body.signal.frequency,
      urgency: body.signal.urgency,
      timestamp: new Date(),
    };
    this.decisionEngine.ingestSignal(marketSignal);
    return {
      status: 'ok',
      action: 'ingest-signal',
      result: {
        signalTopic: body.signal.topic,
        pendingDecisions: this.decisionEngine.getPendingDecisions().length,
      },
    };
  }

  private evaluateProduct(body: DecisionRequestBody): DecisionActionResponse {
    if (!body.product) {
      return { status: 'error', action: 'evaluate-product', result: {}, error: 'product required' };
    }
    const evaluation = this.decisionEngine.evaluateProduct(
      body.product.productId,
      body.product.productName,
      {
        revenue30d: body.product.revenue30d,
        activeCustomers: body.product.activeCustomers,
        supportTickets30d: body.product.supportTickets30d,
        churnRate: body.product.churnRate,
        growthRate: body.product.growthRate,
      }
    );
    return {
      status: 'ok',
      action: 'evaluate-product',
      result: {
        productId: evaluation.productId,
        decision: evaluation.decision,
        status: evaluation.status,
        reasonCodes: evaluation.reasonCodes,
        monetizationPotential: evaluation.monetizationPotential,
        maintenanceCost: evaluation.maintenanceCost,
      },
    };
  }

  private resolveDecision(body: DecisionRequestBody): DecisionActionResponse {
    if (!body.decisionId || !body.decisionStatus) {
      return { status: 'error', action: 'resolve-decision', result: {}, error: 'decisionId and decisionStatus required' };
    }
    const result = this.decisionEngine.resolveDecision(body.decisionId, body.decisionStatus);
    if (!result) {
      return { status: 'error', action: 'resolve-decision', result: {}, error: `Decision ${body.decisionId} not found or already resolved` };
    }
    return {
      status: 'ok',
      action: 'resolve-decision',
      result: {
        decisionId: result.id,
        status: result.status,
        title: result.title,
      },
    };
  }

  private getDecisions(): DecisionActionResponse {
    return {
      status: 'ok',
      action: 'get-decisions',
      result: { decisions: this.decisionEngine.getDecisions() },
    };
  }

  private getPending(): DecisionActionResponse {
    return {
      status: 'ok',
      action: 'get-pending',
      result: { pending: this.decisionEngine.getPendingDecisions() },
    };
  }

  private getReport(): DecisionActionResponse {
    return {
      status: 'ok',
      action: 'get-report',
      result: { report: this.decisionEngine.getReport() },
    };
  }
}
