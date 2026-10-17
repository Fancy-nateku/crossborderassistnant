import { z } from "zod";
import type { PlanInput } from "@/lib/domain";

export const DEFAULT_BORDER_ID = "busia";

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const positiveInt = z
  .string()
  .regex(/^\d{1,12}$/)
  .transform(Number)
  .refine((n) => n > 0);

const schema = z.object({
  from: z.enum(["KE", "UG"]).catch("KE"),
  to: z.enum(["KE", "UG"]).catch("UG"),
  border: z.string().min(1).max(40).catch(DEFAULT_BORDER_ID),
  product: z.string().min(1).max(60).nullable().catch(null),
  qty: positiveInt.nullable().catch(null),
  unit: z.enum(["bags", "kilograms", "crates"]).catch("bags"),
  currency: z.enum(["KES", "UGX"]).catch("KES"),
  value: positiveInt.nullable().catch(null),
});

/** Reads wizard state from the URL. Bad or missing values fall back to safe defaults. */
export function parsePlanInput(raw: RawParams): PlanInput {
  const pick = (key: string) => first(raw[key]) || null;
  const parsed = schema.parse({
    from: pick("from") ?? undefined,
    to: pick("to") ?? undefined,
    border: pick("border") ?? undefined,
    product: pick("product"),
    qty: pick("qty"),
    unit: pick("unit") ?? undefined,
    currency: pick("currency") ?? undefined,
    value: pick("value"),
  });

  return {
    from: parsed.from,
    to: parsed.to,
    borderId: parsed.border,
    productId: parsed.product,
    quantity: parsed.qty,
    unit: parsed.unit,
    currency: parsed.currency,
    valueLocal: parsed.value,
  };
}

/** The inverse of `parsePlanInput`. Null values are left out. */
export function planToQuery(input: PlanInput): Record<string, string> {
  const entries: [string, string | null][] = [
    ["from", input.from],
    ["to", input.to],
    ["border", input.borderId],
    ["product", input.productId],
    ["qty", input.quantity === null ? null : String(input.quantity)],
    ["unit", input.unit],
    ["currency", input.currency],
    ["value", input.valueLocal === null ? null : String(input.valueLocal)],
  ];
  return Object.fromEntries(entries.filter((e): e is [string, string] => e[1] !== null));
}

export function hasValue(
  input: PlanInput,
): input is PlanInput & { quantity: number; valueLocal: number } {
  return input.quantity !== null && input.valueLocal !== null;
}
