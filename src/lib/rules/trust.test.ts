import { describe, expect, it } from "vitest";
import type { Source } from "@/lib/domain";
import { deriveTrustState } from "./trust";
import { toUsd } from "./usd";

const source = (status: Source["status"]): Source => ({
  id: status,
  name: status,
  url: null,
  publishedAt: null,
  lastVerifiedAt: null,
  status,
});

describe("deriveTrustState", () => {
  it("is unknown with no source, never verified", () => {
    expect(deriveTrustState([])).toBe("unknown");
  });

  it("is verified only when every source is verified", () => {
    expect(deriveTrustState([source("verified"), source("verified")])).toBe("verified");
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
