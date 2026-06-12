export interface ProductEvaluation {
  readonly productId: string;
  readonly productName: string;
  readonly status: 'active' | 'flagged' | 'paused' | 'retired';
  readonly reasonCodes: string[];
  readonly monetizationPotential: number;
  readonly maintenanceCost: number;
  readonly decision: 'keep' | 'iterate' | 'retire';
  readonly decidedAt: Date;
}

export interface SupervisorReport {
  readonly evaluatedAt: Date;
  readonly totalProducts: number;
  readonly activeProducts: number;
  readonly flaggedProducts: number;
  readonly retiredProducts: number;
  readonly totalPotentialRevenue: number;
  readonly totalMaintenanceCost: number;
  readonly recommendations: string[];
}

const MAINTENANCE_COST_PER_PRODUCT = 20;

export class ProductSupervisor {
  private readonly evaluations: ProductEvaluation[] = [];

  public evaluate(
    productId: string,
    productName: string,
    signals: {
      revenue30d: number;
      activeCustomers: number;
      supportTickets30d: number;
      churnRate: number;
      growthRate: number;
    }
  ): ProductEvaluation {
    const monetizationPotential = signals.revenue30d * 12;
    const maintenanceCost = MAINTENANCE_COST_PER_PRODUCT * signals.supportTickets30d;
    const ratio = monetizationPotential / Math.max(maintenanceCost, 1);

    let status: ProductEvaluation['status'];
    const reasonCodes: string[] = [];

    if (signals.revenue30d <= 0 && signals.activeCustomers === 0) {
      status = 'retired';
      reasonCodes.push('no_revenue_no_customers');
    } else if (signals.churnRate > 0.5) {
      status = 'flagged';
      reasonCodes.push('high_churn_rate');
    } else if (signals.growthRate > 0.2) {
      status = 'active';
      reasonCodes.push('strong_growth');
    } else if (ratio > 3) {
      status = 'active';
      reasonCodes.push('healthy_revenue_ratio');
    } else if (signals.supportTickets30d > 50 && signals.revenue30d < 500) {
      status = 'flagged';
      reasonCodes.push('high_support_low_revenue');
    } else {
      status = 'paused';
      reasonCodes.push('low_performance_review');
    }

    let decision: ProductEvaluation['decision'];
    if (status === 'retired') {
      decision = 'retire';
    } else if (status === 'flagged') {
      decision = 'iterate';
    } else if (status === 'paused') {
      decision = 'iterate';
    } else {
      decision = 'keep';
    }

    const evaluation: ProductEvaluation = {
      productId,
      productName,
      status,
      reasonCodes,
      monetizationPotential,
      maintenanceCost,
      decision,
      decidedAt: new Date(),
    };

    this.evaluations.push(evaluation);
    return evaluation;
  }

  public generateReport(): SupervisorReport {
    const active = this.evaluations.filter((e) => e.status === 'active');
    const flagged = this.evaluations.filter((e) => e.status === 'flagged');
    const retired = this.evaluations.filter((e) => e.status === 'retired');

    return {
      evaluatedAt: new Date(),
      totalProducts: this.evaluations.length,
      activeProducts: active.length,
      flaggedProducts: flagged.length,
      retiredProducts: retired.length,
      totalPotentialRevenue: active.reduce((s, e) => s + e.monetizationPotential, 0),
      totalMaintenanceCost: this.evaluations.reduce((s, e) => s + e.maintenanceCost, 0),
      recommendations: this.buildRecommendations(active, flagged, retired),
    };
  }

  private buildRecommendations(
    active: ProductEvaluation[],
    flagged: ProductEvaluation[],
    retired: ProductEvaluation[]
  ): string[] {
    const recommendations: string[] = [];
    if (flagged.length > 0) {
      recommendations.push(`Flagged ${flagged.length} product(s) requiring iteration or retirement`);
    }
    if (retired.length > 0) {
      recommendations.push(`Retired ${retired.length} product(s) with no revenue`);
    }
    if (active.length > 0) {
      recommendations.push(`Double down on ${active.length} active product(s)`);
    }
    recommendations.push(`Total monthly revenue potential: $${active.reduce((s, e) => s + e.monetizationPotential, 0)}`);
    return recommendations;
  }

  public getEvaluations(): ProductEvaluation[] {
    return this.evaluations;
  }
}
