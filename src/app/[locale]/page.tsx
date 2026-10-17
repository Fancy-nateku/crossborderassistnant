import { getTranslations, setRequestLocale } from "next-intl/server";
import { Column } from "@/components/plan/column";
import { ROUTE_PROGRESS, RouteStrip } from "@/components/plan/route-strip";
import { Disclaimer } from "@/components/trust/disclaimer";
import { TrustBadge } from "@/components/trust/trust-badge";
import { LinkButton } from "@/components/ui/button";
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
    <Column>
      <header className="flex items-center justify-between border-b border-line bg-panel px-5 py-4">
        <p className="m-0 text-lg font-bold text-brand">{t("app.name")}</p>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-col gap-5 border-b border-line bg-panel px-5 pt-8 pb-7">
          <h1 className="m-0 text-[34px] leading-[1.12] font-bold">{t("landing.title")}</h1>
          <p className="m-0 text-[17px] leading-[1.5] text-ink-muted">{t("landing.body")}</p>
          <RouteStrip
            from="KE"
            to="UG"
            borderName={border?.name ?? ""}
            progress={ROUTE_PROGRESS.landing}
            size="hero"
          />
          <LinkButton href="/plan/route">{t("landing.cta")}</LinkButton>
          <p className="m-0 text-sm text-ink-muted">{t("landing.noAccount")}</p>
        </section>

        <section className="flex flex-col gap-4 px-5 py-7">
          <h2 className="m-0 text-[22px] leading-[1.2] font-bold">{t("landing.stepsTitle")}</h2>
          <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
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

        <section className="mx-5 flex flex-col gap-2.5 rounded-control border border-line bg-panel p-[18px]">
          <h2 className="m-0 text-lg font-bold">{t("landing.trustTitle")}</h2>
          <div className="flex flex-wrap gap-2">
            {TRUST_BADGES.map((state) => (
              <TrustBadge key={state} state={state} />
            ))}
          </div>
          <p className="m-0 text-[15px] leading-[1.45] text-ink-muted">{t("landing.trustNote")}</p>
        </section>

        <section className="flex flex-col gap-4 px-5 pt-6 pb-8">
          <LinkButton href="/plans" variant="secondary">
            {t("landing.openSaved")}
          </LinkButton>
          <Disclaimer />
        </section>
      </main>
    </Column>
  );
}
