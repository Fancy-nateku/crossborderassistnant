import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { messages, metadataTitle, redirectTarget, renderScreen } from "@/test/screen";
import ResultPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

/** A complete plan. KES 30,000 at the fixture rate of 130 is USD 230.77, under the ceiling. */
const ELIGIBLE = {
  from: "KE",
  to: "UG",
  border: "busia",
  product: "beans-dry",
  qty: "5",
  unit: "bags",
  currency: "KES",
  value: "30000",
};

/** The same plan minus some of its parts, for the "sent back a step" cases. */
const without = (...keys: Array<keyof typeof ELIGIBLE>) =>
  Object.fromEntries(Object.entries(ELIGIBLE).filter(([key]) => !keys.includes(key as never)));

const verdictHeading = () => screen.getByRole("heading", { level: 1 });
const checklistItems = () =>
  within(screen.getByRole("region", { name: messages.result.checklistTitle })).getAllByRole(
    "listitem",
  );

describe("result screen — verdicts", () => {
  it("titles the page", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.result.meta);

    await renderScreen(ResultPage, ELIGIBLE);
    expect(screen.getByText(messages.result.headerTitle)).toBeInTheDocument();
  });

  it("gives one verdict, labelled, announced politely and summarised in the trader's terms", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    expect(verdictHeading()).toHaveTextContent(messages.verdict.likely_str_eligible);
    expect(screen.getByText(messages.result.verdictLabel)).toBeInTheDocument();
    expect(verdictHeading().closest("section")).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByText("Beans, dry. 5 bags worth KES 30,000, Kenya to Uganda through Busia."),
    ).toBeInTheDocument();
    expect(screen.getByText(messages.result.caveat)).toBeInTheDocument();
  });

  it("names the dollar ceiling from rule data when the value is over it", async () => {
    // KES 400,000 at 130 is USD 3,076.92, above the USD 2,000 rule condition.
    await renderScreen(ResultPage, { ...ELIGIBLE, value: "400000" });

    expect(verdictHeading()).toHaveTextContent(
      "Above USD 2,000: the standard customs procedure applies",
    );
  });

  it("says so when the product is not on the Common List", async () => {
    await renderScreen(ResultPage, { ...ELIGIBLE, product: "bean-flour" });

    expect(verdictHeading()).toHaveTextContent(messages.verdict.not_on_common_list);
  });

  it("cannot confirm when the product's list status is unknown, and never guesses (CLAUDE.md rule 4)", async () => {
    await renderScreen(ResultPage, { ...ELIGIBLE, product: "maize-grain" });

    expect(verdictHeading()).toHaveTextContent(messages.verdict.cannot_confirm);
    expect(screen.getByText(messages.result.noChecklist)).toBeInTheDocument();
  });

  it("cannot confirm when the trader skipped the product match", async () => {
    await renderScreen(ResultPage, without("product"));

    expect(verdictHeading()).toHaveTextContent(messages.verdict.cannot_confirm);
    expect(
      screen.getByText(
        "Goods not matched. 5 bags worth KES 30,000, Kenya to Uganda through Busia.",
      ),
    ).toBeInTheDocument();
  });

  it("shows no checklist rather than an empty promise when no requirements apply", async () => {
    await renderScreen(ResultPage, { ...ELIGIBLE, value: "400000" });

    expect(screen.getByText(messages.result.noChecklist)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

describe("result screen — checklist", () => {
  it("lists the requirements the matched rule asks for, in rule order", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const items = checklistItems();
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("Get a Simplified Certificate of Origin");
    expect(items[1]).toHaveTextContent("Fill in the Simplified Customs Document");
    expect(items[2]).toHaveTextContent("Keep the value under USD 2,000 for this crossing");
    expect(items[3]).toHaveTextContent("[Product-specific requirement]");
  });

  it("renders a trust state on every item (CLAUDE.md rule 3)", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const items = checklistItems();
    const labels = Object.values(messages.trust.badge);
    const calloutTitles = [
      messages.trust.callout.unverified,
      messages.trust.callout.conflictingGeneric,
      "Sources disagree on the fee",
    ];
    for (const item of items) {
      const shown = [...labels, ...calloutTitles].some((text) => item.textContent?.includes(text));
      expect(shown).toBe(true);
    }
  });

  it("flags the item where sources disagree, naming the subject", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const sco = checklistItems()[0];
    expect(sco).toHaveTextContent("Sources disagree on the fee");
    expect(sco).toHaveTextContent("Ask the Trade Information Desk before paying.");
  });

  it("flags an item whose only source was not re-checked", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const productItem = checklistItems()[3];
    expect(productItem).toHaveTextContent(messages.trust.callout.unverified);
    expect(productItem).toHaveTextContent("Confirm with [authority] before you travel.");
  });

  it("marks a fully sourced item verified and cites its source", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const scd = checklistItems()[1];
    expect(within(scd).getByText(messages.trust.badge.verified)).toBeInTheDocument();
    expect(scd).toHaveTextContent("[Source name]");
  });

  it("says when a source has no check date instead of implying one", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    expect(screen.getAllByText(/\[date not recorded\]/).length).toBeGreaterThan(0);
  });

  it("shows the official fee and where to get the document, as recorded", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const scd = checklistItems()[1];
    expect(scd).toHaveTextContent("Official fee: [OFFICIAL FEE]");
    expect(scd).toHaveTextContent("Where: [office at Busia]");
  });

  it("counts ticked items as the trader works through them", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    expect(screen.getByText("0 of 4 done")).toBeInTheDocument();

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(4);
    fireEvent.click(boxes[0]);
    expect(boxes[0]).toBeChecked();
    expect(screen.getByText("1 of 4 done")).toBeInTheDocument();

    fireEvent.click(boxes[0]);
    expect(screen.getByText("0 of 4 done")).toBeInTheDocument();
  });
});

describe("result screen — disclaimer, actions and help", () => {
  it("carries the disclaimer on every verdict (CLAUDE.md rule 2)", async () => {
    for (const params of [
      ELIGIBLE,
      { ...ELIGIBLE, value: "400000" },
      { ...ELIGIBLE, product: "bean-flour" },
      { ...ELIGIBLE, product: "maize-grain" },
    ]) {
      const { unmount } = await renderScreen(ResultPage, params);
      expect(screen.getByText(messages.disclaimer)).toBeInTheDocument();
      unmount();
    }
  });

  it("offers save and asks for sign-in only there", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    expect(screen.getByRole("link", { name: messages.result.save })).toHaveAttribute(
      "href",
      "/plans",
    );
    expect(screen.getByText(messages.result.signInNote)).toBeInTheDocument();
  });

  it("shares to WhatsApp as plain text with the verdict, the items and their sources", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const share = screen.getByRole("link", { name: messages.result.share });
    const href = share.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(share).toHaveAttribute("rel", "noopener noreferrer");

    const text = decodeURIComponent(href.slice("https://wa.me/?text=".length));
    expect(text).toContain(messages.share.title);
    expect(text).toContain(messages.verdict.likely_str_eligible);
    expect(text).toContain("1. Get a Simplified Certificate of Origin");
    expect(text).toContain("Official fee: [OFFICIAL FEE]");
    expect(text).toContain("Source: [KRA STR information pack]");
    expect(text).toContain(messages.share.footer);
  });

  it("points at the Trade Information Desk for the chosen crossing", async () => {
    await renderScreen(ResultPage, { ...ELIGIBLE, border: "malaba" });

    expect(screen.getByRole("heading", { name: messages.result.helpTitle })).toBeInTheDocument();
    expect(
      screen.getByText("Ask the Trade Information Desk at Malaba. [Desk contact details]"),
    ).toBeInTheDocument();
  });

  it("goes back to the value step with the plan intact", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const back = screen.getByRole("link", { name: messages.common.back });
    expect(back.getAttribute("href")).toContain("/plan/value?");
    expect(back.getAttribute("href")).toContain("value=30000");
  });
});

describe("result screen — incomplete plans go back to the step that collects the gap", () => {
  it("sends a plan with no value to step 3", async () => {
    const target = await redirectTarget(ResultPage, without("value", "qty"));

    expect(target).toContain("/en/plan/value?");
    expect(target).toContain("product=beans-dry");
  });

  it("sends a plan with a quantity but no value to step 3", async () => {
    expect(await redirectTarget(ResultPage, without("value"))).toContain("/en/plan/value?");
  });

  it("sends an unknown product back to step 2, without the stale id", async () => {
    const target = await redirectTarget(ResultPage, { ...ELIGIBLE, product: "unicorn-horn" });

    expect(target).toContain("/en/plan/product?");
    expect(target).not.toContain("product=unicorn-horn");
  });

  it("sends an unknown crossing back to step 1", async () => {
    expect(await redirectTarget(ResultPage, { ...ELIGIBLE, border: "never-heard-of-it" })).toBe(
      "/en/plan/route",
    );
  });
});
