// Stands in for `@/i18n/navigation` in tests: next-intl's generated navigation
// pulls in `next/navigation`, which does not resolve under vitest. `Link` keeps the
// href readable (including the plan query) and `redirect` throws like Next's does.
import type { ComponentProps, ReactNode } from "react";

type Query = Record<string, string | number | undefined>;
export type Href = string | { pathname: string; query?: Query };

/** Thrown by `redirect`, mirroring Next's "redirect() throws" contract. */
export class RedirectSignal extends Error {
  constructor(readonly to: string) {
    super(`NEXT_REDIRECT ${to}`);
    this.name = "RedirectSignal";
  }
}

/** "/plan/value?border=busia&value=30000" */
export function hrefToString(href: Href): string {
  if (typeof href === "string") return href;
  const entries = Object.entries(href.query ?? {}).filter(([, v]) => v !== undefined);
  const query = new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  return query ? `${href.pathname}?${query}` : href.pathname;
}

export const pathname = { current: "/" };

export const usePathname = () => pathname.current;

export const getPathname = ({ href, locale }: { href: Href; locale: string }) =>
  `/${locale}${hrefToString(href)}`;

export function redirect({ href, locale }: { href: Href; locale: string }): never {
  throw new RedirectSignal(getPathname({ href, locale }));
}

export function Link({
  href,
  children,
  ...rest
}: Omit<ComponentProps<"a">, "href"> & { href: Href; children?: ReactNode }) {
  return (
    <a href={hrefToString(href)} {...rest}>
      {children}
    </a>
  );
}
