import { getTranslations, setRequestLocale } from "next-intl/server";
import { ROUTE_PROGRESS, RouteStrip } from "@/components/plan/route-strip";
import { BottomNav } from "@/components/site/bottom-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { TrustBadge } from "@/components/trust/trust-badge";
import { LinkButton } from "@/components/ui/button";
import { Container, PageShell } from "@/components/ui/container";
import { repository } from "@/lib/data";
import { DEFAULT_BORDER_ID } from "@/lib/plan/params";

const STEPS = ["route", "goods", "value"] as const;
const TRUST_BADGES = ["verified", "unverified", "conflicting", "unknown"] as const;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const border = await repository.getBorder(DEFAULT_BORDER_ID);

  return (
    <PageShell>
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-line bg-panel">
          <Container className="grid gap-5 pt-8 pb-7 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-6 lg:py-20">
            <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1 lg:self-end">
              <h1 className="m-0 text-[34px] leading-[1.12] font-bold md:text-[44px] lg:text-[52px]">
                {t("landing.title")}
              </h1>
              <p className="m-0 max-w-xl text-[17px] leading-[1.5] text-ink-muted md:text-lg">
                {t("landing.body")}
              </p>
            </div>

            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
              <RouteStrip
                from="KE"
                to="UG"
                borderName={border?.name ?? ""}
                progress={ROUTE_PROGRESS.landing}
                size="hero"
              />
            </div>

            <div className="flex flex-col gap-5 md:max-w-sm lg:col-start-1 lg:row-start-2 lg:self-start">
              <LinkButton href="/plan/route">{t("landing.cta")}</LinkButton>
              <p className="m-0 text-sm text-ink-muted">{t("landing.noAccount")}</p>
            </div>
          </Container>
        </section>

        <Container className="flex flex-col gap-8 py-7 md:py-10">
          <section className="flex flex-col gap-4">
            <h2 className="m-0 text-[22px] leading-[1.2] font-bold">{t("landing.stepsTitle")}</h2>
            <ol className="m-0 grid list-none gap-3.5 p-0 md:grid-cols-3 md:gap-6">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-3.5">
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-brand"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="m-0 text-[17px] font-bold">{t(`landing.steps.${step}.title`)}</p>
                    <p className="m-0 text-[15px] leading-[1.45] text-ink-muted">
                      {t(`landing.steps.${step}.body`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-2.5 rounded-control border border-line bg-panel p-[18px] md:p-6">
            <h2 className="m-0 text-lg font-bold">{t("landing.trustTitle")}</h2>
            <div className="flex flex-wrap gap-2">
              {TRUST_BADGES.map((state) => (
                <TrustBadge key={state} state={state} />
              ))}
            </div>
            <p className="m-0 text-[15px] leading-[1.45] text-ink-muted">{t("landing.trustNote")}</p>
          </section>
        </Container>
      </main>
      <SiteFooter />
      <BottomNav />
    </PageShell>
  );
}
