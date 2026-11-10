import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Container, PageShell } from "@/components/ui/container";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { RouteStripBar } from "./route-strip";
import type { CountryCode } from "@/lib/domain";

/**
 * Wizard screen: header bar, route strip, main, sticky footer with the one primary action.
 * The bars span the full width; content stays in a form-width column.
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
    <PageShell>
      <header className="border-b border-line bg-panel">
        <Container width="narrow" className="flex items-center gap-2 px-3! py-2 md:px-5!">
          <Link
            href={backHref}
            aria-label={t("common.back")}
            className="flex size-11 items-center justify-center text-ink hover:text-brand-dark"
          >
            <ChevronLeftIcon />
          </Link>
          <p className="m-0 text-base font-bold">{t("wizard.stepOf", { step })}</p>
        </Container>
      </header>
      <RouteStripBar
        width="narrow"
        from={from}
        to={to}
        borderName={borderName}
        progress={progress}
      />
      <main className="flex-1">
        <Container width="narrow" className="flex flex-col gap-[22px] py-6 md:gap-7 md:py-10">
          {children}
        </Container>
      </main>
      <footer className="sticky bottom-0 border-t border-line bg-panel">
        <Container width="narrow" className="pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="md:flex md:justify-end [&>*]:md:w-auto [&>*]:md:min-w-72">{footer}</div>
        </Container>
      </footer>
    </PageShell>
  );
}
