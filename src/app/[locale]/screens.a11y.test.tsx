import { fireEvent, screen, type RenderResult } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { messages, renderScreen } from "@/test/screen";
import AboutPage from "./about/page";
import HelpPage from "./help/page";
import HowItWorksPage from "./how-it-works/page";
import LandingPage from "./page";
import ProductPage from "./plan/product/page";
import ResultPage from "./plan/result/page";
import RoutePage from "./plan/route/page";
import ValuePage from "./plan/value/page";
import PlansPage from "./plans/page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

/** A complete plan, so the result screen reaches a verdict with a checklist. */
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

/**
 * Every screen, rendered the way a trader first meets it. These are the structure
 * and naming rules from CLAUDE.md ("accessible by default") that hold on all of them;
 * sizes, contrast and focus rings are CSS, so they are checked in the browser
 * (`e2e/screens.layout.spec.ts`) instead.
 */
const SCREENS = [
  { name: "landing", render: () => renderScreen(LandingPage) },
  { name: "how it works", render: () => renderScreen(HowItWorksPage) },
  { name: "about", render: () => renderScreen(AboutPage) },
  { name: "help", render: () => renderScreen(HelpPage) },
  { name: "route (step 1)", render: () => renderScreen(RoutePage) },
  { name: "goods (step 2)", render: () => renderScreen(ProductPage) },
  { name: "value (step 3)", render: () => renderScreen(ValuePage) },
  { name: "result", render: () => renderScreen(ResultPage, ELIGIBLE) },
  { name: "saved plans", render: () => renderScreen(PlansPage) },
] as const;

const headings = (view: RenderResult) =>
  [...view.container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")].map((h) => ({
    level: Number(h.tagName[1]),
    text: h.textContent ?? "",
  }));

describe.each(SCREENS)("$name screen is accessible by default", ({ render }) => {
  it("has exactly one first-level heading", async () => {
    const view = await render();

    const h1s = headings(view).filter((h) => h.level === 1);
    expect(h1s).toHaveLength(1);
    expect(h1s[0].text.trim()).not.toBe("");
  });

  it("starts at h1 and never skips a heading level", async () => {
    const view = await render();

    const levels = headings(view).map((h) => h.level);
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((level, i) => {
      expect(level).toBeLessThanOrEqual(levels[i] + 1);
    });
  });

  it("puts its content in a main landmark", async () => {
    await render();

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("names every control the trader can operate", async () => {
    const view = await render();

    // The content screens carry no controls; the wizard screens are covered field by
    // field in their own tests. This guards against an unnamed one appearing anywhere.
    const controls = view.container.querySelectorAll<HTMLElement>(
      "input:not([type=hidden]), select, textarea",
    );
    for (const control of controls) {
      expect(control).toHaveAccessibleName();
    }
  });

  it("names every link and button, so none reads as blank", async () => {
    await render();

    for (const element of [...screen.queryAllByRole("link"), ...screen.queryAllByRole("button")]) {
      expect(element).toHaveAccessibleName();
    }
  });

  it("labels each form so its fields are grouped, not loose", async () => {
    const view = await render();

    for (const fieldset of view.container.querySelectorAll("fieldset")) {
      expect(fieldset).toHaveAccessibleName();
    }
  });

  it("hides the decorative route strip from assistive tech", async () => {
    const view = await render();

    // The strip repeats what the header says in words ("Step 2 of 3"), so it is decorative.
    for (const strip of view.container.querySelectorAll("[aria-hidden=true]")) {
      expect(strip.querySelectorAll("a, button, input, select")).toHaveLength(0);
    }
  });

  it("gives every image a text alternative", async () => {
    const view = await render();

    for (const img of view.container.querySelectorAll("img")) {
      expect(img).toHaveAttribute("alt");
    }
  });
});

describe("screens that change what they say announce it", () => {
  it("announces the verdict politely on the result screen", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    const verdict = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(verdict).toHaveAttribute("aria-live", "polite");
  });

  it("announces the checklist tick count politely", async () => {
    await renderScreen(ResultPage, ELIGIBLE);

    expect(screen.getByText("0 of 4 done")).toHaveAttribute("aria-live", "polite");
  });

  it("announces the live dollar conversion politely on the value step", async () => {
    await renderScreen(ValuePage, { value: "30000" });

    expect(screen.getByText("USD 230.77").closest("[aria-live]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("announces the match count politely on the goods step", async () => {
    await renderScreen(ProductPage, { q: "bean" });

    expect(screen.getByText("3 matches")).toHaveAttribute("aria-live", "polite");
  });

  it("ties each inline error to the field it belongs to", async () => {
    const { container } = await renderScreen(ValuePage);

    fireEvent.submit(container.querySelector("#value-form") as HTMLFormElement);

    const quantity = screen.getByLabelText(messages.value.quantity);
    expect(quantity).toHaveAttribute("aria-invalid", "true");
    expect(quantity).toHaveAccessibleDescription(messages.value.errorQuantity);

    const value = screen.getByLabelText("Total value in Kenyan shillings");
    expect(value).toHaveAttribute("aria-invalid", "true");
    expect(value).toHaveAccessibleDescription(messages.value.errorValue);
  });

  it("describes the goods search box with its hint", async () => {
    await renderScreen(ProductPage);

    expect(screen.getByLabelText(messages.product.searchLabel)).toHaveAccessibleDescription(
      messages.product.searchHint,
    );
  });
});
