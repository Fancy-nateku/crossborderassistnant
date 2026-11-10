import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../../messages/en.json";
import type { TrustState } from "@/lib/domain";
import { CommonListBadge, TrustBadge } from "./trust-badge";
import { TrustCallout } from "./trust-callout";

const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );

describe("TrustBadge", () => {
  it.each<[TrustState, string]>([
    ["verified", "Verified"],
    ["unverified", "Not re-checked"],
    ["conflicting", "Sources disagree"],
    ["unknown", "Cannot confirm"],
  ])("labels %s in words, not colour alone", (state, label) => {
    wrap(<TrustBadge state={state} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("CommonListBadge", () => {
  it("states list status in words", () => {
    wrap(
      <>
        <CommonListBadge status="yes" />
        <CommonListBadge status="no" />
        <CommonListBadge status="unknown" />
      </>,
    );
    expect(screen.getByText("On the Common List")).toBeInTheDocument();
    expect(screen.getByText("Not on the Common List")).toBeInTheDocument();
    expect(screen.getByText("List status unknown")).toBeInTheDocument();
  });
});

describe("TrustCallout", () => {
  it("names the subject when sources disagree", () => {
    wrap(<TrustCallout state="conflicting" subject="the fee" body="Ask the desk." />);
    expect(screen.getByText("Sources disagree on the fee")).toBeInTheDocument();
    expect(screen.getByText("Ask the desk.")).toBeInTheDocument();
  });

  it("falls back to a generic title without a subject", () => {
    wrap(<TrustCallout state="conflicting" body="x" />);
    expect(screen.getByText("Sources disagree on this item")).toBeInTheDocument();
  });

  it("titles the unverified state", () => {
    wrap(<TrustCallout state="unverified" body="x" />);
    expect(screen.getByText("Not re-checked recently")).toBeInTheDocument();
  });
});
