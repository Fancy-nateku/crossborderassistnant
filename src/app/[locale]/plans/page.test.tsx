import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/lib/auth";
import { savedPlans } from "@/lib/data/mock/fixtures";
import type { SavedPlan } from "@/lib/domain";
import { messages, metadataTitle, renderScreen } from "@/test/screen";
import PlansPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

// What the screen reads is swapped per test: saved plans and sign-in are both
// stubs until the backend lands, and the empty state needs its own data.
const state = vi.hoisted(() => ({
  plans: null as SavedPlan[] | null,
  session: { identifier: "07XX XXX XXX" } as Session | null,
}));

vi.mock("@/lib/auth", () => ({ getSession: async () => state.session }));
vi.mock("@/lib/data", async () => {
  const { mockRepository } = await import("@/lib/data/mock/repository");
  return {
    repository: {
      ...mockRepository,
      listSavedPlans: async () => state.plans ?? mockRepository.listSavedPlans(),
    },
  };
});

const cards = () => screen.getAllByRole("link", { name: /to Uganda/ });

beforeEach(() => {
  state.plans = null;
  state.session = { identifier: "07XX XXX XXX" };
});

describe("saved plans screen", () => {
  it("titles the page", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.plans.meta);

    await renderScreen(PlansPage);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.plans.title);
  });

  it("shows who is signed in", async () => {
    await renderScreen(PlansPage);
    expect(screen.getByText("07XX XXX XXX")).toBeInTheDocument();
  });

  it("still lists plans when nobody is signed in", async () => {
    state.session = null;
    await renderScreen(PlansPage);

    expect(screen.queryByText("07XX XXX XXX")).not.toBeInTheDocument();
    expect(cards()).toHaveLength(savedPlans.length);
  });

  it("names each plan by its goods, destination and crossing", async () => {
    await renderScreen(PlansPage);

    const [first, second] = cards();
    expect(first).toHaveTextContent("Beans, dry to Uganda");
    expect(first).toHaveTextContent("Through Busia. 5 bags, KES 30,000.");
    expect(second).toHaveTextContent("Maize grain to Uganda");
    expect(second).toHaveTextContent("Through Malaba.");
  });

  it("shows checklist progress, and 'not started' instead of zero", async () => {
    await renderScreen(PlansPage);

    const [first, second] = cards();
    expect(within(first).getByText("1 of 4 done")).toBeInTheDocument();
    expect(within(second).getByText(messages.plans.notStarted)).toBeInTheDocument();
  });

  it("dates each save", async () => {
    await renderScreen(PlansPage);

    expect(screen.getAllByText("Saved 7 Oct 2026")).toHaveLength(savedPlans.length);
  });

  it("warns when a rule changed since the plan was saved", async () => {
    await renderScreen(PlansPage);

    expect(screen.getAllByText(messages.plans.ruleChanged)).toHaveLength(1);
    expect(cards()[1]).toHaveTextContent(messages.plans.ruleChanged);
  });

  it("reopens a plan on the result screen with its own inputs", async () => {
    await renderScreen(PlansPage);

    const href = cards()[0].getAttribute("href") ?? "";
    expect(href).toContain("/plan/result?");
    expect(href).toContain("product=beans-dry");
    expect(href).toContain("border=busia");
    expect(href).toContain("value=30000");
  });

  it("offers a new plan alongside the saved ones", async () => {
    await renderScreen(PlansPage);

    expect(screen.getByRole("link", { name: messages.plans.newPlan })).toHaveAttribute(
      "href",
      "/plan/route",
    );
  });

  it("asks for a first plan when there are none", async () => {
    state.plans = [];
    await renderScreen(PlansPage);

    expect(screen.getByText(messages.plans.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages.plans.emptyCta })).toHaveAttribute(
      "href",
      "/plan/route",
    );
    expect(screen.queryByRole("link", { name: messages.plans.newPlan })).not.toBeInTheDocument();
  });

  it("drops a plan whose crossing is no longer offered rather than rendering a broken card", async () => {
    state.plans = [{ ...savedPlans[0], input: { ...savedPlans[0].input, borderId: "retired" } }];
    await renderScreen(PlansPage);

    expect(screen.queryByText(/to Uganda/)).not.toBeInTheDocument();
    expect(screen.getByText(messages.plans.empty)).toBeInTheDocument();
  });

  it("keeps the site header and bottom nav for getting around", async () => {
    await renderScreen(PlansPage);

    expect(screen.getAllByRole("navigation", { name: messages.nav.label })).not.toHaveLength(0);
    expect(screen.getByRole("link", { name: messages.app.name })).toHaveAttribute("href", "/");
  });
});
