"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { BookmarkIcon, HelpIcon, HomeIcon, InfoIcon, PlusIcon } from "@/components/ui/icons";
import { Link, usePathname } from "@/i18n/navigation";
import { TAB_KEYS, navHref, type NavKey } from "./nav-config";

const ICONS: Partial<Record<NavKey, ReactNode>> = {
  home: <HomeIcon />,
  how: <InfoIcon />,
  start: <PlusIcon />,
  plans: <BookmarkIcon />,
  help: <HelpIcon />,
};

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
      <div
        aria-hidden="true"
        className="h-[calc(4.5rem+env(safe-area-inset-bottom))] bg-panel short:h-[calc(3rem+env(safe-area-inset-bottom))] md:hidden"
      />
      <nav
        aria-label={t("label")}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="m-0 grid list-none grid-cols-5 p-0">
          {TAB_KEYS.map((key) => {
            const href = navHref(key);
            const current = pathname === href;
            const primary = key === "start";
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 text-[13px] font-bold no-underline short:min-h-12 short:flex-row short:gap-2 ${
                    current || primary ? "text-brand" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <span
                    className={
                      primary
                        ? `flex size-9 items-center justify-center rounded-control bg-brand text-white short:size-8`
                        : current
                          ? `flex h-9 w-12 items-center justify-center rounded-control bg-muted short:h-8 short:w-9`
                          : `flex h-9 w-12 items-center justify-center short:h-8 short:w-9`
                    }
                  >
                    {ICONS[key]}
                  </span>
                  <span>{t(`short.${key}`)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
