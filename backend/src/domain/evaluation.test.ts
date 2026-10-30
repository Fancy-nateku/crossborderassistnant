import { describe, expect, it } from "vitest";
import { selectApplicableRule, selectThresholdRule, type ApplicableRule } from "./evaluation.js";

const baseRule: ApplicableRule = {
  id: "str",
  version: 1,
  countryFrom: "KE",
  countryTo: "UG",
  commonList: "yes",
  valueUsdAbove: 0,
  valueUsdUpTo: 2_000,
  verdict: "likely_str_eligible",
  effectiveFrom: "2026-01-01",
  priority: 10,
  borders: [{ borderId: "busia" }],
  source: {
    status: "VERIFIED",
    lastVerifiedAt: "2026-01-01",
    url: "https://example.org/rule",
  },
  requirements: [],
};

const input = (valueUsd: number | null, commonList: "yes" | "no" | "unknown" = "yes") => ({
  from: "KE" as const,
  to: "UG" as const,
  borderId: "busia",
  commonList,
  valueUsd,
  asOf: "2026-10-29",
});

describe("selectApplicableRule", () => {
  it("uses exclusive lower and inclusive upper threshold boundaries", () => {
    expect(selectApplicableRule(input(0), [baseRule])).toBeNull();
    expect(selectApplicableRule(input(2_000), [baseRule])?.id).toBe("str");
    expect(selectApplicableRule(input(2_000.01), [baseRule])).toBeNull();
  });

  it("does not infer eligibility for a skipped or unknown product", () => {
    expect(selectApplicableRule(input(1_000, "unknown"), [baseRule])).toBeNull();
  });

  it("does not use future rules or unverified rule sources", () => {
    const future = { ...baseRule, effectiveFrom: "2027-01-01" };
    const unverified = { ...baseRule, source: { ...baseRule.source, status: "UNVERIFIED" } };
    expect(selectApplicableRule(input(1_000), [future])).toBeNull();
    expect(selectApplicableRule(input(1_000), [unverified])).toBeNull();
  });

  it("breaks ties deterministically by priority, date, version and ID", () => {
    const old = { ...baseRule, id: "a", priority: 5 };
    const newRule = { ...baseRule, id: "b", priority: 10, version: 2 };
    expect(selectApplicableRule(input(1_000), [old, newRule])?.id).toBe("b");
  });
});

describe("selectThresholdRule", () => {
  it("scopes the threshold to route, border and effective date", () => {
    const matching = { ...baseRule, valueUsdUpTo: 2_000 };
    const future = { ...baseRule, id: "future", effectiveFrom: "2027-01-01", valueUsdUpTo: 3_000 };
    const wrongBorder = { ...baseRule, id: "other", borders: [{ borderId: "malaba" }] };
    expect(selectThresholdRule(input(1_000), [future, wrongBorder, matching])?.id).toBe("str");
  });
});
