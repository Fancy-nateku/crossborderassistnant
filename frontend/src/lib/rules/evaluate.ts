import type {
  CommonListStatus,
  CountryCode,
  Rule,
  RuleConditions,
  Verdict,
} from "@/lib/domain";

export interface EvaluationInput {
  from: CountryCode;
  to: CountryCode;
  borderId: string;
  /** Common List status of the chosen product. Null when the trader skipped the match. */
  commonList: CommonListStatus | null;
  /** Null when no exchange rate is available. */
  valueUsd: number | null;
  /** ISO date (YYYY-MM-DD). Passed in so the function stays pure. */
  asOf: string;
}

export interface Evaluation {
  verdict: Verdict;
  ruleId: string | null;
  ruleVersion: number | null;
  requirementIds: string[];
}

const CANNOT_CONFIRM: Evaluation = {
  verdict: "cannot_confirm",
  ruleId: null,
  ruleVersion: null,
  requirementIds: [],
};

function matches(c: RuleConditions, input: EvaluationInput): boolean {
  if (c.from !== input.from || c.to !== input.to) return false;
  if (c.borderIds && !c.borderIds.includes(input.borderId)) return false;
  if (c.commonList !== undefined && c.commonList !== (input.commonList ?? "unknown")) {
    return false;
  }
  if (c.valueUsdAbove !== undefined) {
    if (input.valueUsd === null || !(input.valueUsd > c.valueUsdAbove)) return false;
  }
  if (c.valueUsdUpTo !== undefined) {
    if (input.valueUsd === null || !(input.valueUsd <= c.valueUsdUpTo)) return false;
  }
  return true;
}

/**
 * Pure rules engine: same inputs and rules always give the same output.
 * No matching rule means "cannot_confirm". There is no fallback guess
 * (CLAUDE.md rule 4).
 *
 * Deterministic tie-break order:
 * 1. Priority (highest wins)
 * 2. Effective date (most recent wins)
 * 3. Version (highest version wins for same rule ID)
 * 4. Rule ID lexical order
 */
export function evaluate(input: EvaluationInput, rules: readonly Rule[]): Evaluation {
  const winner = rules
    .filter((r) => r.status === "active" && r.effectiveFrom <= input.asOf)
    .filter((r) => matches(r.conditions, input))
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.effectiveFrom.localeCompare(a.effectiveFrom) ||
        b.version - a.version ||
        a.id.localeCompare(b.id),
    )[0];

  if (!winner) return CANNOT_CONFIRM;

  return {
    verdict: winner.outcome.verdict,
    ruleId: winner.id,
    ruleVersion: winner.version,
    requirementIds: winner.outcome.requirementIds,
  };
}

export interface ThresholdScope {
  from?: CountryCode;
  to?: CountryCode;
  borderId?: string;
  asOf?: string;
}

/**
 * The USD ceiling of the Simplified Trade Regime rule, read from rule data, never hard-coded.
 * Deterministically scoped to the route, border, and date when provided.
 */
export function strThresholdUsd(
  rules: readonly Rule[],
  scope?: ThresholdScope,
): number | null {
  const asOf = scope?.asOf ?? new Date().toISOString().slice(0, 10);
  const matching = rules.filter(
    (r) =>
      r.status === "active" &&
      r.outcome.verdict === "likely_str_eligible" &&
      r.effectiveFrom <= asOf &&
      (!scope?.from || r.conditions.from === scope.from) &&
      (!scope?.to || r.conditions.to === scope.to) &&
      (!scope?.borderId || !r.conditions.borderIds || r.conditions.borderIds.includes(scope.borderId)),
  );

  const candidates = matching.length > 0 ? matching : rules.filter(
    (r) => r.status === "active" && r.outcome.verdict === "likely_str_eligible",
  );

  if (candidates.length === 0) return null;

  const winner = [...candidates].sort(
    (a, b) =>
      b.priority - a.priority ||
      b.effectiveFrom.localeCompare(a.effectiveFrom) ||
      b.version - a.version ||
      a.id.localeCompare(b.id),
  )[0];

  return winner?.conditions.valueUsdUpTo ?? null;
}
