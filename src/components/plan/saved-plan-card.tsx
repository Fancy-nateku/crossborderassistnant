import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate, formatNumber } from "@/lib/format";
import { planToQuery } from "@/lib/plan/params";
import type { Border, Product, SavedPlan } from "@/lib/domain";

export function SavedPlanCard({
  plan,
  product,
  border,
}: {
  plan: SavedPlan;
  product: Product | null;
  border: Border;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { input } = plan;
  const pct = plan.totalCount > 0 ? Math.round((plan.doneCount / plan.totalCount) * 100) : 0;

  const country = t(`countries.${input.to}`);
  const title = product
    ? t("plans.planTitle", { product: product.officialName, country })
    : t("plans.planTitleNoProduct", { country });
  const details =
    input.quantity !== null && input.valueLocal !== null
      ? ` ${t("plans.details", {
          quantity: formatNumber(input.quantity, locale),
          unit: t(`units.${input.unit}`),
          currency: input.currency,
          value: formatNumber(input.valueLocal, locale),
        })}`
      : "";

  return (
    <Link
      href={{ pathname: "/plan/result", query: planToQuery(input) }}
      className="flex flex-col gap-2.5 rounded-control border border-line bg-panel p-4 text-ink no-underline hover:text-ink"
    >
      <span className="text-lg font-bold">{title}</span>
      <span className="text-[15px] text-ink-muted">
        {t("plans.through", { border: border.name })}
        {details}
      </span>
      <span className="flex items-center gap-2.5">
        <span className="h-2 flex-1 overflow-hidden rounded-badge bg-muted">
          <span className="block h-full bg-brand" style={{ width: `${pct}%` }} />
        </span>
        <span className="text-sm font-bold">
          {plan.doneCount === 0
            ? t("plans.notStarted")
            : t("plans.done", { done: plan.doneCount, total: plan.totalCount })}
        </span>
      </span>
      <span className="text-[13px] text-ink-muted">
        {t("plans.saved", { date: formatDate(plan.savedAt, locale) })}
      </span>
      {plan.ruleChanged ? (
        <span className="rounded-control bg-unverified-bg px-2.5 py-2 text-sm text-unverified-ink">
          {t("plans.ruleChanged")}
        </span>
      ) : null}
    </Link>
  );
}
