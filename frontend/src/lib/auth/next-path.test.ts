import { describe, expect, it } from "vitest";
import { afterAuthPath } from "./next-path";

describe("afterAuthPath", () => {
  it("returns to the page the person came from, under their locale", () => {
    const next = encodeURIComponent("/plan/result?border=busia&value=30000");
    expect(afterAuthPath(`?next=${next}`, "en")).toBe("/en/plan/result?border=busia&value=30000");
  });

  it("defaults to the saved plans page", () => {
    expect(afterAuthPath("", "en")).toBe("/en/plans");
  });

  it.each(["https://evil.example/", "//evil.example", "/\\evil.example", "javascript:alert(1)", "plan/result", "/a b"])(
    "ignores an unsafe next value: %s",
    (bad) => {
      expect(afterAuthPath(`?next=${encodeURIComponent(bad)}`, "en")).toBe("/en/plans");
    },
  );
});
