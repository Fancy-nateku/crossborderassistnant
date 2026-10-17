import type {
  Border,
  Currency,
  ExchangeRate,
  Product,
  Requirement,
  Rule,
  SavedPlan,
  Source,
} from "@/lib/domain";

/**
 * Everything the UI reads. The backend owns the real implementation
 * (Prisma + PostgreSQL); until then `mock/repository.ts` serves prototype fixtures.
 * Swap the export in `data/index.ts` and no component changes.
 */
export interface Repository {
  listBorders(): Promise<Border[]>;
  getBorder(id: string): Promise<Border | null>;
  /** Matches official names and local names. An empty query lists products. */
  searchProducts(query: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  getExchangeRate(currency: Currency): Promise<ExchangeRate | null>;
  listActiveRules(): Promise<Rule[]>;
  getRequirements(ids: readonly string[]): Promise<Requirement[]>;
  /** Sources behind the given requirements. */
  getSourcesForRequirements(requirements: readonly Requirement[]): Promise<Source[]>;
  listSavedPlans(): Promise<SavedPlan[]>;
}
