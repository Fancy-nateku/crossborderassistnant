import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { messages, renderScreen } from "@/test/screen";
import LandingPage from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

describe("landing screen", () => {
  it("leads with the promise and starts a plan without an account", async () => {
    await renderScreen(LandingPage);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.landing.title);
    expect(screen.getByRole("link", { name: messages.landing.cta })).toHaveAttribute(
      "href",
      "/plan/route",
    );
    expect(screen.getByText(messages.landing.noAccount)).toBeInTheDocument();
  });

  it("explains the three steps of the core flow in order", async () => {
    await renderScreen(LandingPage);

    const section = screen
      .getByRole("heading", { name: messages.landing.stepsTitle })
      .closest("section");
    const items = within(section as HTMLElement).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(messages.landing.steps.route.title);
    expect(items[1]).toHaveTextContent(messages.landing.steps.goods.title);
    expect(items[2]).toHaveTextContent(messages.landing.steps.value.title);
  });

  it("names every trust state in words, not colour alone (CLAUDE.md rule 3)", async () => {
    await renderScreen(LandingPage);

    for (const label of Object.values(messages.trust.badge)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText(messages.landing.trustNote)).toBeInTheDocument();
  });

  it("carries the disclaimer and the bottom nav", async () => {
    await renderScreen(LandingPage);

    expect(screen.getByText(messages.disclaimer)).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: messages.nav.label })).not.toHaveLength(0);
  });

  it("shows the default crossing on the route strip", async () => {
    await renderScreen(LandingPage);

    expect(screen.getByText("Busia")).toBeInTheDocument();
  });
});
