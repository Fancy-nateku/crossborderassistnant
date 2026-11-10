import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { messages, metadataTitle, renderScreen } from "@/test/screen";
import AboutPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));
vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

describe("about screen", () => {
  it("titles the page", async () => {
    expect(await metadataTitle(generateMetadata)).toBe(messages.about.meta);

    await renderScreen(AboutPage);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.about.title);
    expect(screen.getByText(messages.about.lead)).toBeInTheDocument();
  });

  it("covers what it does, what it is not, where it stands and who made it", async () => {
    await renderScreen(AboutPage);

    for (const key of ["does", "not", "where", "who"] as const) {
      expect(
        screen.getByRole("heading", { level: 2, name: messages.about[`${key}Title`] }),
      ).toBeInTheDocument();
      expect(screen.getByText(messages.about[key])).toBeInTheDocument();
    }
  });

  it("disclaims being a customs authority (CLAUDE.md rule 2)", async () => {
    await renderScreen(AboutPage);

    expect(screen.getByText(messages.about.not)).toHaveTextContent("Not a customs office");
    expect(screen.getByText(messages.disclaimer)).toBeInTheDocument();
  });

  it("ends with a link into the wizard", async () => {
    await renderScreen(AboutPage);

    expect(screen.getByRole("link", { name: messages.about.cta })).toHaveAttribute(
      "href",
      "/plan/route",
    );
  });
});
