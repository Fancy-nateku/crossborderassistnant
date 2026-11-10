import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { messages, metadataTitle, renderScreen } from "@/test/screen";
import HowItWorksPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

describe("how it works screen", () => {
  it("titles the page", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.how.meta);

    await renderScreen(HowItWorksPage);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.how.title);
    expect(screen.getByText(messages.how.lead)).toBeInTheDocument();
  });

  it("lists the four steps from the message file, in order", async () => {
    await renderScreen(HowItWorksPage);

    const section = screen.getByRole("region", { name: messages.how.stepsTitle });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(messages.how.steps.length);
    messages.how.steps.forEach((step, i) => {
      expect(items[i]).toHaveTextContent(step.title);
      expect(items[i]).toHaveTextContent(step.body);
    });
  });

  it("explains each trust label beside the badge it belongs to", async () => {
    await renderScreen(HowItWorksPage);

    const section = screen.getByRole("region", { name: messages.how.trustTitle });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(4);

    const pairs = [
      [messages.trust.badge.verified, messages.how.trust.verified],
      [messages.trust.badge.unverified, messages.how.trust.unverified],
      [messages.trust.badge.conflicting, messages.how.trust.conflicting],
      [messages.trust.badge.unknown, messages.how.trust.unknown],
    ];
    pairs.forEach(([badge, explanation], i) => {
      expect(items[i]).toHaveTextContent(badge);
      expect(items[i]).toHaveTextContent(explanation);
    });
  });

  it("ends with a link into the wizard", async () => {
    await renderScreen(HowItWorksPage);

    expect(screen.getByRole("link", { name: messages.how.cta })).toHaveAttribute(
      "href",
      "/plan/route",
    );
  });
});
