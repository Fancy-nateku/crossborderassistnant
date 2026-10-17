import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en.json";
import { BottomNav } from "./bottom-nav";
import { FOOTER_KEYS, HEADER_KEYS, TAB_KEYS, navHref } from "./nav-config";
import { NavLinks } from "./nav-links";
import { SiteFooter } from "./site-footer";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathname.current,
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const wrap = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );

beforeEach(() => {
  pathname.current = "/";
});

describe("nav config", () => {
  it("only links to known pages and keeps Start out of the top links", () => {
    expect(HEADER_KEYS).not.toContain("start");
    expect(FOOTER_KEYS).not.toContain("start");
    for (const key of [...HEADER_KEYS, ...FOOTER_KEYS, ...TAB_KEYS]) {
      expect(navHref(key)).toMatch(/^\//);
    }
  });
});

describe("NavLinks", () => {
  it("marks only the current page", () => {
    pathname.current = "/about";
    wrap(<NavLinks layout="row" />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });
});

describe("BottomNav", () => {
  it("has five tabs with Start in the middle pointing at the plan wizard", () => {
    wrap(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(links[2]).toHaveAccessibleName("Start");
    expect(links[2]).toHaveAttribute("href", "/plan/route");
  });

  it("marks the current tab", () => {
    pathname.current = "/help";
    wrap(<BottomNav />);
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });
});

describe("SiteFooter", () => {
  it("shows the disclaimer on every page that uses it", () => {
    wrap(<SiteFooter />);
    expect(screen.getByText(messages.disclaimer)).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(FOOTER_KEYS.length);
  });
});
