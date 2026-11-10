import type {
  Border,
  Currency,
  ExchangeRate,
  Product,
  Requirement,
  Rule,
  SavedPlan,
  Source,
  ChecklistItemView,
} from "@/lib/domain";

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
}

export interface ChecklistUpdateResult {
  doneCount: number;
  totalCount: number;
  done: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

/**
 * Server-only Repository interface for CrossBorder Assist.
 * The production implementation is Prisma + PostgreSQL.
 */
export interface Repository {
  // Public Reference Data
  listBorders(activeOnly?: boolean): Promise<Border[]>;
  getBorder(id: string): Promise<Border | null>;
  searchProducts(query: string, options?: PaginationOptions): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  getExchangeRate(currency: Currency): Promise<ExchangeRate | null>;
  listActiveRules(): Promise<Rule[]>;
  getRequirements(ids: readonly string[]): Promise<Requirement[]>;
  getSourcesForRequirements(requirements: readonly Requirement[]): Promise<Source[]>;

  // User-scoped Saved Plans & Persistence
  listSavedPlans(userId?: string, options?: PaginationOptions): Promise<SavedPlan[]>;
  getSavedPlan(id: string, userId: string): Promise<SavedPlan | null>;
  createSavedPlan(
    plan: {
      userId: string;
      input: SavedPlan["input"];
      verdict: SavedPlan["verdict"];
      valueUsd: number | null;
      rateId: string | null;
      rateSnapshot: string;
      ruleId: string | null;
      ruleVersion: number | null;
      asOf: string;
    },
    items: ChecklistItemView[],
  ): Promise<SavedPlan>;
  updateChecklistItem(
    planId: string,
    requirementId: string,
    done: boolean,
    userId: string,
  ): Promise<ChecklistUpdateResult | null>;
  deleteSavedPlan(id: string, userId: string): Promise<boolean>;

  // Admin & Audit
  createAuditLog(log: {
    actorId?: string | null;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
  }): Promise<void>;
  listAuditLogs(options?: PaginationOptions & { entityType?: string }): Promise<AuditLogEntry[]>;
  createRuleVersion(rule: Rule, actorId: string): Promise<Rule>;
  createRequirementRecord(req: Requirement, actorId: string): Promise<Requirement>;
  createSourceRecord(src: Source, actorId: string): Promise<Source>;
  createExchangeRateSnapshot(rate: ExchangeRate, actorId: string): Promise<ExchangeRate>;
}
