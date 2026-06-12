import { MarketResearcher, MarketOpportunity, MarketSignal } from './MarketResearcher';
import { ProductSupervisor, ProductEvaluation, SupervisorReport } from './ProductSupervisor';

export interface BusinessDecision {
  readonly id: string;
  readonly type: 'market_opportunity' | 'product_retirement' | 'pricing_change' | 'feature_investment';
  readonly title: string;
  readonly description: string;
  readonly impact: 'low' | 'medium' | 'high' | 'critical';
  readonly confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  readonly createdAt: Date;
  decidedAt?: Date;
  readonly evidence: string[];
}

export class DecisionEngine {
  private readonly researcher: MarketResearcher;
  private readonly supervisor: ProductSupervisor;
  private readonly decisions: BusinessDecision[] = [];
  private decisionCounter = 0;

  constructor() {
    this.researcher = new MarketResearcher();
    this.supervisor = new ProductSupervisor();
  }

  public getResearcher(): MarketResearcher {
    return this.researcher;
  }

  public getSupervisor(): ProductSupervisor {
    return this.supervisor;
  }

  public ingestSignal(signal: MarketSignal): void {
    this.researcher.ingestSignal(signal);
    const opportunities = this.researcher.analyze(signal.topic || 'smb');
    for (const opp of opportunities) {
      this.createOpportunityDecision(opp);
    }
  }

  public evaluateProduct(
    productId: string,
    productName: string,
    signals: Parameters<ProductSupervisor['evaluate']>[2]
  ): ProductEvaluation {
    const evaluation = this.supervisor.evaluate(productId, productName, signals);
    this.createProductDecision(evaluation);
    return evaluation;
  }

  public getReport(): SupervisorReport {
    return this.supervisor.generateReport();
  }

  public getDecisions(): BusinessDecision[] {
    return [...this.decisions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getPendingDecisions(): BusinessDecision[] {
    return this.decisions.filter((d) => d.status === 'pending');
  }

  public resolveDecision(id: string, status: 'approved' | 'rejected'): BusinessDecision | null {
    const decision = this.decisions.find((d) => d.id === id);
    if (!decision || decision.status !== 'pending') {
      return null;
    }
    decision.status = status;
    decision.decidedAt = new Date();
    return decision;
  }

  private createOpportunityDecision(opportunity: MarketOpportunity): void {
    this.decisionCounter++;
    const decision: BusinessDecision = {
      id: `dec_${this.decisionCounter}_${Date.now()}`,
      type: 'market_opportunity',
      title: `Build: ${opportunity.concept}`,
      description: `Market gap in ${opportunity.segment} for ${opportunity.painPoint}`,
      impact: opportunity.confidence > 0.7 ? 'high' : 'medium',
      confidence: opportunity.confidence,
      status: 'pending',
      createdAt: new Date(),
      evidence: [
        `Segment: ${opportunity.segment}`,
        `Pain point: ${opportunity.painPoint}`,
        `Competitive gap: ${opportunity.competitiveGap}`,
        `Willingness to pay: $${opportunity.willingnessToPay}`,
        `Demand: ${opportunity.estimatedDemand}`,
      ],
    };
    this.decisions.push(decision);
  }

  private createProductDecision(evaluation: ProductEvaluation): void {
    this.decisionCounter++;
    const decision: BusinessDecision = {
      id: `dec_${this.decisionCounter}_${Date.now()}`,
      type: evaluation.decision === 'retire' ? 'product_retirement' : 'feature_investment',
      title: `${evaluation.decision === 'retire' ? 'Retire' : 'Keep / Invest in'}: ${evaluation.productName}`,
      description: evaluation.reasonCodes.join(', '),
      impact: evaluation.monetizationPotential > 1000 ? 'high' : 'medium',
      confidence: 0.8,
      status: 'pending',
      createdAt: new Date(),
      evidence: [
        `Product: ${evaluation.productName}`,
        `Status: ${evaluation.status}`,
        `Monetization potential: $${evaluation.monetizationPotential}/mo`,
        `Maintenance cost: $${evaluation.maintenanceCost}/mo`,
        ...evaluation.reasonCodes,
      ],
    };
    this.decisions.push(decision);
  }
}
