import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CommonListStatus,
  CountryCode,
  Currency,
  PrismaClient,
  RuleStatus,
  SourceStatus,
  UserRole,
  Verdict,
} from "@prisma/client";
import { z } from "zod";

/**
 * Reviewed content import.
 *   npx tsx prisma/import-content.ts           dry run, no database needed
 *   npx tsx prisma/import-content.ts --apply   writes (see the safety gates in main)
 */

// Keep in sync with approvedSourceDomains in backend/src/app.ts.
const APPROVED_DOMAINS = [
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

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const idSchema = z.string().min(1).max(50);
const country = z.enum(["KE", "UG"]);
const commonListSchema = z.enum(["yes", "no", "unknown"]);
const checkNote = z.string().optional();
const reviewSchema = z
  .object({
    checkedBy: z.string().min(1),
    checkedOn: isoDate,
    evidence: z.string().min(1),
  })
  .strict();

const borderSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255),
    from: country,
    to: country,
    note: z.string().nullable().default(null),
    active: z.boolean().default(true),
  })
  .strict();

const sourceSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(255),
    url: z.string().url().nullable(),
    publishedAt: isoDate.nullable().default(null),
    lastVerifiedAt: isoDate.nullable().default(null),
    status: z.enum(["verified", "unverified", "conflicting"]),
    notes: z.string().nullable().default(null),
    review: reviewSchema.optional(),
    check: checkNote,
  })
  .strict();

const requirementSchema = z
  .object({
    id: idSchema,
    title: z.string().min(1).max(200),
    plainExplanation: z.string().min(1),
    officialFee: z.string().nullable().default(null),
    whereToObtain: z.string().nullable().default(null),
    sourceIds: z.array(idSchema).min(1),
    caveat: z
      .object({ subject: z.string().nullable(), body: z.string().min(1) })
      .strict()
      .nullable()
      .default(null),
    check: checkNote,
  })
  .strict();

const ruleSchema = z
  .object({
    id: idSchema,
    version: z.number().int().positive(),
    from: country,
    to: country,
    borderIds: z.array(idSchema),
    commonList: commonListSchema.optional(),
    valueUsdAbove: z.number().positive().optional(),
    valueUsdUpTo: z.number().positive().optional(),
    verdict: z.enum(["likely_str_eligible", "above_threshold", "not_on_common_list"]),
    requirementIds: z.array(idSchema),
    sourceId: idSchema,
    effectiveFrom: isoDate,
    status: z.enum(["active", "draft", "retired"]).default("active"),
    priority: z.number().int().default(0),
    verifiedAt: isoDate.optional(),
    review: reviewSchema.optional(),
    check: checkNote,
  })
  .strict();

const productSchema = z
  .object({
    id: idSchema,
    officialName: z.string().min(1).max(255),
    localNames: z.array(z.string().min(1)).default([]),
    commonList: commonListSchema,
    description: z.string().nullable().default(null),
    review: reviewSchema.optional(),
    check: checkNote,
  })
  .strict();

const rateSchema = z
  .object({
    currency: z.enum(["KES", "UGX"]),
    ratePerUsd: z.number().positive().finite(),
    setAt: isoDate,
    illustrative: z.boolean(),
    provenance: z.string().min(1),
    review: reviewSchema.optional(),
    check: checkNote,
  })
  .strict();

const registrySchema = z
  .object({
    meta: z.record(z.string(), z.unknown()),
    borders: z.array(borderSchema),
    sources: z.array(sourceSchema),
    requirements: z.array(requirementSchema),
    rules: z.array(ruleSchema),
    exchangeRates: z.array(rateSchema),
    products: z.array(productSchema),
  })
  .strict();

type Registry = z.infer<typeof registrySchema>;

const COUNTRY = { KE: CountryCode.KE, UG: CountryCode.UG } as const;
const CURRENCY = { KES: Currency.KES, UGX: Currency.UGX } as const;
const COMMON = {
  yes: CommonListStatus.YES,
  no: CommonListStatus.NO,
  unknown: CommonListStatus.UNKNOWN,
} as const;
const VERDICT = {
  likely_str_eligible: Verdict.LIKELY_STR_ELIGIBLE,
  above_threshold: Verdict.ABOVE_THRESHOLD,
  not_on_common_list: Verdict.NOT_ON_COMMON_LIST,
} as const;
const RULE_STATUS = {
  active: RuleStatus.ACTIVE,
  draft: RuleStatus.DRAFT,
  retired: RuleStatus.RETIRED,
} as const;
const SOURCE_STATUS = {
  verified: SourceStatus.VERIFIED,
  unverified: SourceStatus.UNVERIFIED,
  conflicting: SourceStatus.CONFLICTING,
} as const;

const DAY_MS = 86_400_000;
const dayMs = (d: string) => Date.parse(`${d}T00:00:00.000Z`);

function isApprovedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      APPROVED_DOMAINS.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))
    );
  } catch {
    return false;
  }
}

/** What will really be stored: claims without a named human check are downgraded. */
function withEffective(reg: Registry) {
  return {
    products: reg.products.map((p) => ({
      ...p,
      effectiveCommonList:
        p.commonList !== "unknown" && !p.review ? ("unknown" as const) : p.commonList,
    })),
    rates: reg.exchangeRates.map((r) => ({
      ...r,
      effectiveIllustrative: r.illustrative || !r.review,
    })),
  };
}

interface Findings {
  errors: string[];
  warnings: string[];
  todo: string[];
}

function validate(reg: Registry): Findings {
  const errors: string[] = [];
  const warnings: string[] = [];
  const todo: string[] = [];
  const now = Date.now();
  const maxAgeDays = Number(process.env.SOURCE_MAX_AGE_DAYS ?? "30");

  const unique = (label: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const x of ids) {
      if (seen.has(x)) errors.push(`${label}: duplicate id ${x}`);
      seen.add(x);
    }
  };
  unique("borders", reg.borders.map((b) => b.id));
  unique("sources", reg.sources.map((s) => s.id));
  unique("requirements", reg.requirements.map((r) => r.id));
  unique("rules", reg.rules.map((r) => r.id));
  unique("products", reg.products.map((p) => p.id));

  const sourceIds = new Set(reg.sources.map((s) => s.id));
  const requirementIds = new Set(reg.requirements.map((r) => r.id));
  const borderIds = new Set(reg.borders.map((b) => b.id));
  const sourceById = new Map(reg.sources.map((s) => [s.id, s]));

  for (const s of reg.sources) {
    if (s.url !== null && !isApprovedUrl(s.url)) {
      errors.push(`source ${s.id}: URL must be https on an approved domain`);
    }
    if (s.status === "verified") {
      if (!s.review) errors.push(`source ${s.id}: verified needs a review block (who, when, evidence)`);
      if (s.url === null) errors.push(`source ${s.id}: verified needs a URL`);
      if (!s.lastVerifiedAt) {
        errors.push(`source ${s.id}: verified needs lastVerifiedAt`);
      } else {
        const age = now - dayMs(s.lastVerifiedAt);
        if (age < 0) errors.push(`source ${s.id}: lastVerifiedAt is in the future`);
        else if (age > maxAgeDays * DAY_MS) {
          errors.push(`source ${s.id}: lastVerifiedAt is older than ${maxAgeDays} days`);
        }
      }
    } else {
      todo.push(`source ${s.id} is ${s.status}${s.check ? `: ${s.check}` : ""}`);
    }
  }

  for (const r of reg.requirements) {
    for (const sid of r.sourceIds) {
      if (!sourceIds.has(sid)) errors.push(`requirement ${r.id}: unknown source ${sid}`);
    }
    if (r.check) todo.push(`requirement ${r.id}: ${r.check}`);
  }

  for (const r of reg.rules) {
    if (r.from === r.to) errors.push(`rule ${r.id}: from and to must differ`);
    if (
      r.valueUsdAbove !== undefined &&
      r.valueUsdUpTo !== undefined &&
      r.valueUsdAbove >= r.valueUsdUpTo
    ) {
      errors.push(`rule ${r.id}: valueUsdAbove must be below valueUsdUpTo`);
    }
    const src = sourceById.get(r.sourceId);
    if (!src) errors.push(`rule ${r.id}: unknown source ${r.sourceId}`);
    else if (r.status === "active" && src.status !== "verified") {
      warnings.push(`rule ${r.id}: source ${src.id} is not verified, so plans will show "cannot confirm"`);
    }
    for (const rid of r.requirementIds) {
      if (!requirementIds.has(rid)) errors.push(`rule ${r.id}: unknown requirement ${rid}`);
    }
    for (const bid of r.borderIds) {
      if (!borderIds.has(bid)) errors.push(`rule ${r.id}: unknown border ${bid}`);
    }
    if (r.verifiedAt && !r.review) errors.push(`rule ${r.id}: verifiedAt needs a review block`);
    if (!r.verifiedAt) todo.push(`rule ${r.id} has no verifiedAt${r.check ? `: ${r.check}` : ""}`);
  }

  const effective = withEffective(reg);
  for (const p of effective.products) {
    if (p.effectiveCommonList !== p.commonList) {
      warnings.push(`product ${p.id}: claimed "${p.commonList}" without a review, loaded as "unknown"`);
    }
    if (p.check) todo.push(`product ${p.id}: ${p.check}`);
  }
  for (const r of effective.rates) {
    if (r.effectiveIllustrative && !r.illustrative) {
      warnings.push(`rate ${r.currency}: no review block, loaded as illustrative (the backend ignores it)`);
    }
    if (r.check) todo.push(`rate ${r.currency}: ${r.check}`);
    if (now - dayMs(r.setAt) > Number(process.env.EXCHANGE_RATE_MAX_AGE_DAYS ?? "30") * DAY_MS) {
      warnings.push(`rate ${r.currency}: older than the freshness limit, the backend will ignore it`);
    }
  }

  return { errors, warnings, todo };
}

async function applyRegistry(reg: Registry, fileHash: string, adminEmail: string) {
  const prisma = new PrismaClient();
  const effective = withEffective(reg);
  try {
    await prisma.$transaction(
      async (tx) => {
        const admin = await tx.user.findUnique({ where: { email: adminEmail } });
        if (!admin || admin.role !== UserRole.ADMIN) {
          throw new Error("IMPORT_ADMIN_EMAIL must belong to an existing user with the ADMIN role.");
        }

        for (const b of reg.borders) {
          const data = {
            name: b.name,
            countryFrom: COUNTRY[b.from],
            countryTo: COUNTRY[b.to],
            note: b.note,
            active: b.active,
          };
          await tx.border.upsert({ where: { id: b.id }, update: data, create: { id: b.id, ...data } });
        }

        for (const s of reg.sources) {
          const data = {
            name: s.name,
            url: s.url,
            publishedAt: s.publishedAt,
            lastVerifiedAt: s.lastVerifiedAt,
            status: SOURCE_STATUS[s.status],
            verifiedBy: s.status === "verified" ? admin.id : null,
            notes: s.notes,
          };
          await tx.source.upsert({ where: { id: s.id }, update: data, create: { id: s.id, ...data } });
        }

        for (const r of reg.requirements) {
          const data = {
            title: r.title,
            plainExplanation: r.plainExplanation,
            officialFee: r.officialFee,
            whereToObtain: r.whereToObtain,
            caveatSubject: r.caveat?.subject ?? null,
            caveatBody: r.caveat?.body ?? null,
          };
          await tx.requirement.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } });
          await tx.requirementSource.deleteMany({ where: { requirementId: r.id } });
          await tx.requirementSource.createMany({
            data: r.sourceIds.map((sourceId, displayOrder) => ({
              requirementId: r.id,
              sourceId,
              displayOrder,
            })),
          });
        }

        for (const r of reg.rules) {
          // Deleting a rule cascades to its border and requirement links.
          await tx.rule.deleteMany({ where: { id: r.id } });
          await tx.rule.create({
            data: {
              id: r.id,
              version: r.version,
              countryFrom: COUNTRY[r.from],
              countryTo: COUNTRY[r.to],
              commonList: r.commonList ? COMMON[r.commonList] : null,
              valueUsdAbove: r.valueUsdAbove ?? null,
              valueUsdUpTo: r.valueUsdUpTo ?? null,
              verdict: VERDICT[r.verdict],
              sourceId: r.sourceId,
              effectiveFrom: r.effectiveFrom,
              status: RULE_STATUS[r.status],
              priority: r.priority,
              verifiedAt: r.verifiedAt ?? null,
              verifiedBy: r.verifiedAt ? admin.id : null,
              borders: { create: r.borderIds.map((borderId) => ({ borderId })) },
              requirements: {
                create: r.requirementIds.map((requirementId, displayOrder) => ({
                  requirementId,
                  displayOrder,
                })),
              },
            },
          });
        }

        for (const p of effective.products) {
          const data = {
            officialName: p.officialName,
            onCommonList: COMMON[p.effectiveCommonList],
            description: p.description,
          };
          await tx.product.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } });
          await tx.productLocalName.deleteMany({ where: { productId: p.id } });
          await tx.productLocalName.createMany({
            data: p.localNames.map((name) => ({ productId: p.id, name })),
          });
        }

        for (const r of effective.rates) {
          const existing = await tx.exchangeRate.findFirst({
            where: { currency: CURRENCY[r.currency], setAt: r.setAt, ratePerUsd: r.ratePerUsd },
          });
          if (existing) {
            await tx.exchangeRate.update({
              where: { id: existing.id },
              data: { illustrative: r.effectiveIllustrative },
            });
          } else {
            await tx.exchangeRate.create({
              data: {
                currency: CURRENCY[r.currency],
                ratePerUsd: r.ratePerUsd,
                setAt: r.setAt,
                setBy: admin.id,
                illustrative: r.effectiveIllustrative,
              },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            actorRole: UserRole.ADMIN,
            action: "IMPORT_CONTENT",
            entityType: "CONTENT_REGISTRY",
            entityId: fileHash,
            details: JSON.stringify({
              borders: reg.borders.length,
              sources: reg.sources.length,
              requirements: reg.requirements.length,
              rules: reg.rules.length,
              products: reg.products.length,
              exchangeRates: reg.exchangeRates.length,
            }),
          },
        });
      },
      { maxWait: 10_000, timeout: 120_000 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const wantsApply = args.includes("--apply");
  const fileArg =
    args.find((a) => a.startsWith("--file="))?.slice("--file=".length) ?? "prisma/content/registry.json";

  const raw = readFileSync(resolve(process.cwd(), fileArg), "utf8").replace(/^\uFEFF/, "");
  const parsed = registrySchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("Registry file is invalid:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.map(String).join(".")}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }
  const reg = parsed.data;
  const findings = validate(reg);
  const fileHash = createHash("sha256").update(raw).digest("hex").slice(0, 16);

  console.log(
    `Registry ${fileHash}: ${reg.borders.length} border, ${reg.sources.length} sources, ` +
      `${reg.requirements.length} requirements, ${reg.rules.length} rules, ` +
      `${reg.products.length} products, ${reg.exchangeRates.length} rate(s).`,
  );
  for (const w of findings.warnings) console.log(`WARNING  ${w}`);
  for (const t of findings.todo) console.log(`TO CHECK ${t}`);
  if (findings.errors.length > 0) {
    for (const e of findings.errors) console.error(`ERROR    ${e}`);
    console.error("Fix the errors above. Nothing was written.");
    process.exitCode = 1;
    return;
  }

  if (!wantsApply) {
    console.log("\nDry run only. Nothing was written. Re-run with --apply to write.");
    return;
  }

  if (process.env.ALLOW_CONTENT_IMPORT !== "true") {
    throw new Error("Set ALLOW_CONTENT_IMPORT=true to write content.");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const host = new URL(databaseUrl).hostname;
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!isLocal && !args.includes(`--confirm-host=${host}`)) {
    throw new Error(`Target database host is ${host}. Re-run with --confirm-host=${host} to confirm.`);
  }
  const adminEmail = process.env.IMPORT_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) throw new Error("Set IMPORT_ADMIN_EMAIL to an existing ADMIN user's email.");

  console.log(`\nWriting to database host: ${host}`);
  await applyRegistry(reg, fileHash, adminEmail);
  console.log("Import complete.");
}

main().catch((error: unknown) => {
  console.error(`Import failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});