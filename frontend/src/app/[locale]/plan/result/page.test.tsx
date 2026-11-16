import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages, metadataTitle, redirectTarget, renderScreen } from "@/test/screen";
import { parsePlanInput } from "@/lib/plan/params";
import ResultPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

type Call = { url: string; method: string; body?: string };

/** A fake backend: the session, the account's saved plans, and the save/tick endpoints. */
function stubBackend(options: { user?: boolean; existing?: { id: string; done: string[] } } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: init?.body as string | undefined });
      if (url.startsWith("/api/auth/session")) {
        return Response.json(options.user ? { user: { id: "u1" } } : {});
      }
      if (url === "/api/v1/saved-plans" && method === "GET") {
        const input = parsePlanInput(ELIGIBLE);
        return Response.json({
          data: options.existing ? [{ id: options.existing.id, input }] : [],
        });
      }
      if (url === "/api/v1/saved-plans" && method === "POST") {
        return Response.json({ data: { id: "plan-9" } }, { status: 201 });
      }
      if (/^\/api\/v1\/saved-plans\/[^/]+$/.test(url) && options.existing) {
        const items = ["req-sco", "req-scd", "req-threshold", "req-product"].map((requirementId) => ({
          requirementId,
          done: options.existing?.done.includes(requirementId) ?? false,
        }));
        return Response.json({ data: { items } });
      }
      return Response.json({ data: {} });
    }),
  );
  return calls;
}

beforeEach(() => {
  window.localStorage.clear();
  stubBackend();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("marks an item with no check date unverified and cites its source", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const scd = checklistItems()[1];
    expect(within(scd).getByText(messages.trust.callout.unverified)).toBeInTheDocument();
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

  it("counts ticks as they are made", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    expect(screen.getByText("0 of 4 done")).toBeInTheDocument();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(4);
    fireEvent.click(boxes[0]);
    expect(boxes[0]).toBeChecked();
    expect(screen.getByText("1 of 4 done")).toBeInTheDocument();
  });

  it("picks up the ticks of a plan the account already saved, and keeps them in step", async () => {
    const calls = stubBackend({ user: true, existing: { id: "plan-3", done: ["req-scd", "req-sco"] } });
    await renderScreen(ResultPage, ELIGIBLE);

    await waitFor(() => expect(screen.getByText("2 of 4 done")).toBeInTheDocument());
    expect(screen.getByText(messages.account.saved)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: messages.account.saveButton })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("checkbox").find((box) => !(box as HTMLInputElement).checked)!);
    await waitFor(() => expect(screen.getByText("3 of 4 done")).toBeInTheDocument());
    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch?.url).toMatch(/^\/api\/v1\/saved-plans\/plan-3\/checklist-items\//);
    expect(patch?.body).toBe(JSON.stringify({ done: true }));
  });

  it("rolls a tick back and says so when the account cannot be updated", async () => {
    stubBackend({ user: true, existing: { id: "plan-3", done: [] } });
    const base = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "PATCH" ? new Response("{}", { status: 502 }) : base(url, init)));
    await renderScreen(ResultPage, ELIGIBLE);
    await waitFor(() => expect(screen.getByText(messages.account.saved)).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("checkbox")[0]);

    await waitFor(() =>
      expect(screen.getAllByRole("alert").map((el) => el.textContent)).toContain(messages.account.syncFailed),
    );
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

  it("sends a signed-out trader to sign in, and back to this result afterwards", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const link = await screen.findByRole("link", { name: messages.result.signInToSave });
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("/login?next=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("/plan/result?from=KE&to=UG&border=busia");
    expect(screen.queryByRole("button", { name: messages.account.saveButton })).not.toBeInTheDocument();
  });

  it("saves to the account with the ticks made so far, then shows the saved state", async () => {
    const calls = stubBackend({ user: true });
    await renderScreen(ResultPage, ELIGIBLE);

    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(await screen.findByRole("button", { name: messages.account.saveButton }));

    await waitFor(() => expect(screen.getByText(messages.account.saved)).toBeInTheDocument());
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    const patches = calls.filter((c) => c.method === "PATCH");
    expect(patches).toHaveLength(2);
    expect(patches.every((c) => c.url.startsWith("/api/v1/saved-plans/plan-9/checklist-items/"))).toBe(true);
    expect(screen.getByText("2 of 4 done")).toBeInTheDocument();
  });

  it("does not offer a device-only save any more", async () => {
    await renderScreen(ResultPage, ELIGIBLE);
    await act(async () => {});

    expect(screen.queryByRole("button", { name: "Save plan" })).not.toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
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
    expect(screen.getByText(messages.result.helpNoContact)).toBeInTheDocument();
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
