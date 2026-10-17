import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Column } from "./column";
import { RouteStrip } from "./route-strip";
import type { CountryCode } from "@/lib/domain";

/**
 * Wizard screen: header bar, route strip, main, sticky footer with the one primary action.
 */
export function WizardShell({
  step,
  backHref,
  from,
  to,
  borderName,
  progress,
  footer,
  children,
}: {
  step: 1 | 2 | 3;
  backHref: Parameters<typeof Link>[0]["href"];
  from: CountryCode;
  to: CountryCode;
  borderName: string;
  progress: number;
  footer: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations();

  return (
    <Column>
      <header className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2">
        <Link
          href={backHref}
          aria-label={t("common.back")}
          className="flex size-11 items-center justify-center text-ink hover:text-brand-dark"
        >
          <ChevronLeftIcon />
        </Link>
        <p className="m-0 text-base font-bold">{t("wizard.stepOf", { step })}</p>
      </header>
      <RouteStrip from={from} to={to} borderName={borderName} progress={progress} />
      <main className="flex flex-1 flex-col gap-[22px] px-5 py-6">{children}</main>
      <footer className="sticky bottom-0 border-t border-line bg-panel px-5 pt-4 pb-6">
        {footer}
      </footer>
    </Column>
  );
}
