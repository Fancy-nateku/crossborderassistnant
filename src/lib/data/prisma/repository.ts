import "server-only";
import { prisma } from "@/lib/db";
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
  Unit,
  CommonListStatus,
  Verdict,
  CountryCode,
  SourceStatus,
} from "@/lib/domain";
import type {
  ChecklistUpdateResult,
  PaginationOptions,
  Repository,
  AuditLogEntry,
} from "../repository";
import {
  CountryCode as PrismaCountry,
  Currency as PrismaCurrency,
  Unit as PrismaUnit,
  CommonListStatus as PrismaCommonList,
  Verdict as PrismaVerdict,
  SourceStatus as PrismaSourceStatus,
  RuleStatus as PrismaRuleStatus,
  UserRole as PrismaUserRole,
} from "@prisma/client";

// Mapping helpers
const toDomainCountry = (c: PrismaCountry): CountryCode => (c === PrismaCountry.KE ? "KE" : "UG");
const toPrismaCountry = (c: CountryCode): PrismaCountry => (c === "KE" ? PrismaCountry.KE : PrismaCountry.UG);

const toDomainCurrency = (c: PrismaCurrency): Currency => (c === PrismaCurrency.KES ? "KES" : "UGX");
const toPrismaCurrency = (c: Currency): PrismaCurrency => (c === "KES" ? PrismaCurrency.KES : PrismaCurrency.UGX);

const toDomainUnit = (u: PrismaUnit): Unit => {
  switch (u) {
    case PrismaUnit.BAGS:
      return "bags";
    case PrismaUnit.KILOGRAMS:
      return "kilograms";
    case PrismaUnit.CRATES:
      return "crates";
  }
};
const toPrismaUnit = (u: Unit): PrismaUnit => {
  switch (u) {
    case "bags":
      return PrismaUnit.BAGS;
    case "kilograms":
      return PrismaUnit.KILOGRAMS;
    case "crates":
      return PrismaUnit.CRATES;
  }
};

const toDomainCommonList = (s: PrismaCommonList): CommonListStatus => {
  switch (s) {
    case PrismaCommonList.YES:
      return "yes";
    case PrismaCommonList.NO:
      return "no";
    case PrismaCommonList.UNKNOWN:
      return "unknown";
  }
};
const toPrismaCommonList = (s?: CommonListStatus): PrismaCommonList | undefined => {
  if (!s) return undefined;
  switch (s) {
    case "yes":
      return PrismaCommonList.YES;
    case "no":
      return PrismaCommonList.NO;
    case "unknown":
      return PrismaCommonList.UNKNOWN;
  }
};

const toDomainVerdict = (v: PrismaVerdict): Verdict => {
  switch (v) {
    case PrismaVerdict.LIKELY_STR_ELIGIBLE:
      return "likely_str_eligible";
    case PrismaVerdict.ABOVE_THRESHOLD:
      return "above_threshold";
    case PrismaVerdict.NOT_ON_COMMON_LIST:
      return "not_on_common_list";
    case PrismaVerdict.CANNOT_CONFIRM:
      return "cannot_confirm";
  }
};
const toPrismaVerdict = (v: Verdict): PrismaVerdict => {
  switch (v) {
    case "likely_str_eligible":
      return PrismaVerdict.LIKELY_STR_ELIGIBLE;
    case "above_threshold":
      return PrismaVerdict.ABOVE_THRESHOLD;
    case "not_on_common_list":
      return PrismaVerdict.NOT_ON_COMMON_LIST;
    case "cannot_confirm":
      return PrismaVerdict.CANNOT_CONFIRM;
  }
};

const toDomainSourceStatus = (s: PrismaSourceStatus): SourceStatus => {
  switch (s) {
    case PrismaSourceStatus.VERIFIED:
      return "verified";
    case PrismaSourceStatus.UNVERIFIED:
      return "unverified";
    case PrismaSourceStatus.CONFLICTING:
      return "conflicting";
  }
};

export const prismaRepository: Repository = {
  async listBorders(activeOnly = true): Promise<Border[]> {
    const borders = await prisma.border.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
    return borders.map((b) => ({
      id: b.id,
      name: b.name,
      countries: [toDomainCountry(b.countryFrom), toDomainCountry(b.countryTo)] as const,
      note: b.note,
      active: b.active,
      deskContact: b.deskContact,
    }));
  },

  async getBorder(id: string): Promise<Border | null> {
    const b = await prisma.border.findUnique({ where: { id } });
    if (!b) return null;
    return {
      id: b.id,
      name: b.name,
      countries: [toDomainCountry(b.countryFrom), toDomainCountry(b.countryTo)] as const,
      note: b.note,
      active: b.active,
      deskContact: b.deskContact,
    };
  },

  async searchProducts(query: string, options?: PaginationOptions): Promise<Product[]> {
    const q = query.trim().toLowerCase();
    const limit = Math.min(options?.limit ?? 50, 100);

    const products = await prisma.product.findMany({
      where: q
        ? {
            OR: [
              { officialName: { contains: q, mode: "insensitive" } },
              { localNames: { some: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : undefined,
      include: { localNames: true },
      take: limit,
      orderBy: { officialName: "asc" },
    });

    return products.map((p) => ({
      id: p.id,
      officialName: p.officialName,
      localNames: p.localNames.map((l) => l.name),
      onCommonList: toDomainCommonList(p.onCommonList),
      description: p.description,
    }));
  },

  async getProduct(id: string): Promise<Product | null> {
    const p = await prisma.product.findUnique({
      where: { id },
      include: { localNames: true },
    });
    if (!p) return null;
    return {
      id: p.id,
      officialName: p.officialName,
      localNames: p.localNames.map((l) => l.name),
      onCommonList: toDomainCommonList(p.onCommonList),
      description: p.description,
    };
  },

  async getExchangeRate(currency: Currency): Promise<ExchangeRate | null> {
    const r = await prisma.exchangeRate.findFirst({
      where: { currency: toPrismaCurrency(currency) },
      orderBy: [{ setAt: "desc" }, { createdAt: "desc" }],
    });
    if (!r) return null;
    return {
      id: r.id,
      currency: toDomainCurrency(r.currency),
      ratePerUsd: r.ratePerUsd,
      setAt: r.setAt,
      setBy: r.setBy,
      illustrative: r.illustrative,
    };
  },

  async listActiveRules(): Promise<Rule[]> {
    const rules = await prisma.rule.findMany({
      where: { status: PrismaRuleStatus.ACTIVE },
      include: {
        borders: true,
        requirements: { orderBy: { displayOrder: "asc" } },
      },
    });

    return rules.map((r) => ({
      id: r.id,
      version: r.version,
      conditions: {
        from: toDomainCountry(r.countryFrom),
        to: toDomainCountry(r.countryTo),
        borderIds: r.borders.length > 0 ? r.borders.map((b) => b.borderId) : undefined,
        commonList: r.commonList ? toDomainCommonList(r.commonList) : undefined,
        valueUsdAbove: r.valueUsdAbove ?? undefined,
        valueUsdUpTo: r.valueUsdUpTo ?? undefined,
      },
      outcome: {
        verdict: toDomainVerdict(r.verdict) as Exclude<Verdict, "cannot_confirm">,
        requirementIds: r.requirements.map((req) => req.requirementId),
      },
      sourceId: r.sourceId,
      effectiveFrom: r.effectiveFrom,
      status: "active",
      priority: r.priority,
      verifiedAt: r.verifiedAt,
      verifiedBy: r.verifiedBy,
    }));
  },

  async getRequirements(ids: readonly string[]): Promise<Requirement[]> {
    if (ids.length === 0) return [];
    const list = await prisma.requirement.findMany({
      where: { id: { in: [...ids] } },
      include: {
        sources: { orderBy: { displayOrder: "asc" } },
      },
    });

    const map = new Map(list.map((r) => [r.id, r]));
    return ids.map((id) => {
      const found = map.get(id);
      if (!found) throw new Error(`Unknown requirement "${id}"`);
      return {
        id: found.id,
        title: found.title,
        plainExplanation: found.plainExplanation,
        officialFee: found.officialFee,
        whereToObtain: found.whereToObtain,
        sourceIds: found.sources.map((s) => s.sourceId),
        caveat:
          found.caveatBody
            ? { subject: found.caveatSubject, body: found.caveatBody }
            : null,
      };
    });
  },

  async getSourcesForRequirements(requirements: readonly Requirement[]): Promise<Source[]> {
    const sourceIds = Array.from(new Set(requirements.flatMap((r) => r.sourceIds)));
    if (sourceIds.length === 0) return [];

    const sources = await prisma.source.findMany({
      where: { id: { in: sourceIds } },
    });

    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      publishedAt: s.publishedAt,
      lastVerifiedAt: s.lastVerifiedAt,
      status: toDomainSourceStatus(s.status),
      verifiedBy: s.verifiedBy,
      notes: s.notes,
    }));
  },

  async listSavedPlans(userId?: string, options?: PaginationOptions): Promise<SavedPlan[]> {
    if (!userId) return [];
    const limit = Math.min(options?.limit ?? 50, 100);

    const plans = await prisma.tradePlan.findMany({
      where: { userId },
      orderBy: { savedAt: "desc" },
      take: limit,
      include: {
        checklistItems: { orderBy: { displayOrder: "asc" } },
      },
    });

    return plans.map((p) => ({
      id: p.id,
      userId: p.userId,
      input: {
        from: toDomainCountry(p.countryFrom),
        to: toDomainCountry(p.countryTo),
        borderId: p.borderId,
        productId: p.productId,
        quantity: p.quantity,
        unit: toDomainUnit(p.unit),
        currency: toDomainCurrency(p.currency),
        valueLocal: p.valueLocal,
      },
      doneCount: p.doneCount,
      totalCount: p.totalCount,
      savedAt: p.savedAt.toISOString().slice(0, 10),
      ruleChanged: p.ruleChanged,
      verdict: toDomainVerdict(p.verdict),
      valueUsd: p.valueUsd,
      ruleId: p.ruleId,
      ruleVersion: p.ruleVersion,
      items: p.checklistItems.map((ci) => ({
        requirementId: ci.requirementId,
        title: ci.titleSnapshot,
        plainExplanation: ci.plainExplanationSnapshot,
        whereToObtain: ci.whereToObtainSnapshot,
        officialFee: ci.officialFeeSnapshot,
        trustState: ci.trustStateSnapshot as ChecklistItemView["trustState"],
        caveat: ci.caveatSnapshot ? JSON.parse(ci.caveatSnapshot) : null,
        sources: JSON.parse(ci.sourcesSnapshot),
        done: ci.done,
      })),
    }));
  },

  async getSavedPlan(id: string, userId: string): Promise<SavedPlan | null> {
    const p = await prisma.tradePlan.findFirst({
      where: { id, userId },
      include: {
        checklistItems: { orderBy: { displayOrder: "asc" } },
      },
    });
    if (!p) return null;

    return {
      id: p.id,
      userId: p.userId,
      input: {
        from: toDomainCountry(p.countryFrom),
        to: toDomainCountry(p.countryTo),
        borderId: p.borderId,
        productId: p.productId,
        quantity: p.quantity,
        unit: toDomainUnit(p.unit),
        currency: toDomainCurrency(p.currency),
        valueLocal: p.valueLocal,
      },
      doneCount: p.doneCount,
      totalCount: p.totalCount,
      savedAt: p.savedAt.toISOString().slice(0, 10),
      ruleChanged: p.ruleChanged,
      verdict: toDomainVerdict(p.verdict),
      valueUsd: p.valueUsd,
      ruleId: p.ruleId,
      ruleVersion: p.ruleVersion,
      items: p.checklistItems.map((ci) => ({
        requirementId: ci.requirementId,
        title: ci.titleSnapshot,
        plainExplanation: ci.plainExplanationSnapshot,
        whereToObtain: ci.whereToObtainSnapshot,
        officialFee: ci.officialFeeSnapshot,
        trustState: ci.trustStateSnapshot as ChecklistItemView["trustState"],
        caveat: ci.caveatSnapshot ? JSON.parse(ci.caveatSnapshot) : null,
        sources: JSON.parse(ci.sourcesSnapshot),
        done: ci.done,
      })),
    };
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
    const totalCount = items.length;
    const doneCount = items.filter((i) => i.done).length;

    const created = await prisma.$transaction(async (tx) => {
      const tp = await tx.tradePlan.create({
        data: {
          userId: plan.userId,
          countryFrom: toPrismaCountry(plan.input.from),
          countryTo: toPrismaCountry(plan.input.to),
          borderId: plan.input.borderId,
          productId: plan.input.productId,
          quantity: plan.input.quantity,
          unit: toPrismaUnit(plan.input.unit),
          valueLocal: plan.input.valueLocal,
          currency: toPrismaCurrency(plan.input.currency),
          valueUsd: plan.valueUsd,
          rateId: plan.rateId,
          rateSnapshot: plan.rateSnapshot,
          ruleId: plan.ruleId,
          ruleVersion: plan.ruleVersion,
          verdict: toPrismaVerdict(plan.verdict ?? "cannot_confirm"),
          asOf: plan.asOf,
          doneCount,
          totalCount,
          checklistItems: {
            create: items.map((item, index) => ({
              requirementId: item.requirementId,
              displayOrder: index + 1,
              done: item.done ?? false,
              titleSnapshot: item.title,
              plainExplanationSnapshot: item.plainExplanation,
              whereToObtainSnapshot: item.whereToObtain,
              officialFeeSnapshot: item.officialFee,
              trustStateSnapshot: item.trustState,
              caveatSnapshot: item.caveat ? JSON.stringify(item.caveat) : null,
              sourcesSnapshot: JSON.stringify(item.sources),
            })),
          },
        },
        include: {
          checklistItems: { orderBy: { displayOrder: "asc" } },
        },
      });

      return tp;
    });

    return {
      id: created.id,
      userId: created.userId,
      input: plan.input,
      doneCount: created.doneCount,
      totalCount: created.totalCount,
      savedAt: created.savedAt.toISOString().slice(0, 10),
      ruleChanged: created.ruleChanged,
      verdict: toDomainVerdict(created.verdict),
      valueUsd: created.valueUsd,
      ruleId: created.ruleId,
      ruleVersion: created.ruleVersion,
      items: created.checklistItems.map((ci) => ({
        requirementId: ci.requirementId,
        title: ci.titleSnapshot,
        plainExplanation: ci.plainExplanationSnapshot,
        whereToObtain: ci.whereToObtainSnapshot,
        officialFee: ci.officialFeeSnapshot,
        trustState: ci.trustStateSnapshot as ChecklistItemView["trustState"],
        caveat: ci.caveatSnapshot ? JSON.parse(ci.caveatSnapshot) : null,
        sources: JSON.parse(ci.sourcesSnapshot),
        done: ci.done,
      })),
    };
  },

  async updateChecklistItem(
    planId: string,
    requirementId: string,
    done: boolean,
    userId: string,
  ): Promise<ChecklistUpdateResult | null> {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify ownership
      const plan = await tx.tradePlan.findFirst({
        where: { id: planId, userId },
      });
      if (!plan) return null;

      // 2. Update item
      const item = await tx.checklistItem.findUnique({
        where: { planId_requirementId: { planId, requirementId } },
      });
      if (!item) return null;

      await tx.checklistItem.update({
        where: { id: item.id },
        data: { done },
      });

      // 3. Recount
      const totalCount = await tx.checklistItem.count({ where: { planId } });
      const doneCount = await tx.checklistItem.count({ where: { planId, done: true } });

      // 4. Update plan counts
      await tx.tradePlan.update({
        where: { id: planId },
        data: { doneCount, totalCount },
      });

      return { doneCount, totalCount, done };
    });
  },

  async deleteSavedPlan(id: string, userId: string): Promise<boolean> {
    const plan = await prisma.tradePlan.findFirst({ where: { id, userId } });
    if (!plan) return false;

    await prisma.tradePlan.delete({ where: { id } });
    return true;
  },

  async createAuditLog(log: {
    actorId?: string | null;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId: log.actorId ?? null,
        actorRole: (log.actorRole as PrismaUserRole) || PrismaUserRole.ADMIN,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
      },
    });
  },

  async listAuditLogs(
    options?: PaginationOptions & { entityType?: string },
  ): Promise<AuditLogEntry[]> {
    const logs = await prisma.auditLog.findMany({
      where: options?.entityType ? { entityType: options.entityType } : undefined,
      orderBy: { createdAt: "desc" },
      take: Math.min(options?.limit ?? 50, 100),
    });

    return logs.map((l) => ({
      id: l.id,
      actorId: l.actorId,
      actorRole: l.actorRole,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    }));
  },

  async createRuleVersion(rule: Rule, actorId: string): Promise<Rule> {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.rule.create({
        data: {
          id: rule.id,
          version: rule.version,
          countryFrom: toPrismaCountry(rule.conditions.from),
          countryTo: toPrismaCountry(rule.conditions.to),
          commonList: toPrismaCommonList(rule.conditions.commonList),
          valueUsdAbove: rule.conditions.valueUsdAbove,
          valueUsdUpTo: rule.conditions.valueUsdUpTo,
          verdict: toPrismaVerdict(rule.outcome.verdict),
          sourceId: rule.sourceId,
          effectiveFrom: rule.effectiveFrom,
          status: PrismaRuleStatus.ACTIVE,
          priority: rule.priority,
          verifiedAt: rule.verifiedAt,
          verifiedBy: rule.verifiedBy ?? actorId,
          borders: rule.conditions.borderIds
            ? {
                create: rule.conditions.borderIds.map((bid) => ({
                  borderId: bid,
                })),
              }
            : undefined,
          requirements: {
            create: rule.outcome.requirementIds.map((reqId, idx) => ({
              requirementId: reqId,
              displayOrder: idx + 1,
            })),
          },
        },
        include: {
          borders: true,
          requirements: { orderBy: { displayOrder: "asc" } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: PrismaUserRole.ADMIN,
          action: "CREATE_RULE_VERSION",
          entityType: "RULE",
          entityId: `${rule.id}@v${rule.version}`,
          details: JSON.stringify(rule),
        },
      });

      return {
        id: created.id,
        version: created.version,
        conditions: {
          from: toDomainCountry(created.countryFrom),
          to: toDomainCountry(created.countryTo),
          borderIds: created.borders.map((b) => b.borderId),
          commonList: created.commonList ? toDomainCommonList(created.commonList) : undefined,
          valueUsdAbove: created.valueUsdAbove ?? undefined,
          valueUsdUpTo: created.valueUsdUpTo ?? undefined,
        },
        outcome: {
          verdict: toDomainVerdict(created.verdict) as Exclude<Verdict, "cannot_confirm">,
          requirementIds: created.requirements.map((r) => r.requirementId),
        },
        sourceId: created.sourceId,
        effectiveFrom: created.effectiveFrom,
        status: "active",
        priority: created.priority,
        verifiedAt: created.verifiedAt,
        verifiedBy: created.verifiedBy,
      };
    });
  },

  async createRequirementRecord(req: Requirement, actorId: string): Promise<Requirement> {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.requirement.create({
        data: {
          id: req.id,
          title: req.title,
          plainExplanation: req.plainExplanation,
          officialFee: req.officialFee,
          whereToObtain: req.whereToObtain,
          caveatSubject: req.caveat?.subject,
          caveatBody: req.caveat?.body,
          sources: {
            create: req.sourceIds.map((sid, index) => ({
              sourceId: sid,
              displayOrder: index + 1,
            })),
          },
        },
        include: {
          sources: { orderBy: { displayOrder: "asc" } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: PrismaUserRole.ADMIN,
          action: "CREATE_REQUIREMENT",
          entityType: "REQUIREMENT",
          entityId: req.id,
          details: JSON.stringify(req),
        },
      });

      return {
        id: created.id,
        title: created.title,
        plainExplanation: created.plainExplanation,
        officialFee: created.officialFee,
        whereToObtain: created.whereToObtain,
        sourceIds: created.sources.map((s) => s.sourceId),
        caveat: created.caveatBody
          ? { subject: created.caveatSubject, body: created.caveatBody }
          : null,
      };
    });
  },

  async createSourceRecord(src: Source, actorId: string): Promise<Source> {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.source.create({
        data: {
          id: src.id,
          name: src.name,
          url: src.url,
          publishedAt: src.publishedAt,
          lastVerifiedAt: src.lastVerifiedAt,
          status: src.status === "verified"
            ? PrismaSourceStatus.VERIFIED
            : src.status === "conflicting"
              ? PrismaSourceStatus.CONFLICTING
              : PrismaSourceStatus.UNVERIFIED,
          verifiedBy: src.verifiedBy ?? actorId,
          notes: src.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: PrismaUserRole.ADMIN,
          action: "CREATE_SOURCE",
          entityType: "SOURCE",
          entityId: src.id,
          details: JSON.stringify(src),
        },
      });

      return {
        id: created.id,
        name: created.name,
        url: created.url,
        publishedAt: created.publishedAt,
        lastVerifiedAt: created.lastVerifiedAt,
        status: toDomainSourceStatus(created.status),
        verifiedBy: created.verifiedBy,
        notes: created.notes,
      };
    });
  },

  async createExchangeRateSnapshot(rate: ExchangeRate, actorId: string): Promise<ExchangeRate> {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.exchangeRate.create({
        data: {
          id: rate.id,
          currency: toPrismaCurrency(rate.currency),
          ratePerUsd: rate.ratePerUsd,
          setAt: rate.setAt,
          setBy: rate.setBy ?? actorId,
          illustrative: rate.illustrative ?? false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: PrismaUserRole.ADMIN,
          action: "SNAPSHOT_EXCHANGE_RATE",
          entityType: "EXCHANGE_RATE",
          entityId: created.id,
          details: JSON.stringify(rate),
        },
      });

      return {
        id: created.id,
        currency: toDomainCurrency(created.currency),
        ratePerUsd: created.ratePerUsd,
        setAt: created.setAt,
        setBy: created.setBy,
        illustrative: created.illustrative,
      };
    });
  },
};
