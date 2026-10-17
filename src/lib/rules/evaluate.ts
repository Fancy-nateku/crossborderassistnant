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
 */
export function evaluate(input: EvaluationInput, rules: readonly Rule[]): Evaluation {
  const winner = rules
    .filter((r) => r.status === "active" && r.effectiveFrom <= input.asOf)
    .filter((r) => matches(r.conditions, input))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0];

  if (!winner) return CANNOT_CONFIRM;

  return {
    verdict: winner.outcome.verdict,
    ruleId: winner.id,
    ruleVersion: winner.version,
    requirementIds: winner.outcome.requirementIds,
  };
}

/** The USD ceiling of the Simplified Trade Regime rule, read from rule data, never hard-coded. */
export function strThresholdUsd(rules: readonly Rule[]): number | null {
  const str = rules.find(
    (r) => r.status === "active" && r.outcome.verdict === "likely_str_eligible",
  );
  return str?.conditions.valueUsdUpTo ?? null;
}
