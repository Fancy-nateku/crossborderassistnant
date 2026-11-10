import type {
  ChecklistUpdateResult,
  PaginationOptions,
  Repository,
  AuditLogEntry,
} from "../repository";
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
import {
  borders,
  exchangeRates,
  products,
  requirements,
  rules,
  savedPlans,
  sources,
} from "./fixtures";

const normalise = (s: string) => s.trim().toLowerCase();

// In-memory mutable stores for mock/test runs
let inMemorySavedPlans: SavedPlan[] = [...savedPlans];
const inMemoryRules: Rule[] = [...rules];
const inMemoryRequirements: Requirement[] = [...requirements];
const inMemorySources: Source[] = [...sources];
const inMemoryRates: ExchangeRate[] = [...exchangeRates];
const inMemoryAuditLogs: AuditLogEntry[] = [];

export const mockRepository: Repository = {
  async listBorders(activeOnly = true): Promise<Border[]> {
    return activeOnly ? borders.filter((b) => b.active) : borders;
  },

  async getBorder(id: string): Promise<Border | null> {
    return borders.find((b) => b.id === id && b.active) ?? null;
  },

  async searchProducts(query: string, options?: PaginationOptions): Promise<Product[]> {
    const q = normalise(query);
    const limit = options?.limit ?? 50;
    if (!q) return products.slice(0, limit);
    return products
      .filter((p) =>
        [p.officialName, ...p.localNames].some((name) => normalise(name).includes(q)),
      )
      .slice(0, limit);
  },

  async getProduct(id: string): Promise<Product | null> {
    return products.find((p) => p.id === id) ?? null;
  },

  async getExchangeRate(currency: Currency): Promise<ExchangeRate | null> {
    return inMemoryRates.find((r) => r.currency === currency) ?? null;
  },

  async listActiveRules(): Promise<Rule[]> {
    return inMemoryRules.filter((r) => r.status === "active");
  },

  async getRequirements(ids: readonly string[]): Promise<Requirement[]> {
    return ids.map((id) => {
      const req = inMemoryRequirements.find((r) => r.id === id);
      if (!req) throw new Error(`Unknown requirement "${id}"`);
      return req;
    });
  },

  async getSourcesForRequirements(reqs: readonly Requirement[]): Promise<Source[]> {
    const ids = new Set(reqs.flatMap((r) => r.sourceIds));
    return inMemorySources.filter((s) => ids.has(s.id));
  },

  async listSavedPlans(userId?: string, options?: PaginationOptions): Promise<SavedPlan[]> {
    const list = userId
      ? inMemorySavedPlans.filter((p) => !p.userId || p.userId === userId)
      : inMemorySavedPlans;
    return list.slice(0, options?.limit ?? 50);
  },

  async getSavedPlan(id: string, userId: string): Promise<SavedPlan | null> {
    const plan = inMemorySavedPlans.find((p) => p.id === id && (!p.userId || p.userId === userId));
    return plan ?? null;
  },

  async createSavedPlan(
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
  ): Promise<SavedPlan> {
    const id = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const savedPlan: SavedPlan = {
      id,
      userId: plan.userId,
      input: plan.input,
      doneCount: items.filter((i) => i.done).length,
      totalCount: items.length,
      savedAt: new Date().toISOString().slice(0, 10),
      ruleChanged: false,
      verdict: plan.verdict,
      valueUsd: plan.valueUsd,
      ruleId: plan.ruleId,
      ruleVersion: plan.ruleVersion,
      items,
    };
    inMemorySavedPlans = [savedPlan, ...inMemorySavedPlans];
    return savedPlan;
  },

  async updateChecklistItem(
    planId: string,
    requirementId: string,
    done: boolean,
    userId: string,
  ): Promise<ChecklistUpdateResult | null> {
    const planIndex = inMemorySavedPlans.findIndex(
      (p) => p.id === planId && (!p.userId || p.userId === userId),
    );
    if (planIndex === -1) return null;

    const plan = inMemorySavedPlans[planIndex];
    const items = plan.items ? [...plan.items] : [];
    const itemIndex = items.findIndex((i) => i.requirementId === requirementId);
    if (itemIndex === -1) return null;

    items[itemIndex] = { ...items[itemIndex], done };
    const doneCount = items.filter((i) => i.done).length;
    const totalCount = items.length;

    inMemorySavedPlans[planIndex] = {
      ...plan,
      items,
      doneCount,
      totalCount,
    };

    return { doneCount, totalCount, done };
  },

  async deleteSavedPlan(id: string, userId: string): Promise<boolean> {
    const initialLen = inMemorySavedPlans.length;
    inMemorySavedPlans = inMemorySavedPlans.filter(
      (p) => !(p.id === id && (!p.userId || p.userId === userId)),
    );
    return inMemorySavedPlans.length < initialLen;
  },

  async createAuditLog(log: {
    actorId?: string | null;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
  }): Promise<void> {
    inMemoryAuditLogs.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      actorId: log.actorId ?? null,
      actorRole: log.actorRole,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      createdAt: new Date().toISOString(),
    });
  },

  async listAuditLogs(
    options?: PaginationOptions & { entityType?: string },
  ): Promise<AuditLogEntry[]> {
    let logs = [...inMemoryAuditLogs].reverse();
    if (options?.entityType) {
      logs = logs.filter((l) => l.entityType === options.entityType);
    }
    return logs.slice(0, options?.limit ?? 50);
  },

  async createRuleVersion(rule: Rule, actorId: string): Promise<Rule> {
    inMemoryRules.push(rule);
    await this.createAuditLog({
      actorId,
      actorRole: "ADMIN",
      action: "CREATE_RULE_VERSION",
      entityType: "RULE",
      entityId: `${rule.id}@v${rule.version}`,
      details: JSON.stringify(rule),
    });
    return rule;
  },

  async createRequirementRecord(req: Requirement, actorId: string): Promise<Requirement> {
    inMemoryRequirements.push(req);
    await this.createAuditLog({
      actorId,
      actorRole: "ADMIN",
      action: "CREATE_REQUIREMENT",
      entityType: "REQUIREMENT",
      entityId: req.id,
      details: JSON.stringify(req),
    });
    return req;
  },

  async createSourceRecord(src: Source, actorId: string): Promise<Source> {
    inMemorySources.push(src);
    await this.createAuditLog({
      actorId,
      actorRole: "ADMIN",
      action: "CREATE_SOURCE",
      entityType: "SOURCE",
      entityId: src.id,
      details: JSON.stringify(src),
    });
    return src;
  },

  async createExchangeRateSnapshot(rate: ExchangeRate, actorId: string): Promise<ExchangeRate> {
    const fullRate = {
      ...rate,
      id: rate.id ?? `rate_${Date.now()}`,
    };
    inMemoryRates.push(fullRate);
    await this.createAuditLog({
      actorId,
      actorRole: "ADMIN",
      action: "SNAPSHOT_EXCHANGE_RATE",
      entityType: "EXCHANGE_RATE",
      entityId: fullRate.id,
      details: JSON.stringify(fullRate),
    });
    return fullRate;
  },
};
