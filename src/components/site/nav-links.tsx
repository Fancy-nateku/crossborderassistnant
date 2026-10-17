"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  { href: "/", key: "home" },
  { href: "/how-it-works", key: "how" },
  { href: "/about", key: "about" },
  { href: "/help", key: "help" },
  { href: "/plans", key: "plans" },
] as const;

/** Page links. Client-side only to mark the current page. */
export function NavLinks({ layout }: { layout: "row" | "stack" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <ul
      className={`m-0 flex list-none p-0 ${layout === "row" ? "items-center gap-1" : "flex-col"}`}
    >
      {LINKS.map(({ href, key }) => {
        const current = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-control px-3 font-bold no-underline ${
                current ? "text-brand underline underline-offset-8" : "text-ink hover:text-brand-dark"
              }`}
            >
              {t(key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
