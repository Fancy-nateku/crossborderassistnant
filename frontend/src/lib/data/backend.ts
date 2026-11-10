import "server-only";
import { z } from "zod";
import type {
  Border,
  Currency,
  ExchangeRate,
  PlanInput,
  Product,
} from "@/lib/domain";
import { BackendApiError, requestBackendData } from "@/lib/api/backend";
import { repository } from "@/lib/data";
import { PreviewService } from "@/lib/services/preview-service";
import { strThresholdUsd } from "@/lib/rules/evaluate";

const borderSchema = z.object({
  id: z.string(),
  name: z.string(),
  countries: z.tuple([z.enum(["KE", "UG"]), z.enum(["KE", "UG"])]),
  note: z.string().nullable(),
  active: z.boolean(),
  deskContact: z.string().nullable(),
}) satisfies z.ZodType<Border>;

const productSchema = z.object({
  id: z.string(),
  officialName: z.string(),
  localNames: z.array(z.string()),
  onCommonList: z.enum(["yes", "no", "unknown"]),
  description: z.string().nullable(),
}) satisfies z.ZodType<Product>;

const rateSchema = z.object({
  id: z.string().optional(),
  currency: z.enum(["KES", "UGX"]),
  ratePerUsd: z.number().positive(),
  setAt: z.string(),
  illustrative: z.boolean(),
}) satisfies z.ZodType<ExchangeRate>;

const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().nullable(),
  publishedAt: z.string().nullable(),
  lastVerifiedAt: z.string().nullable(),
  status: z.enum(["verified", "unverified", "conflicting"]),
});

const checklistItemSchema = z.object({
  requirementId: z.string(),
  title: z.string(),
  plainExplanation: z.string(),
  officialFee: z.string().nullable(),
  whereToObtain: z.string().nullable(),
  trustState: z.enum(["verified", "unverified", "conflicting", "unknown"]),
  caveat: z.object({ subject: z.string().nullable(), body: z.string() }).nullable(),
  sources: z.array(sourceSchema),
});

const previewSchema = z.object({
  input: z.object({
    from: z.enum(["KE", "UG"]),
    to: z.enum(["KE", "UG"]),
    borderId: z.string(),
    productId: z.string().nullable(),
    quantity: z.number().nullable(),
    unit: z.enum(["bags", "kilograms", "crates"]),
    currency: z.enum(["KES", "UGX"]),
    valueLocal: z.number().nullable(),
  }),
  border: z.object({
    id: z.string(),
    name: z.string(),
    countries: z.tuple([z.enum(["KE", "UG"]), z.enum(["KE", "UG"])]),
    note: z.string().nullable(),
    deskContact: z.string().nullable(),
  }),
  product: z.object({
    id: z.string(),
    officialName: z.string(),
    localNames: z.array(z.string()),
    onCommonList: z.enum(["yes", "no", "unknown"]),
  }).nullable(),
  rate: rateSchema.nullable(),
  valueUsd: z.number().nullable(),
  verdict: z.enum([
    "likely_str_eligible",
    "above_threshold",
    "not_on_common_list",
    "cannot_confirm",
  ]),
  ruleId: z.string().nullable(),
  ruleVersion: z.number().nullable(),
  asOf: z.string(),
  threshold: z.number().nullable(),
  items: z.array(checklistItemSchema),
  disclaimer: z.string(),
});

export type BackendPreview = z.infer<typeof previewSchema>;

export async function listBorders(activeOnly = true): Promise<Border[]> {
  if (process.env.NODE_ENV === "test") return repository.listBorders(activeOnly);
  return requestBackendData(
    `/api/v1/borders?active=${activeOnly}`,
    z.array(borderSchema),
  );
}

export async function getBorder(id: string): Promise<Border | null> {
  if (process.env.NODE_ENV === "test") return repository.getBorder(id);
  try {
    return await requestBackendData(`/api/v1/borders/${encodeURIComponent(id)}`, borderSchema);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) return null;
    throw error;
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (process.env.NODE_ENV === "test") return repository.searchProducts(query, { limit: 50 });
  const params = new URLSearchParams({ q: query, limit: "50" });
  return requestBackendData(`/api/v1/products?${params}`, z.array(productSchema));
}

export async function getProduct(id: string): Promise<Product | null> {
  if (process.env.NODE_ENV === "test") return repository.getProduct(id);
  try {
    return await requestBackendData(`/api/v1/products/${encodeURIComponent(id)}`, productSchema);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getExchangeRate(currency: Currency): Promise<ExchangeRate | null> {
  if (process.env.NODE_ENV === "test") return repository.getExchangeRate(currency);
  try {
    return await requestBackendData(`/api/v1/exchange-rates/${currency}`, rateSchema);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getStrThreshold(input: Pick<PlanInput, "from" | "to" | "borderId">) {
  if (process.env.NODE_ENV === "test") {
    const rules = await repository.listActiveRules();
    return { threshold: strThresholdUsd(rules, input) };
  }
  const params = new URLSearchParams({
  from: input.from,
  to: input.to,
  borderId: input.borderId,
});
  return requestBackendData(
    `/api/v1/thresholds/str?${params}`,
    z.object({ threshold: z.number().nullable() }),
  );
}

export async function getPlanPreview(input: PlanInput): Promise<BackendPreview> {
  if (process.env.NODE_ENV === "test") {
    const preview = await new PreviewService(repository).evaluatePlan(input);
    return {
      input: preview.input,
      border: {
        id: preview.border.id,
        name: preview.border.name,
        countries: [preview.border.countries[0], preview.border.countries[1]],
        note: preview.border.note,
        deskContact: preview.border.deskContact,
      },
      product: preview.product
        ? {
            id: preview.product.id,
            officialName: preview.product.officialName,
            localNames: preview.product.localNames,
            onCommonList: preview.product.onCommonList,
          }
        : null,
      rate: preview.rate,
      valueUsd: preview.valueUsd,
      verdict: preview.verdict,
      ruleId: preview.ruleId,
      ruleVersion: preview.ruleVersion,
      asOf: preview.asOf,
      threshold: preview.threshold,
      items: preview.items,
      disclaimer: preview.disclaimer,
    };
  }
  return requestBackendData(
    "/api/v1/plan-previews",
    previewSchema,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...input,
        quantity: input.quantity,
        valueLocal: input.valueLocal,
      }),
    },
  );
}
