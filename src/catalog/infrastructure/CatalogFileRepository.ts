import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface CatalogManifest {
  readonly catalogVersion: string;
  readonly files: {
    readonly products: string;
    readonly plans: string;
    readonly features: string;
    readonly limits: string;
    readonly trials: string;
    readonly upgrades: string;
    readonly availabilityByChannel: string;
    readonly pricingRules: string;
    readonly experimentFlags: string;
    readonly validityWindows: string;
  };
}

interface CatalogProductRecord {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly planIds: string[];
}

interface CatalogPlanRecord {
  readonly id: string;
  readonly name: string;
  readonly tier: number;
  readonly currency: string;
  readonly priceMonthly: number;
}

interface CatalogValidityWindow {
  readonly planId: string;
  readonly validFrom: string;
  readonly validTo?: string;
}

interface CatalogData {
  readonly products: CatalogProductRecord[];
  readonly plans: CatalogPlanRecord[];
  readonly availabilityByChannel: Record<string, string[]>;
  readonly validityWindows: CatalogValidityWindow[];
}

export interface ResolvedOffer {
  readonly productId: string;
  readonly productName: string;
  readonly planId: string;
  readonly planName: string;
  readonly currency: string;
  readonly priceMonthly: number;
}

export class CatalogFileRepository {
  private readonly data: CatalogData;

  constructor(private readonly catalogRootPath?: string) {
    this.data = this.loadCatalogData();
  }

  public getProduct(productId: string): CatalogProductRecord | null {
    return this.data.products.find((product) => product.id === productId) || null;
  }

  public getPlan(planId: string): CatalogPlanRecord | null {
    return this.data.plans.find((plan) => plan.id === planId) || null;
  }

  public resolveOffer(productId: string, preferredPlanId?: string, at: Date = new Date()): ResolvedOffer | null {
    const product = this.getProduct(productId);
    if (!product) {
      return null;
    }

    const activePlanIds = product.planIds.filter((planId) => this.isPlanActiveAt(planId, at));
    if (activePlanIds.length === 0) {
      return null;
    }

    const planId = preferredPlanId && activePlanIds.includes(preferredPlanId)
      ? preferredPlanId
      : activePlanIds[0];

    const plan = this.getPlan(planId);
    if (!plan) {
      return null;
    }

    return {
      productId: product.id,
      productName: product.name,
      planId: plan.id,
      planName: plan.name,
      currency: plan.currency,
      priceMonthly: plan.priceMonthly
    };
  }

  public isAvailableForChannel(productId: string, planId: string, channel: string): boolean {
    const product = this.getProduct(productId);
    if (!product || !product.planIds.includes(planId)) {
      return false;
    }

    const availablePlans = this.data.availabilityByChannel[channel] || [];
    return availablePlans.includes(planId);
  }

  private isPlanActiveAt(planId: string, at: Date): boolean {
    const window = this.data.validityWindows.find((item) => item.planId === planId);
    if (!window) {
      return true;
    }

    const validFrom = new Date(window.validFrom);
    const validTo = window.validTo ? new Date(window.validTo) : null;

    if (Number.isNaN(validFrom.getTime())) {
      return false;
    }

    if (at < validFrom) {
      return false;
    }

    if (validTo && at > validTo) {
      return false;
    }

    return true;
  }

  private loadCatalogData(): CatalogData {
    const rootPath = this.resolveCatalogRootPath();
    const manifestPath = resolve(rootPath, 'catalog-manifest.json');
    const manifest = this.readJsonFile<CatalogManifest>(manifestPath);

    const products = this.readJsonFile<{ products: CatalogProductRecord[] }>(
      resolve(rootPath, manifest.files.products)
    ).products;

    const plans = this.readJsonFile<{ plans: CatalogPlanRecord[] }>(
      resolve(rootPath, manifest.files.plans)
    ).plans;

    const availabilityByChannel = this.readJsonFile<{ availabilityByChannel: Record<string, string[]> }>(
      resolve(rootPath, manifest.files.availabilityByChannel)
    ).availabilityByChannel;

    const validityWindows = this.readJsonFile<{ planValidityWindows: CatalogValidityWindow[] }>(
      resolve(rootPath, manifest.files.validityWindows)
    ).planValidityWindows;

    return {
      products,
      plans,
      availabilityByChannel,
      validityWindows
    };
  }

  private resolveCatalogRootPath(): string {
    if (this.catalogRootPath) {
      return this.catalogRootPath;
    }

    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFilePath);
    return resolve(currentDir, '../../../ops/catalog');
  }

  private readJsonFile<T>(filePath: string): T {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  }
}
