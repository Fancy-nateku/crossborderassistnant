import { useTranslations } from "next-intl";
import { Disclaimer } from "@/components/trust/disclaimer";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { FOOTER_KEYS, navHref } from "./nav-config";

export function SiteFooter() {
  const t = useTranslations();

  return (
    <footer className="border-t border-line bg-panel">
      <Container className="flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="m-0 text-base font-bold text-brand">{t("app.name")}</p>
            <p className="m-0 text-sm text-ink-muted">{t("footer.tagline")}</p>
          </div>
          <nav aria-label={t("nav.label")}>
            <ul className="m-0 grid list-none grid-cols-2 gap-x-6 p-0 sm:flex sm:flex-wrap sm:gap-y-1">
              {FOOTER_KEYS.map((key) => (
                <li key={key}>
                  <Link href={navHref(key)} className="flex min-h-11 items-center font-bold">
                    {t(`nav.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="max-w-2xl">
          <Disclaimer />
        </div>
      </Container>
    </footer>
  );
}
