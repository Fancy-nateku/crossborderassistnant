"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BookmarkIcon, HelpIcon, HomeIcon, InfoIcon, PlusIcon } from "@/components/ui/icons";
import { Link, usePathname } from "@/i18n/navigation";

const TABS = [
  { href: "/", key: "home", icon: <HomeIcon /> },
  { href: "/how-it-works", key: "how", icon: <InfoIcon /> },
  { href: "/plan/route", key: "start", icon: <PlusIcon />, primary: true },
  { href: "/plans", key: "plans", icon: <BookmarkIcon /> },
  { href: "/help", key: "help", icon: <HelpIcon /> },
] as const satisfies readonly { href: string; key: string; icon: ReactNode; primary?: boolean }[];

/**
 * Phone-only tab bar for the content pages. The wizard and result screens
 * keep their own sticky action instead. Tablet and up use the header links.
 */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <>
      {/* Keeps the last content clear of the fixed bar. */}
      <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] bg-panel md:hidden" />
      <nav
        aria-label={t("label")}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="m-0 grid list-none grid-cols-5 p-0">
          {TABS.map((tab) => {
            const current = pathname === tab.href;
            const primary = "primary" in tab;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 text-[13px] font-bold no-underline ${
                    current || primary ? "text-brand" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <span
                    className={
                      primary
                        ? "flex size-9 items-center justify-center rounded-control bg-brand text-white"
                        : current
                          ? "flex h-9 w-12 items-center justify-center rounded-control bg-muted"
                          : "flex h-9 w-12 items-center justify-center"
                    }
                  >
                    {tab.icon}
                  </span>
                  {t(`short.${tab.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
