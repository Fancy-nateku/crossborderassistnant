import {
  CommonListStatus,
  RuleStatus,
  SourceStatus,
  Verdict,
} from "@prisma/client";
import { Decimal } from "decimal.js";
import { z } from "zod";
import { config } from "./config.js";
import { prisma } from "./db.js";
import {
  selectApplicableRule,
  selectThresholdRule,
  type ApplicableRule,
} from "./domain/evaluation.js";

export const previewInputSchema = z.object({
  from: z.enum(["KE", "UG"]),
  to: z.enum(["KE", "UG"]),
  borderId: z.string().min(1).max(50),
  productId: z.string().min(1).max(80).nullable(),
  quantity: z.number().int().positive().max(1_000_000_000).nullable(),
  unit: z.enum(["bags", "kilograms", "crates"]),
  currency: z.enum(["KES", "UGX"]),
  valueLocal: z.number().int().positive().max(1_000_000_000_000),
}).strict();

export type PreviewInput = z.infer<typeof previewInputSchema>;

const commonListToValue: Record<CommonListStatus, "yes" | "no" | "unknown"> = {
  YES: "yes",
  NO: "no",
  UNKNOWN: "unknown",
};

const verdictToValue: Record<Verdict, ApplicableRule["verdict"]> = {
  LIKELY_STR_ELIGIBLE: "likely_str_eligible",
  ABOVE_THRESHOLD: "above_threshold",
  NOT_ON_COMMON_LIST: "not_on_common_list",
  CANNOT_CONFIRM: "cannot_confirm",
};

function trustState(
  sources: Array<{ status: SourceStatus; lastVerifiedAt: string | null }>,
  asOf: Date,
): "verified" | "unverified" | "conflicting" | "unknown" {
  if (!sources.length) return "unknown";
  if (sources.some((source) => source.status === SourceStatus.CONFLICTING)) return "conflicting";
  if (sources.some((source) => source.status === SourceStatus.UNVERIFIED || !source.lastVerifiedAt)) {
    return "unverified";
  }
  if (sources.some((source) => {
    const verifiedAt = Date.parse(source.lastVerifiedAt!);
    return !Number.isFinite(verifiedAt) || verifiedAt > asOf.getTime();
  })) {
    return "unverified";
  }
  if (config.SOURCE_MAX_AGE_DAYS !== undefined) {
    const maxAge = config.SOURCE_MAX_AGE_DAYS * 86_400_000;
    if (sources.some((source) => {
      const verifiedAt = Date.parse(source.lastVerifiedAt!);
      return !Number.isFinite(verifiedAt) || asOf.getTime() - verifiedAt > maxAge;
    })) {
      return "unverified";
    }
  }
  return "verified";
}

const disclaimer =
  "Informational guidance based on referenced sources. Not a customs authority, legal adviser or government service. Check requirements with the official authority before you trade.";

function safeHttpsUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

async function loadApplicableRules(): Promise<ApplicableRule[]> {
  const rules = await prisma.rule.findMany({
    where: { status: RuleStatus.ACTIVE },
    include: {
      source: { select: { status: true, lastVerifiedAt: true, url: true } },
      borders: { select: { borderId: true } },
      requirements: { orderBy: [{ displayOrder: "asc" }, { requirementId: "asc" }] },
    },
  });
  return rules.map((rule) => ({
    id: rule.id,
    version: rule.version,
    countryFrom: rule.countryFrom,
    countryTo: rule.countryTo,
    commonList: rule.commonList ? commonListToValue[rule.commonList] : null,
    valueUsdAbove: rule.valueUsdAbove,
    valueUsdUpTo: rule.valueUsdUpTo,
    verdict: verdictToValue[rule.verdict],
    effectiveFrom: rule.effectiveFrom,
    priority: rule.priority,
    borders: rule.borders,
    source: {
      status: rule.source.status,
      lastVerifiedAt: rule.source.lastVerifiedAt,
      url: rule.source.url,
    },
    requirements: rule.requirements,
  }));
}

export async function getStrThreshold(
  input: { from: "KE" | "UG"; to: "KE" | "UG"; borderId: string },
  now = new Date(),
) {
  const applicableRules = await loadApplicableRules();
  const thresholdRule = selectThresholdRule({
    ...input,
    commonList: "yes",
    asOf: now.toISOString().slice(0, 10),
    ...(config.SOURCE_MAX_AGE_DAYS === undefined
      ? {}
      : { maxSourceAgeDays: config.SOURCE_MAX_AGE_DAYS }),
  }, applicableRules);
  return thresholdRule?.valueUsdUpTo ?? null;
}

export async function createPreview(input: PreviewInput, now = new Date()) {
  const asOf = now.toISOString().slice(0, 10);
  if (input.from === input.to) {
    return { status: 422 as const, code: "ROUTE_MISMATCH", message: "Choose two different countries." };
  }

  const border = await prisma.border.findUnique({ where: { id: input.borderId } });
  if (!border) return { status: 404 as const, code: "BORDER_NOT_FOUND", message: "Border not found." };
  if (!border.active) return { status: 422 as const, code: "BORDER_INACTIVE", message: "Border is inactive." };
  if (border.countryFrom !== input.from || border.countryTo !== input.to) {
    return { status: 422 as const, code: "ROUTE_MISMATCH", message: "The selected border does not match the route." };
  }

  const product = input.productId
    ? await prisma.product.findUnique({
        where: { id: input.productId },
        include: { localNames: { orderBy: { name: "asc" } } },
      })
    : null;
  if (input.productId && !product) {
    return { status: 404 as const, code: "PRODUCT_NOT_FOUND", message: "Product not found." };
  }

  const rateCandidate = await prisma.exchangeRate.findFirst({
    where: { currency: input.currency, setAt: { lte: asOf } },
    orderBy: [{ setAt: "desc" }, { createdAt: "desc" }, { id: "asc" }],
  });
  const rate =
    rateCandidate &&
    config.EXCHANGE_RATE_MAX_AGE_DAYS !== undefined &&
    Number.isFinite(Date.parse(rateCandidate.setAt)) &&
    now.getTime() >= Date.parse(rateCandidate.setAt) &&
    now.getTime() - Date.parse(rateCandidate.setAt) <=
      config.EXCHANGE_RATE_MAX_AGE_DAYS * 86_400_000
      ? rateCandidate
      : null;
  let valueUsd: number | null = null;
  if (rate && !rate.illustrative && Number.isFinite(rate.ratePerUsd) && rate.ratePerUsd > 0) {
    const converted = new Decimal(input.valueLocal)
          .div(rate.ratePerUsd)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    if (converted.isFinite() && converted.isPositive() && converted.lte(Number.MAX_SAFE_INTEGER)) {
      valueUsd = converted.toNumber();
    }
  }
  const applicableRules = await loadApplicableRules();
  const evaluationInput = {
    from: input.from,
    to: input.to,
    borderId: input.borderId,
    commonList: product ? commonListToValue[product.onCommonList] : "unknown",
    valueUsd,
    asOf,
    ...(config.SOURCE_MAX_AGE_DAYS === undefined
      ? {}
      : { maxSourceAgeDays: config.SOURCE_MAX_AGE_DAYS }),
  };
  const rule = selectApplicableRule(evaluationInput, applicableRules);
  const requirements = rule
    ? await prisma.requirement.findMany({
        where: { id: { in: rule.requirements.map((item) => item.requirementId) } },
        include: {
          sources: {
            orderBy: [{ displayOrder: "asc" }, { sourceId: "asc" }],
            include: { source: true },
          },
        },
      })
    : [];
  const requirementMap = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const items = rule
    ? rule.requirements.map((ruleRequirement) => {
        const requirement = requirementMap.get(ruleRequirement.requirementId);
        if (!requirement) throw new Error(`Rule ${rule.id} references a missing requirement.`);
        const sources = requirement.sources.map(({ source }) => ({
          id: source.id,
          name: source.name,
          url: safeHttpsUrl(source.url),
          publishedAt: source.publishedAt,
          lastVerifiedAt: source.lastVerifiedAt,
          status: safeHttpsUrl(source.url)
            ? source.status.toLowerCase()
            : "unverified",
        }));
        return {
          requirementId: requirement.id,
          title: requirement.title,
          plainExplanation: requirement.plainExplanation,
          officialFee: requirement.officialFee,
          whereToObtain: requirement.whereToObtain,
          caveat: requirement.caveatBody
            ? { subject: requirement.caveatSubject, body: requirement.caveatBody }
            : null,
          sources,
          trustState: trustState(
            requirement.sources.map(({ source }) => ({
              status: safeHttpsUrl(source.url)
                ? source.status
                : SourceStatus.UNVERIFIED,
              lastVerifiedAt: source.lastVerifiedAt,
            })),
            now,
          ),
        };
      })
    : [];

  const thresholdRule = selectThresholdRule(evaluationInput, applicableRules);

  return {
    status: 200 as const,
    data: {
      input,
      border: {
        id: border.id,
        name: border.name,
        countries: [border.countryFrom, border.countryTo],
        note: border.note,
        deskContact: null,
      },
      product: product
        ? {
            id: product.id,
            officialName: product.officialName,
            localNames: product.localNames.map((name) => name.name),
            onCommonList: commonListToValue[product.onCommonList],
          }
        : null,
      rate: rate
        ? {
            id: rate.id,
            currency: rate.currency,
            ratePerUsd: rate.ratePerUsd,
            setAt: rate.setAt,
            illustrative: rate.illustrative,
          }
        : null,
      valueUsd,
      verdict: rule?.verdict ?? "cannot_confirm",
      ruleId: rule?.id ?? null,
      ruleVersion: rule?.version ?? null,
      asOf,
      threshold: thresholdRule?.valueUsdUpTo ?? null,
      items,
      disclaimer,
    },
  };
}
