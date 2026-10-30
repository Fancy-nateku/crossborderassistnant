import { describe, expect, it } from "vitest";
import type { Source } from "@/lib/domain";
import { deriveTrustState } from "./trust";
import { toUsd } from "./usd";

const source = (status: Source["status"]): Source => ({
  id: status,
  name: status,
  url: null,
  publishedAt: null,
  lastVerifiedAt: status === "verified" ? "2026-10-15" : null,
  status,
});

describe("deriveTrustState", () => {
  it("is unknown with no source, never verified", () => {
    expect(deriveTrustState([])).toBe("unknown");
  });

  it("is verified only when every source is verified", () => {
    expect(deriveTrustState([source("verified"), source("verified")])).toBe("verified");
  });

  it("does not treat a verified label without a verification date as verified", () => {
    expect(deriveTrustState([{ ...source("verified"), lastVerifiedAt: null }])).toBe("unverified");
  });

  it("treats a source verified in the future as unverified", () => {
    expect(
      deriveTrustState([source("verified")], { asOf: "2026-10-10", maxAgeDays: 365 }),
    ).toBe("unverified");
  });

  it("lets the worst state win: conflicting over unverified over verified", () => {
    expect(deriveTrustState([source("verified"), source("unverified")])).toBe("unverified");
    expect(
      deriveTrustState([source("verified"), source("unverified"), source("conflicting")]),
    ).toBe("conflicting");
  });
});

describe("toUsd", () => {
  it("divides by the rate and rounds to cents", () => {
    expect(toUsd(30000, { ratePerUsd: 130 })).toBe(230.77);
  });

  it("returns null without a usable rate", () => {
    expect(toUsd(30000, null)).toBeNull();
    expect(toUsd(30000, { ratePerUsd: 0 })).toBeNull();
  });
});
