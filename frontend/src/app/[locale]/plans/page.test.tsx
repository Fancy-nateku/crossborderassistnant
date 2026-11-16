import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages, metadataTitle, renderScreen } from "@/test/screen";
import { saveDevicePlan } from "@/lib/plan/device-plans";
import PlansPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

const firstInput = {
  from: "KE",
  to: "UG",
  borderId: "busia",
  productId: "beans-dry",
  quantity: 5,
  unit: "bags",
  currency: "KES",
  valueLocal: 30000,
} as const;

const secondInput = {
  ...firstInput,
  borderId: "malaba",
  productId: "maize-grain",
  quantity: null,
  valueLocal: null,
} as const;

const cards = () => screen.getAllByRole("link", { name: /to Uganda/ });

/** Stubs /api/auth/session; the page waits for it before choosing which list to show. */
function stubSession(user: { id: string } | null, planList: unknown[] = []) {
  const fetchMock = vi.fn(async (url: string) =>
    Response.json(url.startsWith("/api/auth/session") ? { user } : { data: planList }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function renderPlans() {
  await renderScreen(PlansPage);
  await act(async () => {});
}

beforeEach(() => {
  window.localStorage.clear();
  stubSession(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saved plans screen", () => {
  it("titles the page and explains that plans stay on this device", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.plans.meta);

    await renderPlans();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.plans.title);
    expect(screen.getByText(messages.plans.deviceNote)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("shows an empty state without requiring an account", async () => {
    await renderPlans();

    expect(screen.getByText(messages.plans.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages.plans.emptyCta })).toHaveAttribute(
      "href",
      "/plan/route",
    );
  });

  it("shows a recoverable warning when saved browser data is malformed", async () => {
    window.localStorage.setItem("crossborderassist.device-plans.v1", "{");
    await renderPlans();

    expect(screen.getByRole("alert")).toHaveTextContent(messages.plans.storageUnavailable);
  });

  it("lists locally saved plans and reopens them with their own inputs", async () => {
    saveDevicePlan({
      input: firstInput,
      borderName: "Busia",
      productName: "Beans, dry",
      verdict: "likely_str_eligible",
      totalCount: 2,
      requirementIds: ["origin", "declaration"],
    });
    saveDevicePlan({
      input: secondInput,
      borderName: "Malaba",
      productName: "Maize grain",
      verdict: "cannot_confirm",
      totalCount: 0,
      requirementIds: [],
    });

    await renderPlans();

    expect(cards()).toHaveLength(2);
    const beans = cards().find((card) => card.textContent?.includes("Beans, dry to Uganda"));
    const maize = cards().find((card) => card.textContent?.includes("Maize grain to Uganda"));
    expect(beans).toHaveTextContent("Through Busia. 5 bags, KES 30,000.");
    expect(maize).toHaveTextContent("Through Malaba.");
    expect(beans?.getAttribute("href")).toContain("/plan/result?");
    expect(beans?.getAttribute("href")).toContain("product=beans-dry");
    expect(beans?.getAttribute("href")).toContain("border=busia");
    expect(beans?.getAttribute("href")).toContain("value=30000");
    expect(beans).toHaveTextContent(/Saved \d/);
    expect(maize).toHaveTextContent(/Saved \d/);
  });

  it("requires confirmation before removing a saved plan", async () => {
    saveDevicePlan({
      input: firstInput,
      borderName: "Busia",
      productName: "Beans, dry",
      verdict: "likely_str_eligible",
      totalCount: 1,
      requirementIds: ["origin"],
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await renderPlans();

    fireEvent.click(screen.getByRole("button", { name: messages.plans.delete }));
    expect(confirm).toHaveBeenCalledWith(messages.plans.deleteConfirm);
    expect(cards()).toHaveLength(1);

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: messages.plans.delete }));
    await waitFor(() => expect(screen.getByText(messages.plans.empty)).toBeInTheDocument());
    confirm.mockRestore();
  });

  it("shows only account plans when signed in, never this device's plans", async () => {
    saveDevicePlan({
      input: firstInput,
      borderName: "Busia",
      productName: "Beans, dry",
      verdict: "likely_str_eligible",
      totalCount: 1,
      requirementIds: ["origin"],
    });
    stubSession({ id: "u1" }, [
      {
        id: "p1",
        input: secondInput,
        verdict: "cannot_confirm",
        doneCount: 0,
        totalCount: 0,
        savedAt: "2026-11-10T07:00:00.000Z",
      },
    ]);
    await renderPlans();

    expect(await screen.findByText(/malaba/i)).toBeInTheDocument();
    expect(screen.queryByText(messages.plans.deviceNote)).not.toBeInTheDocument();
    expect(screen.queryByText(/busia/i)).not.toBeInTheDocument();
  });

  it("shows neither list until the session check finishes", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    await renderScreen(PlansPage);

    expect(screen.queryByText(messages.plans.deviceNote)).not.toBeInTheDocument();
    expect(screen.queryByText(messages.plans.empty)).not.toBeInTheDocument();
  });
});
