import { describe, expect, it } from "vitest";
import { hasValue, parsePlanInput, planToQuery } from "./params";

describe("parsePlanInput", () => {
  it("defaults to Kenya to Uganda through Busia with nothing set", () => {
    expect(parsePlanInput({})).toEqual({
      from: "KE",
      to: "UG",
      borderId: "busia",
      productId: null,
      quantity: null,
      unit: "bags",
      currency: "KES",
      valueLocal: null,
    });
  });

  it("round-trips through planToQuery", () => {
    const input = parsePlanInput({
      border: "malaba",
      product: "beans-dry",
      qty: "5",
      unit: "crates",
      currency: "UGX",
      value: "110000",
    });
    expect(parsePlanInput(planToQuery(input))).toEqual(input);
  });

  it("falls back to safe values for junk input", () => {
    const input = parsePlanInput({ currency: "USD", qty: "-3", value: "1e9", unit: "tons" });
    expect(input.currency).toBe("KES");
    expect(input.quantity).toBeNull();
    expect(input.valueLocal).toBeNull();
    expect(input.unit).toBe("bags");
  });

  it("takes the first of repeated params", () => {
    expect(parsePlanInput({ qty: ["4", "9"] }).quantity).toBe(4);
  });
});

describe("hasValue", () => {
  it("needs both quantity and value", () => {
    expect(hasValue(parsePlanInput({ qty: "5" }))).toBe(false);
    expect(hasValue(parsePlanInput({ qty: "5", value: "100" }))).toBe(true);
  });
});
