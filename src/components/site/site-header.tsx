import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { navHref } from "./nav-config";
import { NavLinks } from "./nav-links";

const startClass =
  "flex min-h-11 items-center justify-center rounded-control bg-brand px-4 font-bold text-white no-underline hover:bg-brand-dark hover:text-white";

/** Header for the content pages. The plan wizard keeps its own focused header. */
export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="border-b border-line bg-panel">
      <Container className="flex items-center justify-between gap-4 py-1.5">
        {/* min-h-11 keeps the wordmark a 44 px tap target (CLAUDE.md), which also makes
            the header one height on phones and on desktop, where Start already sets it. */}
        <Link
          href="/"
          className="flex min-h-11 items-center text-lg font-bold text-brand no-underline"
        >
          {t("app.name")}
        </Link>

        <nav aria-label={t("nav.label")} className="hidden items-center gap-3 md:flex">
          <NavLinks layout="row" />
          <Link href={navHref("start")} className={startClass}>
            {t("nav.start")}
          </Link>
        </nav>
      </Container>
    </header>
  );
}
