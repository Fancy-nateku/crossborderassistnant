import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => {
  window.localStorage.clear();
});

describe("saved plans screen", () => {
  it("titles the page and explains that plans stay on this device", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.plans.meta);

    await renderScreen(PlansPage);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.plans.title);
    expect(screen.getByText(messages.plans.deviceNote)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("shows an empty state without requiring an account", async () => {
    await renderScreen(PlansPage);

    expect(screen.getByText(messages.plans.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages.plans.emptyCta })).toHaveAttribute(
      "href",
      "/plan/route",
    );
  });

  it("shows a recoverable warning when saved browser data is malformed", async () => {
    window.localStorage.setItem("crossborderassist.device-plans.v1", "{");
    await renderScreen(PlansPage);

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

    await renderScreen(PlansPage);

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
    await renderScreen(PlansPage);

    fireEvent.click(screen.getByRole("button", { name: messages.plans.delete }));
    expect(confirm).toHaveBeenCalledWith(messages.plans.deleteConfirm);
    expect(cards()).toHaveLength(1);

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: messages.plans.delete }));
    await waitFor(() => expect(screen.getByText(messages.plans.empty)).toBeInTheDocument());
    confirm.mockRestore();
  });
});
