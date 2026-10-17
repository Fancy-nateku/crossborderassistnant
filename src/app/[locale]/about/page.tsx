import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/site/page-intro";
import { BottomNav } from "@/components/site/bottom-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { LinkButton } from "@/components/ui/button";
import { Container, PageShell } from "@/components/ui/container";

type Props = { params: Promise<{ locale: string }> };

const SECTIONS = ["does", "not", "where", "who"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("meta") };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  return (
    <PageShell>
      <SiteHeader />
      <main className="flex-1">
        <Container className="flex flex-col gap-10 py-8 md:gap-12 md:py-14">
          <PageIntro title={t("title")} lead={t("lead")} />

          <div className="grid gap-4 md:grid-cols-2">
            {SECTIONS.map((key) => (
              <section
                key={key}
                className="flex flex-col gap-2 rounded-control border border-line bg-panel p-5 md:p-6"
              >
                <h2 className="m-0 text-xl font-bold">{t(`${key}Title`)}</h2>
                <p className="m-0 text-base text-ink-muted">{t(key)}</p>
              </section>
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
