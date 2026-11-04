export type Country = "KE" | "UG";
export type CommonList = "yes" | "no" | "unknown";
export type RuleVerdict =
  | "likely_str_eligible"
  | "above_threshold"
  | "not_on_common_list"
  | "cannot_confirm";

export interface ApplicableRule {
  id: string;
  version: number;
  countryFrom: Country;
  countryTo: Country;
  commonList: CommonList | null;
  valueUsdAbove: number | null;
  valueUsdUpTo: number | null;
  verdict: RuleVerdict;
  effectiveFrom: string;
  priority: number;
  borders: Array<{ borderId: string }>;
  source: {
    status: string;
    lastVerifiedAt: string | null;
    url: string | null;
  };
  requirements: Array<{ requirementId: string; displayOrder: number }>;
}

export interface EvaluationInput {
  from: Country;
  to: Country;
  borderId: string;
  commonList: CommonList;
  valueUsd: number | null;
  asOf: string;
  maxSourceAgeDays?: number;
}

function hasCurrentVerifiedSource(rule: ApplicableRule, input: EvaluationInput) {
  const { source } = rule;
  if (source.status !== "VERIFIED" || !source.url?.startsWith("https://")) return false;
  if (!source.lastVerifiedAt) return false;
  const verifiedAt = Date.parse(source.lastVerifiedAt);
  const asOf = Date.parse(`${input.asOf}T00:00:00.000Z`);
  if (!Number.isFinite(verifiedAt) || verifiedAt > asOf) return false;
  if (input.maxSourceAgeDays === undefined) return true;
  return Number.isFinite(verifiedAt) &&
    asOf - verifiedAt <= input.maxSourceAgeDays * 86_400_000;
}

export function selectApplicableRule(
  input: EvaluationInput,
  rules: readonly ApplicableRule[],
): ApplicableRule | null {
  if (input.valueUsd === null) return null;

  return rules
    .filter((rule) => rule.effectiveFrom <= input.asOf)
    .filter((rule) => rule.countryFrom === input.from && rule.countryTo === input.to)
    .filter((rule) => rule.borders.length === 0 || rule.borders.some(({ borderId }) => borderId === input.borderId))
    .filter((rule) => rule.commonList === null || rule.commonList === input.commonList)
    .filter((rule) => rule.valueUsdAbove === null || input.valueUsd! > rule.valueUsdAbove)
    .filter((rule) => rule.valueUsdUpTo === null || input.valueUsd! <= rule.valueUsdUpTo)
    .filter((rule) => input.commonList === "yes" || rule.verdict !== "likely_str_eligible")
    .filter((rule) => input.commonList === "no" || rule.verdict !== "not_on_common_list")
    .filter((rule) => hasCurrentVerifiedSource(rule, input))
    .sort((a, b) =>
      b.priority - a.priority ||
      b.effectiveFrom.localeCompare(a.effectiveFrom) ||
      b.version - a.version ||
      a.id.localeCompare(b.id),
    )[0] ?? null;
}

export function selectThresholdRule(
  input: Omit<EvaluationInput, "valueUsd">,
  rules: readonly ApplicableRule[],
): ApplicableRule | null {
  return rules
    .filter((rule) =>
      rule.verdict === "likely_str_eligible" &&
      rule.commonList === "yes" &&
      rule.effectiveFrom <= input.asOf &&
      rule.countryFrom === input.from &&
      rule.countryTo === input.to &&
      (rule.borders.length === 0 || rule.borders.some(({ borderId }) => borderId === input.borderId)) &&
      hasCurrentVerifiedSource(rule, { ...input, valueUsd: null }),
    )
    .sort((a, b) =>
      b.priority - a.priority ||
      b.effectiveFrom.localeCompare(a.effectiveFrom) ||
      b.version - a.version ||
      a.id.localeCompare(b.id),
    )[0] ?? null;
}
