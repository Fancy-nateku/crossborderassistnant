import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { exchangeRates, rules } from "@/lib/data/mock/fixtures";
import { strThresholdUsd } from "@/lib/rules/evaluate";
import { messages, metadataTitle, redirectTarget, renderScreen } from "@/test/screen";
import ValuePage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

const KES = exchangeRates.find((r) => r.currency === "KES")!;
const totalInput = () => screen.getByLabelText("Total value in Kenyan shillings");

describe("value screen (step 3)", () => {
  it("titles the page and marks it as the last of three steps", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.value.meta);

    await renderScreen(ValuePage);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.value.title);
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
  });

  it("goes back to the goods step with the plan intact", async () => {
    await renderScreen(ValuePage, { product: "beans-dry", border: "malaba" });

    const back = screen.getByRole("link", { name: messages.common.back });
    expect(back.getAttribute("href")).toContain("/plan/product?");
    expect(back.getAttribute("href")).toContain("product=beans-dry");
    expect(back.getAttribute("href")).toContain("border=malaba");
  });

  it("sends an unknown crossing back to step 1 instead of pricing it", async () => {
    expect(await redirectTarget(ValuePage, { border: "never-heard-of-it" })).toBe("/en/plan/route");
  });

  it("asks for quantity, unit and total value", async () => {
    await renderScreen(ValuePage);

    expect(screen.getByLabelText(messages.value.quantity)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.value.unit)).toHaveValue("bags");
    expect(screen.getByText(messages.value.total)).toBeInTheDocument();
    expect(totalInput()).toHaveValue("");
  });

  it("keeps the quantity and value already in the URL", async () => {
    await renderScreen(ValuePage, { qty: "5", unit: "crates", value: "30000" });

    expect(screen.getByLabelText(messages.value.quantity)).toHaveValue(5);
    expect(screen.getByLabelText(messages.value.unit)).toHaveValue("crates");
    expect(totalInput()).toHaveValue("30,000");
  });

  it("converts to dollars with the dated, admin-set rate and says it is illustrative", async () => {
    await renderScreen(ValuePage, { value: "30000", currency: "KES" });

    expect(screen.getByText("USD 230.77")).toBeInTheDocument();
    expect(screen.getByText(/130 KES per dollar, set 7 Oct 2026/)).toHaveTextContent(
      "Customs may use a different rate.",
    );
    expect(screen.getByText(/Example rate for the prototype/)).toBeInTheDocument();
    expect(KES.illustrative).toBe(true);
  });

  it("waits for a value before showing dollars", async () => {
    await renderScreen(ValuePage);

    expect(screen.getByText(messages.value.usdEmpty)).toBeInTheDocument();
    expect(screen.queryByText(/^USD /)).not.toBeInTheDocument();
  });

  it("reconverts when the trader types and when they switch currency", async () => {
    await renderScreen(ValuePage);

    fireEvent.change(totalInput(), { target: { value: "26,000" } });
    expect(screen.getByText("USD 200")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "UGX" }));
    expect(screen.getByRole("button", { name: "UGX" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "KES" })).toHaveAttribute("aria-pressed", "false");
    // 26,000 UGX at 3,700 per dollar.
    expect(screen.getByText("USD 7.03")).toBeInTheDocument();
  });

  it("states the Simplified Trade Regime ceiling from rule data, not a literal", async () => {
    await renderScreen(ValuePage);

    expect(strThresholdUsd(rules)).toBe(2000);
    expect(screen.getByText(/Up to USD 2,000 per crossing/)).toHaveTextContent(
      "if your goods are on the Common List",
    );
  });

  it("blocks an incomplete plan with inline errors and keeps the trader on the step", async () => {
    const { container } = await renderScreen(ValuePage);

    const form = container.querySelector("#value-form") as HTMLFormElement;
    fireEvent.submit(form);

    expect(screen.getByText(messages.value.errorQuantity)).toBeInTheDocument();
    expect(screen.getByText(messages.value.errorValue)).toBeInTheDocument();
    expect(screen.getByLabelText(messages.value.quantity)).toHaveAttribute("aria-invalid", "true");
    expect(totalInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("submits a complete plan to the result screen", async () => {
    const { container } = await renderScreen(ValuePage, {
      qty: "5",
      value: "30000",
      product: "beans-dry",
    });

    const form = container.querySelector("#value-form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/en/plan/result");

    fireEvent.submit(form);
    expect(screen.queryByText(messages.value.errorQuantity)).not.toBeInTheDocument();
    expect(screen.queryByText(messages.value.errorValue)).not.toBeInTheDocument();

    const hidden = Object.fromEntries(
      [...container.querySelectorAll<HTMLInputElement>("input[type=hidden]")].map((i) => [
        i.name,
        i.value,
      ]),
    );
    expect(hidden).toMatchObject({ product: "beans-dry", value: "30000", currency: "KES" });
  });
});
