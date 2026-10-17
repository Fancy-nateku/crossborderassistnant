import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Checklist } from "@/components/plan/checklist";
import { ROUTE_PROGRESS, RouteStripBar } from "@/components/plan/route-strip";
import { Disclaimer } from "@/components/trust/disclaimer";
import { HelpPanel } from "@/components/trust/help-panel";
import { VerdictCard } from "@/components/trust/verdict-card";
import { ExternalButton, LinkButton } from "@/components/ui/button";
import { Container, PageShell } from "@/components/ui/container";
import { ChevronLeftIcon, ShareIcon } from "@/components/ui/icons";
import { Link, redirect } from "@/i18n/navigation";
import { repository } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { hasValue, parsePlanInput, planToQuery } from "@/lib/plan/params";
import { buildWhatsAppUrl } from "@/lib/plan/share";
import { buildChecklist } from "@/lib/rules/checklist";
import { evaluate } from "@/lib/rules/evaluate";
import { toUsd } from "@/lib/rules/usd";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "result" });
  return { title: t("meta") };
}

export default async function ResultPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const input = parsePlanInput(await searchParams);

  const [border, product, rate, rules] = await Promise.all([
    repository.getBorder(input.borderId),
    input.productId ? repository.getProduct(input.productId) : null,
    repository.getExchangeRate(input.currency),
    repository.listActiveRules(),
  ]);

  // Missing pieces send the trader back to the step that collects them.
  if (!border) redirect({ href: "/plan/route", locale });
  if (input.productId && !product) {
    redirect({ href: { pathname: "/plan/product", query: planToQuery({ ...input, productId: null }) }, locale });
  }
  if (!hasValue(input)) {
    redirect({ href: { pathname: "/plan/value", query: planToQuery(input) }, locale });
  }
  if (!border || !hasValue(input)) return null; // unreachable: redirect() throws

  const valueUsd = toUsd(input.valueLocal, rate);
  const evaluation = evaluate(
    {
      from: input.from,
      to: input.to,
      borderId: input.borderId,
      commonList: product?.onCommonList ?? null,
      valueUsd,
      asOf: new Date().toISOString().slice(0, 10),
    },
    rules,
  );

  const requirements = await repository.getRequirements(evaluation.requirementIds);
  const sources = await repository.getSourcesForRequirements(requirements);
  const items = buildChecklist(evaluation.requirementIds, requirements, sources);

  const threshold =
    rules.find((r) => r.outcome.verdict === "above_threshold")?.conditions.valueUsdAbove ?? null;
  const thresholdLabel = threshold === null ? null : formatNumber(threshold, locale);

  const summaryValues = {
    quantity: formatNumber(input.quantity, locale),
    unit: t(`units.${input.unit}`),
    currency: input.currency,
    value: formatNumber(input.valueLocal, locale),
    from: t(`countries.${input.from}`),
    to: t(`countries.${input.to}`),
    border: border.name,
  };
  const summary = product
    ? t("result.summary", { product: product.officialName, ...summaryValues })
    : t("result.summaryNoProduct", summaryValues);

  const heading =
    evaluation.verdict === "above_threshold"
      ? thresholdLabel
        ? t("verdict.above_threshold", { threshold: thresholdLabel })
        : t("verdict.above_threshold_generic")
      : t(`verdict.${evaluation.verdict}`);

  const shareT = await getTranslations("share");
  const whatsAppUrl = buildWhatsAppUrl({
    t: (key, values) => shareT(key, values),
    heading,
    summary,
    items,
  });

  return (
    <PageShell>
      <header className="border-b border-line bg-panel">
        <Container className="flex items-center gap-2 px-3! py-2 md:px-5!">
          <Link
            href={{ pathname: "/plan/value", query: planToQuery(input) }}
            aria-label={t("common.back")}
            className="flex size-11 items-center justify-center text-ink hover:text-brand-dark"
          >
            <ChevronLeftIcon />
          </Link>
          <p className="m-0 text-base font-bold">{t("result.headerTitle")}</p>
        </Container>
      </header>
      <RouteStripBar
        width="wide"
        from={input.from}
        to={input.to}
        borderName={border.name}
        progress={ROUTE_PROGRESS.result}
      />

      <main className="flex-1">
        {/* One column on phones and tablets. From desktop width the checklist takes the right
            column and the verdict, actions and help stack on the left. */}
        <Container className="grid gap-[22px] py-5 md:py-8 lg:grid-cols-[5fr_7fr] lg:items-start lg:gap-x-10 lg:gap-y-6 xl:gap-x-14">
          <div className="flex flex-col gap-[22px] lg:sticky lg:top-6 lg:col-start-1 lg:row-start-1 lg:gap-6">
            <VerdictCard
              verdict={evaluation.verdict}
              thresholdLabel={thresholdLabel}
              summary={summary}
            />
            <div className="grid gap-[22px] md:grid-cols-2 md:items-start lg:grid-cols-1 lg:gap-6">
              <section className="flex flex-col gap-2.5">
                <LinkButton href="/plans">{t("result.save")}</LinkButton>
                <ExternalButton href={whatsAppUrl} className="min-h-[52px] text-[17px]">
                  <ShareIcon />
                  {t("result.share")}
                </ExternalButton>
                <p className="m-0 text-center text-sm text-ink-muted">{t("result.signInNote")}</p>
              </section>
              <HelpPanel borderName={border.name} contact={border.deskContact} />
            </div>
          </div>

          <div className="lg:col-start-2 lg:row-start-1">
            {items.length > 0 ? (
              <Checklist items={items} />
            ) : (
              <section className="flex flex-col gap-2" aria-labelledby="checklist-title">
                <h2 id="checklist-title" className="m-0 text-[22px] leading-[1.2] font-bold">
                  {t("result.checklistTitle")}
                </h2>
                <p className="m-0 text-base leading-[1.45] text-ink-muted">
                  {t("result.noChecklist")}
                </p>
              </section>
            )}
          </div>

          <div className="max-w-2xl pb-3 lg:col-span-2 lg:pt-4">
            <Disclaimer />
          </div>
        </Container>
      </main>
    </PageShell>
  );
}
