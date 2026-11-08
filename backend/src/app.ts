import cors from "cors";
import { randomUUID } from "node:crypto";
import express, { type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import {
  CountryCode as PrismaCountryCode,
  CommonListStatus as PrismaCommonListStatus,
  Currency as PrismaCurrency,
  Prisma,
  RuleStatus as PrismaRuleStatus,
  SourceStatus as PrismaSourceStatus,
  Unit as PrismaUnit,
  UserRole as PrismaUserRole,
  Verdict as PrismaVerdict,
} from "@prisma/client";
import { allowedOrigins, config } from "./config.js";
import { prisma } from "./db.js";
import { errorHandler, requestId, sendError } from "./http.js";
import { authenticate, requireAdmin } from "./auth.js";
import { createPreview, getStrThreshold, previewInputSchema } from "./preview.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", config.NODE_ENV === "production" ? 1 : false);
app.use(requestId);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  hsts: config.NODE_ENV === "production" ? undefined : false,
}));
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    sendError(req, res, 403, "ORIGIN_NOT_ALLOWED", "Origin is not allowed.");
    return;
  }
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, origin ?? false);
      return;
    }
    callback(new Error("Origin is not allowed."));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Request-Id"],
  maxAge: 600,
}));
app.use(express.json({ limit: "32kb", strict: true }));

const publicReadLimit = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => sendError(req, res, 429, "RATE_LIMITED", "Too many requests."),
});
const previewLimit = rateLimit({
  windowMs: 60_000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => sendError(req, res, 429, "RATE_LIMITED", "Too many preview requests."),
});
const savePlanLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => sendError(req, res, 429, "RATE_LIMITED", "Too many save requests."),
});
const checklistLimit = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => sendError(req, res, 429, "RATE_LIMITED", "Too many checklist updates."),
});
const adminMutationLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => sendError(req, res, 429, "RATE_LIMITED", "Too many admin requests."),
});
const paramId = z.string().min(1).max(80);
const requireAllowedOrigin: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  if (!origin || !allowedOrigins.has(origin)) {
    sendError(req, res, 403, "ORIGIN_NOT_ALLOWED", "A permitted Origin header is required.");
    return;
  }
  next();
};

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch (error) {
    console.error(JSON.stringify({
      event: "readiness_check_failed",
      requestId: req.requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    sendError(req, res, 503, "DEPENDENCY_UNAVAILABLE", "The database is not ready.");
  }
});
app.use("/api/v1", publicReadLimit);

app.get("/api/v1/borders", async (req, res, next) => {
  try {
    const active = z.enum(["true", "false"]).default("true").parse(req.query.active);
    const borders = await prisma.border.findMany({
      where: active === "true" ? { active: true } : undefined,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ data: borders.map((border) => ({
      id: border.id,
      name: border.name,
      countries: [border.countryFrom, border.countryTo],
      note: border.note,
      active: border.active,
      deskContact: null,
    })) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/borders/:id", async (req, res, next) => {
  try {
    const id = paramId.parse(req.params.id);
    const border = await prisma.border.findUnique({ where: { id } });
    if (!border || !border.active) {
      sendError(req, res, 404, "NOT_FOUND", "Border not found.");
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ data: {
      id: border.id,
      name: border.name,
      countries: [border.countryFrom, border.countryTo],
      note: border.note,
      active: border.active,
      deskContact: null,
    } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/products", async (req, res, next) => {
  try {
    const query = z.string().trim().max(60).default("").parse(req.query.q);
    const limit = z.coerce.number().int().min(1).max(50).default(20).parse(req.query.limit);
    const cursor = req.query.cursor === undefined ? undefined : paramId.parse(req.query.cursor);
    const normalized = query.replace(/\s+/g, " ");
    const where = normalized
      ? {
          OR: [
            { officialName: { contains: normalized, mode: "insensitive" as const } },
            { localNames: { some: { name: { contains: normalized, mode: "insensitive" as const } } } },
          ],
        }
      : undefined;
    if (cursor) {
      const cursorProduct = await prisma.product.findFirst({
        where: { id: cursor, ...(where ?? {}) },
        select: { id: true },
      });
      if (!cursorProduct) {
        sendError(req, res, 400, "INVALID_CURSOR", "Cursor does not match this product search.");
        return;
      }
    }
    const products = await prisma.product.findMany({
      where,
      include: { localNames: { orderBy: [{ name: "asc" }, { id: "asc" }] } },
      orderBy: [{ officialName: "asc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = products.length > limit;
    const page = hasMore ? products.slice(0, limit) : products;
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    res.json({
      data: page.map((product) => ({
        id: product.id,
        officialName: product.officialName,
        localNames: product.localNames.map((name) => name.name),
        onCommonList: product.onCommonList.toLowerCase(),
        description: product.description,
      })),
      meta: { nextCursor: hasMore ? page.at(-1)?.id ?? null : null },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/products/:id", async (req, res, next) => {
  try {
    const id = paramId.parse(req.params.id);
    const product = await prisma.product.findUnique({
      where: { id },
      include: { localNames: { orderBy: [{ name: "asc" }, { id: "asc" }] } },
    });
    if (!product) {
      sendError(req, res, 404, "NOT_FOUND", "Product not found.");
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ data: {
      id: product.id,
      officialName: product.officialName,
      localNames: product.localNames.map((name) => name.name),
      onCommonList: product.onCommonList.toLowerCase(),
      description: product.description,
    } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/exchange-rates/:currency", async (req, res, next) => {
  try {
    const currency = z.enum(["KES", "UGX"]).parse(req.params.currency ?? "");
    const rate = await prisma.exchangeRate.findFirst({
      where: {
        currency: currency === "KES" ? "KES" : "UGX",
        setAt: { lte: new Date().toISOString().slice(0, 10) },
      },
      orderBy: [{ setAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
    });
    if (!rate) {
      sendError(req, res, 404, "RATE_NOT_FOUND", "No exchange rate is available.");
      return;
    }
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ data: {
      id: rate.id,
      currency: rate.currency,
      ratePerUsd: rate.ratePerUsd,
      setAt: rate.setAt,
      illustrative: rate.illustrative,
      usableForEvaluation:
        !rate.illustrative &&
        config.EXCHANGE_RATE_MAX_AGE_DAYS !== undefined &&
        Date.now() >= Date.parse(rate.setAt) &&
        Date.now() - Date.parse(rate.setAt) <= config.EXCHANGE_RATE_MAX_AGE_DAYS * 86_400_000,
    } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/thresholds/str", async (req, res, next) => {
  try {
    const input = z.object({
      from: z.enum(["KE", "UG"]),
      to: z.enum(["KE", "UG"]),
      borderId: z.string().min(1).max(50),
    }).strict().parse(req.query);
    if (input.from === input.to) {
      sendError(req, res, 422, "ROUTE_MISMATCH", "Choose two different countries.");
      return;
    }
    const border = await prisma.border.findUnique({ where: { id: input.borderId } });
    if (!border || !border.active) {
      sendError(req, res, 404, "NOT_FOUND", "Border not found.");
      return;
    }
    if (border.countryFrom !== input.from || border.countryTo !== input.to) {
      sendError(req, res, 422, "ROUTE_MISMATCH", "The selected border does not match the route.");
      return;
    }
    const threshold = await getStrThreshold(input);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ data: { threshold } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/plan-previews", previewLimit, async (req, res, next) => {
  try {
    const input = previewInputSchema.parse(req.body);
    const result = await createPreview(input);
    if (result.status !== 200) {
      sendError(req, res, result.status, result.code, result.message);
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ data: result.data });
  } catch (error) {
    next(error);
  }
});

const privateNoStore: RequestHandler = (_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  next();
};
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const sourceInputSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  url: z.string().url().nullable().optional(),
  publishedAt: isoDateSchema.nullable().optional(),
  lastVerifiedAt: isoDateSchema.nullable().optional(),
  status: z.enum(["verified", "unverified", "conflicting"]).default("unverified"),
  notes: z.string().nullable().optional(),
}).strict();
const requirementInputSchema = z.object({
  id: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  plainExplanation: z.string().min(1),
  officialFee: z.string().nullable().optional(),
  whereToObtain: z.string().nullable().optional(),
  sourceIds: z.array(z.string().min(1).max(50)).min(1),
  caveat: z.object({
    subject: z.string().nullable(),
    body: z.string().min(1),
  }).nullable().optional(),
}).strict();
const ruleInputSchema = z.object({
  id: z.string().min(1).max(50),
  version: z.number().int().positive(),
  from: z.enum(["KE", "UG"]),
  to: z.enum(["KE", "UG"]),
  borderIds: z.array(z.string().min(1).max(50)).optional(),
  commonList: z.enum(["yes", "no", "unknown"]).optional(),
  valueUsdAbove: z.number().positive().optional(),
  valueUsdUpTo: z.number().positive().optional(),
  verdict: z.enum(["likely_str_eligible", "above_threshold", "not_on_common_list"]),
  requirementIds: z.array(z.string().min(1).max(50)),
  sourceId: z.string().min(1).max(50),
  effectiveFrom: isoDateSchema,
  status: z.enum(["active", "draft", "retired"]).default("active"),
  priority: z.number().int().default(0),
  verifiedAt: isoDateSchema.optional(),
}).strict();
const exchangeRateInputSchema = z.object({
  currency: z.enum(["KES", "UGX"]),
  ratePerUsd: z.number().positive().finite(),
  setAt: isoDateSchema,
  illustrative: z.boolean().default(false),
}).strict();
const auditQuerySchema = z.object({
  entityType: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

const approvedSourceDomains = [
  "kra.go.ke",
  "kratv.kra.go.ke",
  "trademarkafrica.com",
  "erra.trademarkafrica.com",
  "comesa.int",
  "eac.int",
  "customs.eac.int",
  "tradeportal.eac.int",
  "povertyactionlab.org",
  "theigc.org",
  "eprcug.org",
  "ura.go.ug",
  "eabc-online.com",
];
function isApprovedSourceUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      approvedSourceDomains.some((domain) =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      );
  } catch {
    return false;
  }
}

app.post(
  "/api/v1/admin/sources",
  privateNoStore,
  requireAllowedOrigin,
  adminMutationLimit,
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const input = sourceInputSchema.parse(req.body);
      if (input.status === "verified") {
        const verifiedAt = input.lastVerifiedAt ? Date.parse(`${input.lastVerifiedAt}T00:00:00.000Z`) : NaN;
        const age = Date.now() - verifiedAt;
        if (
          !isApprovedSourceUrl(input.url) ||
          !Number.isFinite(verifiedAt) ||
          age < 0 ||
          age > (config.SOURCE_MAX_AGE_DAYS ?? 30) * 86_400_000
        ) {
          sendError(req, res, 400, "INVALID_VERIFIED_SOURCE",
            "A verified source needs an approved HTTPS URL and a current verification date.");
          return;
        }
      }

      const actorId = req.authUser!.id;
      const sourceStatus = input.status === "verified"
        ? PrismaSourceStatus.VERIFIED
        : input.status === "conflicting"
          ? PrismaSourceStatus.CONFLICTING
          : PrismaSourceStatus.UNVERIFIED;
      const source = await prisma.$transaction(async (tx) => {
        const created = await tx.source.create({
          data: {
            id: input.id,
            name: input.name,
            url: input.url ?? null,
            publishedAt: input.publishedAt ?? null,
            lastVerifiedAt: input.lastVerifiedAt ?? null,
            status: sourceStatus,
            verifiedBy: actorId,
            notes: input.notes ?? null,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            actorRole: PrismaUserRole.ADMIN,
            action: "CREATE_SOURCE",
            entityType: "SOURCE",
            entityId: created.id,
            details: JSON.stringify(input),
          },
        });
        return created;
      });
      res.status(201).json({ data: {
        id: source.id,
        name: source.name,
        url: source.url,
        publishedAt: source.publishedAt,
        lastVerifiedAt: source.lastVerifiedAt,
        status: source.status.toLowerCase(),
        verifiedBy: source.verifiedBy,
        notes: source.notes,
      } });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/v1/admin/requirements",
  privateNoStore,
  requireAllowedOrigin,
  adminMutationLimit,
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const input = requirementInputSchema.parse(req.body);
      if (new Set(input.sourceIds).size !== input.sourceIds.length) {
        sendError(req, res, 400, "INVALID_REQUIREMENT", "Source IDs must be unique.");
        return;
      }
      const existingSources = await prisma.source.findMany({
        where: { id: { in: input.sourceIds } },
        select: { id: true },
      });
      if (existingSources.length !== input.sourceIds.length) {
        sendError(req, res, 400, "INVALID_REQUIREMENT", "Every source ID must reference an existing source.");
        return;
      }
      const actorId = req.authUser!.id;
      const requirement = await prisma.$transaction(async (tx) => {
        const created = await tx.requirement.create({
          data: {
            id: input.id,
            title: input.title,
            plainExplanation: input.plainExplanation,
            officialFee: input.officialFee ?? null,
            whereToObtain: input.whereToObtain ?? null,
            caveatSubject: input.caveat?.subject ?? null,
            caveatBody: input.caveat?.body ?? null,
            sources: {
              create: input.sourceIds.map((sourceId, displayOrder) => ({ sourceId, displayOrder })),
            },
          },
          include: { sources: { orderBy: [{ displayOrder: "asc" }, { sourceId: "asc" }] } },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            actorRole: PrismaUserRole.ADMIN,
            action: "CREATE_REQUIREMENT",
            entityType: "REQUIREMENT",
            entityId: created.id,
            details: JSON.stringify(input),
          },
        });
        return created;
      });
      res.status(201).json({ data: {
        id: requirement.id,
        title: requirement.title,
        plainExplanation: requirement.plainExplanation,
        officialFee: requirement.officialFee,
        whereToObtain: requirement.whereToObtain,
        sourceIds: requirement.sources.map((link) => link.sourceId),
        caveat: requirement.caveatBody
          ? { subject: requirement.caveatSubject, body: requirement.caveatBody }
          : null,
      } });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/v1/admin/rules",
  privateNoStore,
  requireAllowedOrigin,
  adminMutationLimit,
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const input = ruleInputSchema.parse(req.body);
      if (
        input.from === input.to ||
        (input.valueUsdAbove !== undefined && input.valueUsdUpTo !== undefined &&
          input.valueUsdAbove >= input.valueUsdUpTo) ||
        new Set(input.borderIds ?? []).size !== (input.borderIds ?? []).length ||
        new Set(input.requirementIds).size !== input.requirementIds.length
      ) {
        sendError(req, res, 400, "INVALID_RULE", "Rule route, thresholds, or linked IDs are inconsistent.");
        return;
      }
      const [source, requirements, borders] = await Promise.all([
        prisma.source.findUnique({ where: { id: input.sourceId } }),
        prisma.requirement.findMany({
          where: { id: { in: input.requirementIds } },
          select: { id: true },
        }),
        prisma.border.findMany({
          where: { id: { in: input.borderIds ?? [] } },
          select: { id: true },
        }),
      ]);
      if (!source || requirements.length !== input.requirementIds.length ||
        borders.length !== (input.borderIds ?? []).length) {
        sendError(req, res, 400, "INVALID_RULE", "Rule source, requirements, and borders must exist.");
        return;
      }
      const actorId = req.authUser!.id;
      const commonList = input.commonList
        ? input.commonList === "yes"
          ? PrismaCommonListStatus.YES
          : input.commonList === "no"
            ? PrismaCommonListStatus.NO
            : PrismaCommonListStatus.UNKNOWN
        : null;
      const verdict = ({
        likely_str_eligible: PrismaVerdict.LIKELY_STR_ELIGIBLE,
        above_threshold: PrismaVerdict.ABOVE_THRESHOLD,
        not_on_common_list: PrismaVerdict.NOT_ON_COMMON_LIST,
      } as const)[input.verdict];
      const status = ({
        active: PrismaRuleStatus.ACTIVE,
        draft: PrismaRuleStatus.DRAFT,
        retired: PrismaRuleStatus.RETIRED,
      } as const)[input.status];
      const rule = await prisma.$transaction(async (tx) => {
        const created = await tx.rule.create({
          data: {
            id: input.id,
            version: input.version,
            countryFrom: countryEnum(input.from),
            countryTo: countryEnum(input.to),
            commonList,
            valueUsdAbove: input.valueUsdAbove ?? null,
            valueUsdUpTo: input.valueUsdUpTo ?? null,
            verdict,
            sourceId: input.sourceId,
            effectiveFrom: input.effectiveFrom,
            status,
            priority: input.priority,
            verifiedAt: input.verifiedAt ?? null,
            verifiedBy: actorId,
            borders: {
              create: (input.borderIds ?? []).map((borderId) => ({ borderId })),
            },
            requirements: {
              create: input.requirementIds.map((requirementId, displayOrder) => ({
                requirementId,
                displayOrder,
              })),
            },
          },
          include: {
            borders: { orderBy: { borderId: "asc" } },
            requirements: { orderBy: [{ displayOrder: "asc" }, { requirementId: "asc" }] },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            actorRole: PrismaUserRole.ADMIN,
            action: "CREATE_RULE_VERSION",
            entityType: "RULE",
            entityId: `${created.id}@v${created.version}`,
            details: JSON.stringify(input),
          },
        });
        return created;
      });
      res.status(201).json({ data: {
        id: rule.id,
        version: rule.version,
        conditions: {
          from: rule.countryFrom,
          to: rule.countryTo,
          borderIds: rule.borders.map((link) => link.borderId),
          ...(rule.commonList ? { commonList: rule.commonList.toLowerCase() } : {}),
          ...(rule.valueUsdAbove !== null ? { valueUsdAbove: rule.valueUsdAbove } : {}),
          ...(rule.valueUsdUpTo !== null ? { valueUsdUpTo: rule.valueUsdUpTo } : {}),
        },
        outcome: {
          verdict: rule.verdict.toLowerCase(),
          requirementIds: rule.requirements.map((link) => link.requirementId),
        },
        sourceId: rule.sourceId,
        effectiveFrom: rule.effectiveFrom,
        status: rule.status.toLowerCase(),
        priority: rule.priority,
        verifiedAt: rule.verifiedAt,
        verifiedBy: rule.verifiedBy,
      } });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/api/v1/admin/exchange-rates",
  privateNoStore,
  requireAllowedOrigin,
  adminMutationLimit,
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const input = exchangeRateInputSchema.parse(req.body);
      const date = Date.parse(`${input.setAt}T00:00:00.000Z`);
      if (!Number.isFinite(date) || date > Date.now()) {
        sendError(req, res, 400, "INVALID_RATE", "Rate date must be a valid date no later than today.");
        return;
      }
      const actorId = req.authUser!.id;
      const rate = await prisma.$transaction(async (tx) => {
        const created = await tx.exchangeRate.create({
          data: {
            id: `rate_${randomUUID()}`,
            currency: input.currency === "KES" ? PrismaCurrency.KES : PrismaCurrency.UGX,
            ratePerUsd: input.ratePerUsd,
            setAt: input.setAt,
            setBy: actorId,
            illustrative: input.illustrative,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            actorRole: PrismaUserRole.ADMIN,
            action: "SNAPSHOT_EXCHANGE_RATE",
            entityType: "EXCHANGE_RATE",
            entityId: created.id,
            details: JSON.stringify(input),
          },
        });
        return created;
      });
      res.status(201).json({ data: {
        id: rate.id,
        currency: rate.currency,
        ratePerUsd: rate.ratePerUsd,
        setAt: rate.setAt,
        setBy: rate.setBy,
        illustrative: rate.illustrative,
      } });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  "/api/v1/admin/audit-logs",
  privateNoStore,
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const { entityType, limit } = auditQuerySchema.parse(req.query);
      const logs = await prisma.auditLog.findMany({
        where: entityType ? { entityType } : undefined,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
      });
      res.json({
        data: logs.map((log) => ({
          id: log.id,
          actorId: log.actorId,
          actorRole: log.actorRole,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          details: log.details,
          createdAt: log.createdAt.toISOString(),
        })),
        meta: { count: logs.length },
      });
    } catch (error) {
      next(error);
    }
  },
);

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(80).optional(),
}).strict();
const doneSchema = z.object({ done: z.boolean() }).strict();
const savedPlanIncludes = {
  checklistItems: {
    orderBy: [{ displayOrder: "asc" as const }, { requirementId: "asc" as const }],
  },
};

function parseSnapshot(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function savedPlanDto(
  plan: Prisma.TradePlanGetPayload<{ include: typeof savedPlanIncludes }>,
) {
  return {
    id: plan.id,
    input: {
      from: plan.countryFrom,
      to: plan.countryTo,
      borderId: plan.borderId,
      productId: plan.productId,
      quantity: plan.quantity,
      unit: plan.unit.toLowerCase(),
      currency: plan.currency,
      valueLocal: plan.valueLocal,
    },
    valueUsd: plan.valueUsd,
    rateId: plan.rateId,
    rateSnapshot: parseSnapshot(plan.rateSnapshot),
    verdict: plan.verdict.toLowerCase(),
    ruleId: plan.ruleId,
    ruleVersion: plan.ruleVersion,
    asOf: plan.asOf,
    doneCount: plan.doneCount,
    totalCount: plan.totalCount,
    savedAt: plan.savedAt.toISOString(),
    ruleChanged: plan.ruleChanged,
    items: plan.checklistItems.map((item) => ({
      requirementId: item.requirementId,
      title: item.titleSnapshot,
      plainExplanation: item.plainExplanationSnapshot,
      officialFee: item.officialFeeSnapshot,
      whereToObtain: item.whereToObtainSnapshot,
      trustState: item.trustStateSnapshot.toLowerCase(),
      caveat: item.caveatSnapshot ? parseSnapshot(item.caveatSnapshot) : null,
      sources: parseSnapshot(item.sourcesSnapshot),
      done: item.done,
    })),
  };
}

function countryEnum(value: "KE" | "UG") {
  return value === "KE" ? PrismaCountryCode.KE : PrismaCountryCode.UG;
}

function unitEnum(value: "bags" | "kilograms" | "crates") {
  return value === "bags" ? PrismaUnit.BAGS : value === "kilograms" ? PrismaUnit.KILOGRAMS : PrismaUnit.CRATES;
}

function verdictEnum(value: string) {
  const verdicts: Record<string, PrismaVerdict> = {
    likely_str_eligible: PrismaVerdict.LIKELY_STR_ELIGIBLE,
    above_threshold: PrismaVerdict.ABOVE_THRESHOLD,
    not_on_common_list: PrismaVerdict.NOT_ON_COMMON_LIST,
    cannot_confirm: PrismaVerdict.CANNOT_CONFIRM,
  };
  return verdicts[value] ?? PrismaVerdict.CANNOT_CONFIRM;
}

app.get("/api/v1/saved-plans", privateNoStore, authenticate, async (req, res, next) => {
  try {
    const user = req.authUser;
    if (!user) {
      sendError(req, res, 401, "UNAUTHORIZED", "Authentication required.");
      return;
    }
    const { limit, cursor } = listQuerySchema.parse(req.query);
    if (cursor) {
      const cursorPlan = await prisma.tradePlan.findFirst({
        where: { id: cursor, userId: user.id },
        select: { id: true },
      });
      if (!cursorPlan) {
        sendError(req, res, 400, "INVALID_CURSOR", "Cursor does not reference one of your saved plans.");
        return;
      }
    }
    const plans = await prisma.tradePlan.findMany({
      where: { userId: user.id },
      orderBy: [{ savedAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: savedPlanIncludes,
    });
    const hasMore = plans.length > limit;
    const page = hasMore ? plans.slice(0, limit) : plans;
    res.json({
      data: page.map(savedPlanDto),
      meta: { nextCursor: hasMore ? page.at(-1)?.id ?? null : null },
    });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/v1/saved-plans",
  privateNoStore,
  requireAllowedOrigin,
  savePlanLimit,
  authenticate,
  async (req, res, next) => {
  try {
    const user = req.authUser;
    if (!user) {
      sendError(req, res, 401, "UNAUTHORIZED", "Authentication required.");
      return;
    }
    const input = previewInputSchema.parse(req.body);
    const preview = await createPreview(input);
    if (preview.status !== 200) {
      sendError(req, res, preview.status, preview.code, preview.message);
      return;
    }
    const result = preview.data;
    const plan = await prisma.$transaction(async (tx) => tx.tradePlan.create({
      data: {
        userId: user.id,
        countryFrom: countryEnum(input.from),
        countryTo: countryEnum(input.to),
        borderId: input.borderId,
        productId: input.productId,
        quantity: input.quantity,
        unit: unitEnum(input.unit),
        valueLocal: input.valueLocal,
        currency: input.currency === "KES" ? PrismaCurrency.KES : PrismaCurrency.UGX,
        valueUsd: result.valueUsd,
        rateId: result.rate?.id ?? null,
        rateSnapshot: JSON.stringify(result.rate),
        ruleId: result.ruleId,
        ruleVersion: result.ruleVersion,
        verdict: verdictEnum(result.verdict),
        asOf: result.asOf,
        totalCount: result.items.length,
        doneCount: 0,
        checklistItems: {
          create: result.items.map((item, index) => ({
            requirementId: item.requirementId,
            displayOrder: index,
            done: false,
            titleSnapshot: item.title,
            plainExplanationSnapshot: item.plainExplanation,
            officialFeeSnapshot: item.officialFee,
            whereToObtainSnapshot: item.whereToObtain,
            trustStateSnapshot: item.trustState.toUpperCase(),
            caveatSnapshot: item.caveat ? JSON.stringify(item.caveat) : null,
            sourcesSnapshot: JSON.stringify(item.sources),
          })),
        },
      },
      include: savedPlanIncludes,
    }));
    res.status(201).json({ data: savedPlanDto(plan) });
  } catch (error) {
    next(error);
  }
  },
);

app.get("/api/v1/saved-plans/:id", privateNoStore, authenticate, async (req, res, next) => {
  try {
    const user = req.authUser;
    if (!user) {
      sendError(req, res, 401, "UNAUTHORIZED", "Authentication required.");
      return;
    }
    const id = paramId.parse(req.params.id ?? "");
    const plan = await prisma.tradePlan.findFirst({
      where: { id, userId: user.id },
      include: savedPlanIncludes,
    });
    if (!plan) {
      sendError(req, res, 404, "NOT_FOUND", "Saved plan not found.");
      return;
    }
    res.json({ data: savedPlanDto(plan) });
  } catch (error) {
    next(error);
  }
});

app.delete(
  "/api/v1/saved-plans/:id",
  privateNoStore,
  requireAllowedOrigin,
  savePlanLimit,
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) {
        sendError(req, res, 401, "UNAUTHORIZED", "Authentication required.");
        return;
      }
      const id = paramId.parse(req.params.id ?? "");
      const deleted = await prisma.tradePlan.deleteMany({
        where: { id, userId: user.id },
      });
      if (deleted.count === 0) {
        sendError(req, res, 404, "NOT_FOUND", "Saved plan not found.");
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/v1/saved-plans/:id/checklist-items/:requirementId",
  privateNoStore,
  requireAllowedOrigin,
  checklistLimit,
  authenticate,
  async (req, res, next) => {
    try {
      const user = req.authUser;
      if (!user) {
        sendError(req, res, 401, "UNAUTHORIZED", "Authentication required.");
        return;
      }
      const id = paramId.parse(req.params.id ?? "");
      const requirementId = paramId.parse(req.params.requirementId ?? "");
      const { done } = doneSchema.parse(req.body);
      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.checklistItem.findFirst({
          where: { planId: id, requirementId, plan: { userId: user.id } },
          select: { id: true },
        });
        if (!item) return null;
        await tx.checklistItem.update({ where: { id: item.id }, data: { done } });
        const [doneCount, totalCount] = await Promise.all([
          tx.checklistItem.count({ where: { planId: id, done: true } }),
          tx.checklistItem.count({ where: { planId: id } }),
        ]);
        await tx.tradePlan.update({ where: { id }, data: { doneCount, totalCount } });
        return { doneCount, totalCount, done };
      });
      if (!result) {
        sendError(req, res, 404, "NOT_FOUND", "Saved plan checklist item not found.");
        return;
      }
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

app.use((_req, res) => {
  sendError(_req, res, 404, "NOT_FOUND", "Endpoint not found.");
});
app.use(errorHandler);

export { app };
