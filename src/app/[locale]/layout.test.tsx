import { describe, expect, it, vi } from "vitest";
import { routing } from "@/i18n/routing";
import { messages } from "@/test/screen";
import LocaleLayout, { generateMetadata, generateStaticParams, viewport } from "./layout";

vi.mock("next-intl/server", () => import("@/test/mocks/intl-server"));

vi.mock("next/font/google", () => ({
  Atkinson_Hyperlegible: () => ({ variable: "--font-atkinson", className: "font-atkinson" }),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const render = (locale: string) =>
  LocaleLayout({ children: null, params: Promise.resolve({ locale }) });

describe("locale shell", () => {
  it("prerenders every locale the routing config declares", () => {
    expect(generateStaticParams()).toEqual(routing.locales.map((locale) => ({ locale })));
  });

  it("names the app in the title and describes it for search and sharing", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(metadata.title).toEqual({
      default: messages.app.name,
      template: `%s | ${messages.app.name}`,
    });
    expect(metadata.description).toBe(messages.app.description);
  });

  it("scales to the device width, for phones at 360 px", () => {
    expect(viewport).toMatchObject({ width: "device-width", initialScale: 1 });
  });

  it("sets the page language from the locale", async () => {
    const tree = (await render("en")) as { props: { lang: string } };

    expect(tree.props.lang).toBe("en");
  });

  it("404s on a locale we do not serve", async () => {
    await expect(render("fr")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
