import { describe, expect, it } from "vitest";
import { requirements, rules, sources } from "@/lib/data/mock/fixtures";
import { buildChecklist } from "./checklist";
import { evaluate, strThresholdUsd, type EvaluationInput } from "./evaluate";

// Scenarios check the fixture rules "rule-str-eligible", "rule-above-threshold" and
// "rule-not-on-list", all version 1. They are prototype fixtures, not verified rules.

const base: EvaluationInput = {
  from: "KE",
  to: "UG",
  borderId: "busia",
  commonList: "yes",
  valueUsd: 230.77,
  asOf: "2026-10-17",
};

describe("evaluate (fixture rules v1)", () => {
  it("returns likely_str_eligible for a Common List product under the threshold", () => {
    const result = evaluate(base, rules);
    expect(result).toMatchObject({
      verdict: "likely_str_eligible",
      ruleId: "rule-str-eligible",
      ruleVersion: 1,
    });
    expect(result.requirementIds).toEqual(["req-sco", "req-scd", "req-threshold", "req-product"]);
  });

  it("treats exactly the threshold as eligible and one cent above as above_threshold", () => {
    expect(evaluate({ ...base, valueUsd: 2000 }, rules).verdict).toBe("likely_str_eligible");
    expect(evaluate({ ...base, valueUsd: 2000.01 }, rules).verdict).toBe("above_threshold");
  });

  it("returns not_on_common_list whatever the value", () => {
    expect(evaluate({ ...base, commonList: "no" }, rules).verdict).toBe("not_on_common_list");
    expect(evaluate({ ...base, commonList: "no", valueUsd: 9000 }, rules).verdict).toBe(
      "not_on_common_list",
    );
  });

  it("cannot confirm when Common List status is unknown", () => {
    const result = evaluate({ ...base, commonList: "unknown" }, rules);
    expect(result).toEqual({
      verdict: "cannot_confirm",
      ruleId: null,
      ruleVersion: null,
      requirementIds: [],
    });
  });

  it("cannot confirm when the trader skipped the product match", () => {
    expect(evaluate({ ...base, commonList: null }, rules).verdict).toBe("cannot_confirm");
  });

  it("cannot confirm when there is no exchange rate (value in USD unknown)", () => {
    expect(evaluate({ ...base, valueUsd: null }, rules).verdict).toBe("cannot_confirm");
  });

  it("cannot confirm for a border or route no rule covers", () => {
    expect(evaluate({ ...base, borderId: "elsewhere" }, rules).verdict).toBe("cannot_confirm");
    expect(evaluate({ ...base, from: "UG", to: "KE" }, rules).verdict).toBe("cannot_confirm");
  });

  it("ignores retired, draft and not-yet-effective rules", () => {
    const [str] = rules;
    expect(evaluate(base, [{ ...str, status: "retired" }]).verdict).toBe("cannot_confirm");
    expect(evaluate(base, [{ ...str, status: "draft" }]).verdict).toBe("cannot_confirm");
    expect(evaluate(base, [{ ...str, effectiveFrom: "2026-12-01" }]).verdict).toBe(
      "cannot_confirm",
    );
  });

  it("is deterministic and picks the highest priority rule, ties broken by id", () => {
    const [str] = rules;
    const higher = {
      ...str,
      id: "a-rule",
      priority: 99,
      outcome: { verdict: "above_threshold" as const, requirementIds: [] },
    };
    expect(evaluate(base, [str, higher]).ruleId).toBe("a-rule");
    expect(evaluate(base, [higher, str])).toEqual(evaluate(base, [str, higher]));

    const tie = { ...str, id: "z-rule" };
    expect(evaluate(base, [tie, str]).ruleId).toBe("rule-str-eligible");
  });
});

describe("strThresholdUsd", () => {
  it("reads the ceiling from rule data", () => {
    expect(strThresholdUsd(rules)).toBe(2000);
  });

  it("is null when no Simplified Trade Regime rule is active", () => {
    expect(strThresholdUsd([])).toBeNull();
  });
});

describe("buildChecklist (fixture requirements)", () => {
  const ids = ["req-sco", "req-scd", "req-threshold", "req-product"];
  const items = buildChecklist(ids, requirements, sources);

  it("keeps rule order and derives each trust state from its sources", () => {
    expect(items.map((i) => [i.requirementId, i.trustState])).toEqual([
      ["req-sco", "conflicting"],
      ["req-scd", "verified"],
      ["req-threshold", "verified"],
      ["req-product", "unverified"],
    ]);
  });

  it("throws on an unknown requirement rather than hiding it", () => {
    expect(() => buildChecklist(["nope"], requirements, sources)).toThrow(/unknown requirement/);
  });

  it("throws on an unknown source", () => {
    const bad = [{ ...requirements[0], sourceIds: ["nope"] }];
    expect(() => buildChecklist([bad[0].id], bad, sources)).toThrow(/unknown source/);
  });
});
