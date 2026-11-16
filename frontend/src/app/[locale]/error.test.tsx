import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { messages } from "@/test/screen";
import LocaleError from "./error";

vi.mock("@/i18n/navigation", () => import("@/test/mocks/navigation"));

describe("locale error screen", () => {
  it("keeps the site navigation so people can still move around", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LocaleError error={new Error("boom")} reset={() => {}} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(messages.error.message);
    expect(screen.getAllByRole("navigation", { name: messages.nav.label }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: messages.app.name })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: messages.nav.short.plans })).toHaveAttribute("href", "/plans");
  });
});
