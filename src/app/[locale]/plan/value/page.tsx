import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ROUTE_PROGRESS } from "@/components/plan/route-strip";
import { VALUE_FORM_ID, ValueForm } from "@/components/plan/value-form";
import { WizardShell } from "@/components/plan/wizard-shell";
import { Button } from "@/components/ui/button";
import { repository } from "@/lib/data";
import type { Currency, ExchangeRate } from "@/lib/domain";
import { formatNumber } from "@/lib/format";
import { parsePlanInput, planToQuery } from "@/lib/plan/params";
import { strThresholdUsd } from "@/lib/rules/evaluate";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "value" });
  return { title: t("meta") };
}

export default async function ValuePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const input = parsePlanInput(await searchParams);

  const [border, kes, ugx, rules] = await Promise.all([
    repository.getBorder(input.borderId),
    repository.getExchangeRate("KES"),
    repository.getExchangeRate("UGX"),
    repository.listActiveRules(),
  ]);
  if (!border) redirect({ href: "/plan/route", locale });

  const rates: Record<Currency, ExchangeRate | null> = { KES: kes, UGX: ugx };
  const threshold = strThresholdUsd(rules);

  return (
    <WizardShell
      step={3}
      backHref={{ pathname: "/plan/product", query: planToQuery(input) }}
      from={input.from}
      to={input.to}
      borderName={border?.name ?? ""}
      progress={ROUTE_PROGRESS.step3}
      footer={<Button type="submit" form={VALUE_FORM_ID}>{t("value.next")}</Button>}
    >
      <h1 className="m-0 text-[28px] leading-[1.15] font-bold md:text-[34px]">{t("value.title")}</h1>
      <ValueForm input={input} rates={rates} />
      {threshold !== null ? (
        <p className="m-0 rounded-control bg-muted px-4 py-3.5 text-[15px] leading-[1.5]">
          {t("value.threshold", { amount: formatNumber(threshold, locale) })}
        </p>
      ) : null}
    </WizardShell>
  );
}
