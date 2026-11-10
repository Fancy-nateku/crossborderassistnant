import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDate, formatNumber } from "@/lib/format";
import { planToQuery } from "@/lib/plan/params";
import type { DeviceSavedPlan } from "@/lib/plan/device-plans";

export function SavedPlanCard({
  plan,
  doneCount,
  onDelete,
}: {
  plan: DeviceSavedPlan;
  doneCount: number;
  onDelete: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { input } = plan;
  const pct = plan.totalCount > 0 ? Math.round((doneCount / plan.totalCount) * 100) : 0;

  const country = t(`countries.${input.to}`);
  const title = plan.productName
    ? t("plans.planTitle", { product: plan.productName, country })
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

  const query: Record<string, string> = {
    ...planToQuery(input),
  };

  return (
    <article className="flex flex-col gap-2.5 rounded-control border border-line bg-panel p-4">
      <Link
        href={{ pathname: "/plan/result", query }}
        className="flex flex-col gap-2.5 text-ink no-underline hover:text-ink"
      >
        <span className="text-lg font-bold">{title}</span>
        <span className="text-[15px] text-ink-muted">
          {t("plans.through", { border: plan.borderName })}
          {details}
        </span>
        <span className="flex items-center gap-2.5">
          <span className="h-2 flex-1 overflow-hidden rounded-badge bg-muted">
            <span className="block h-full bg-brand" style={{ width: `${pct}%` }} />
          </span>
          <span className="text-sm font-bold">
            {doneCount === 0
              ? t("plans.notStarted")
              : t("plans.done", { done: doneCount, total: plan.totalCount })}
          </span>
        </span>
        <span className="text-[13px] text-ink-muted">
          {t("plans.saved", { date: formatDate(plan.savedAt.slice(0, 10), locale) })}
        </span>
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className="min-h-11 cursor-pointer self-start rounded-control border border-line-strong px-3 text-sm font-bold text-ink hover:border-brand"
      >
        {t("plans.delete")}
      </button>
    </article>
  );
}
