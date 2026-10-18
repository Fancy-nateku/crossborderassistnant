import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { messages, metadataTitle, renderScreen } from "@/test/screen";
import HelpPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

describe("help screen", () => {
  it("titles the page", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.help.meta);

    await renderScreen(HelpPage);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.help.title);
  });

  it("renders every question as a collapsed disclosure with its answer", async () => {
    const { container } = await renderScreen(HelpPage);

    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(messages.help.items.length);
    for (const item of details) {
      expect(item).not.toHaveAttribute("open");
    }
    for (const { q, a } of messages.help.items) {
      expect(screen.getByText(q)).toBeInTheDocument();
      expect(screen.getByText(a)).toBeInTheDocument();
    }
  });

  it("answers the account and clearance questions traders ask first", async () => {
    await renderScreen(HelpPage);

    expect(screen.getByText("Do I need an account?")).toBeInTheDocument();
    expect(screen.getByText("No. Only to save a plan.")).toBeInTheDocument();
    expect(screen.getByText("No. It is guidance. Border officials decide.")).toBeInTheDocument();
  });

  it("ends with a link into the wizard", async () => {
    await renderScreen(HelpPage);

    expect(screen.getByRole("link", { name: messages.help.cta })).toHaveAttribute(
      "href",
      "/plan/route",
    );
  });
});
