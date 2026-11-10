// Harness for the screen tests. Pages are async server components, so each test
// awaits the page, then renders the returned tree inside the intl provider the
// real locale layout supplies (the client parts use `useTranslations`).
import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { expect } from "vitest";
import messages from "../../messages/en.json";
import { RedirectSignal } from "./mocks/navigation";

export const LOCALE = "en";

export { messages };

type SearchParams = Record<string, string | string[] | undefined>;

/** Both page shapes: the content pages take `params` only, the plan screens add `searchParams`. */
type Screen = (props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) => Promise<ReactNode>;

export async function renderScreen(
  screen: Screen,
  searchParams: SearchParams = {},
): Promise<RenderResult> {
  const ui = await screen({
    params: Promise.resolve({ locale: LOCALE }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(
    <NextIntlClientProvider locale={LOCALE} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

/** The path a screen redirects to, for the steps that send incomplete plans back. */
export async function redirectTarget(
  screen: Screen,
  searchParams: SearchParams = {},
): Promise<string> {
  try {
    await renderScreen(screen, searchParams);
  } catch (error) {
    if (error instanceof RedirectSignal) return error.to;
    throw error;
  }
  throw new Error("Expected the screen to redirect, but it rendered.");
}

/** Reads the generated <title> so the metadata of each screen is covered too. */
export async function metadataTitle(
  generateMetadata: (props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<SearchParams>;
  }) => Promise<{ title?: unknown }>,
): Promise<string> {
  const { title } = await generateMetadata({
    params: Promise.resolve({ locale: LOCALE }),
    searchParams: Promise.resolve({}),
  });
  expect(typeof title).toBe("string");
  return title as string;
}
