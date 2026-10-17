import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageIntro } from "@/components/site/page-intro";
import { BottomNav } from "@/components/site/bottom-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { TrustBadge } from "@/components/trust/trust-badge";
import { LinkButton } from "@/components/ui/button";
import { Container, PageShell } from "@/components/ui/container";

type Props = { params: Promise<{ locale: string }> };

const TRUST_STATES = ["verified", "unverified", "conflicting", "unknown"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "how" });
  return { title: t("meta") };
}

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("how");
  const steps = t.raw("steps") as { title: string; body: string }[];

  return (
    <PageShell>
      <SiteHeader />
      <main className="flex-1">
        <Container className="flex flex-col gap-10 py-8 md:gap-12 md:py-14">
          <PageIntro title={t("title")} lead={t("lead")} />

          <section aria-labelledby="steps-title" className="flex flex-col gap-5">
            <h2 id="steps-title" className="m-0 text-[22px] leading-[1.2] font-bold">
              {t("stepsTitle")}
            </h2>
            <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="flex flex-col gap-2 rounded-control border border-line bg-panel p-5"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-full bg-muted font-bold text-brand"
                  >
                    {i + 1}
                  </span>
                  <h3 className="m-0 text-lg font-bold">{step.title}</h3>
                  <p className="m-0 text-base text-ink-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="trust-title" className="flex flex-col gap-5">
            <h2 id="trust-title" className="m-0 text-[22px] leading-[1.2] font-bold">
              {t("trustTitle")}
            </h2>
            <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
              {TRUST_STATES.map((state) => (
                <li
                  key={state}
                  className="flex flex-col items-start gap-2 rounded-control border border-line bg-panel p-5"
                >
                  <TrustBadge state={state} />
                  <p className="m-0 text-base">{t(`trust.${state}`)}</p>
                </li>
              ))}
            </ul>
          </section>

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
