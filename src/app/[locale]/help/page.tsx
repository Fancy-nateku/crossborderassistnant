import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/site/page-intro";
import { BottomNav } from "@/components/site/bottom-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { LinkButton } from "@/components/ui/button";
import { Container, PageShell } from "@/components/ui/container";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });
  return { title: t("meta") };
}

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("help");
  const items = t.raw("items") as { q: string; a: string }[];

  return (
    <PageShell>
      <SiteHeader />
      <main className="flex-1">
        <Container className="flex flex-col gap-10 py-8 md:py-14">
          <PageIntro title={t("title")} lead={t("lead")} />

          <div className="flex max-w-3xl flex-col gap-3">
            {items.map((item) => (
              <details
                key={item.q}
                className="group rounded-control border border-line bg-panel open:border-brand"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-lg font-bold marker:hidden [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden="true" className="text-brand group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="m-0 px-5 pb-4 text-base text-ink-muted">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="md:max-w-xs">
            <LinkButton href="/plan/route">{t("cta")}</LinkButton>
          </div>
        </Container>
      </main>
      <SiteFooter />
      <BottomNav />
    </PageShell>
  );
}
