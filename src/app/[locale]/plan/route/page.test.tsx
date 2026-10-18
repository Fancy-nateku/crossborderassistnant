import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { borders } from "@/lib/data/mock/fixtures";
import { messages, metadataTitle, renderScreen } from "@/test/screen";
import RoutePage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

const crossings = () =>
  within(
    screen.getByRole("group", { name: messages.route.crossing }),
  ).getAllByRole("radio") as HTMLInputElement[];

describe("route screen (step 1)", () => {
  it("titles the page and marks it as the first of three steps", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.route.meta);

    await renderScreen(RoutePage);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.route.title);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages.common.back })).toHaveAttribute("href", "/");
  });

  it("defaults to Kenya to Uganda", async () => {
    await renderScreen(RoutePage);

    expect(screen.getByLabelText(messages.route.from)).toHaveValue("KE");
    expect(screen.getByLabelText(messages.route.to)).toHaveValue("UG");
  });

  it("offers every active crossing from the repository, Busia selected", async () => {
    await renderScreen(RoutePage);

    const radios = crossings();
    expect(radios.map((r) => r.value)).toEqual(borders.filter((b) => b.active).map((b) => b.id));
    expect(radios.find((r) => r.value === "busia")).toBeChecked();
    expect(screen.getByText("One-stop border post")).toBeInTheDocument();
  });

  it("keeps the crossing the trader already chose", async () => {
    await renderScreen(RoutePage, { border: "malaba" });

    expect(crossings().find((r) => r.value === "malaba")).toBeChecked();
    expect(screen.getAllByText("Malaba").length).toBeGreaterThan(0);
  });

  it("falls back to a known crossing when the URL names an unknown one", async () => {
    await renderScreen(RoutePage, { border: "never-heard-of-it" });

    const radios = crossings();
    expect(radios.filter((r) => r.checked)).toHaveLength(1);
    expect(radios.find((r) => r.value === "busia")).toBeChecked();
  });

  it("says uncovered crossings are not covered, instead of guessing (CLAUDE.md rule 4)", async () => {
    await renderScreen(RoutePage);

    expect(screen.getByText(messages.route.otherTitle)).toBeInTheDocument();
    expect(screen.getByText(messages.route.otherBody)).toBeInTheDocument();
  });

  it("submits to the goods step and works without client JS", async () => {
    const { container } = await renderScreen(RoutePage);

    const form = container.querySelector("#route-form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/en/plan/product");
    expect(screen.getByRole("button", { name: messages.route.next })).toHaveAttribute(
      "form",
      "route-form",
    );
  });

  it("carries the rest of the plan through hidden fields", async () => {
    const { container } = await renderScreen(RoutePage, {
      product: "beans-dry",
      qty: "5",
      unit: "bags",
      currency: "KES",
      value: "30000",
    });

    const hidden = Object.fromEntries(
      [...container.querySelectorAll<HTMLInputElement>("input[type=hidden]")].map((i) => [
        i.name,
        i.value,
      ]),
    );
    expect(hidden).toMatchObject({
      product: "beans-dry",
      qty: "5",
      unit: "bags",
      currency: "KES",
      value: "30000",
    });
    // from, to and border come from the visible controls on this screen.
    expect(hidden).not.toHaveProperty("border");
  });
});
