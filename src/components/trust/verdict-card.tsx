import { useTranslations } from "next-intl";
import type { Verdict } from "@/lib/domain";

/** The single verdict for a plan. Announced politely to screen readers. */
export function VerdictCard({
  verdict,
  thresholdLabel,
  summary,
}: {
  verdict: Verdict;
  /** Formatted USD ceiling from rule data, for the above-threshold heading. */
  thresholdLabel: string | null;
  summary: string;
}) {
  const t = useTranslations();
  const heading =
    verdict === "above_threshold"
      ? thresholdLabel
        ? t("verdict.above_threshold", { threshold: thresholdLabel })
        : t("verdict.above_threshold_generic")
      : t(`verdict.${verdict}`);

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-2.5 rounded-control border-[1.5px] border-brand bg-panel p-[18px]"
    >
      <p className="m-0 text-[15px] text-ink-muted">{t("result.verdictLabel")}</p>
      <h1
        className={`m-0 text-[28px] leading-[1.15] font-bold ${
          verdict === "cannot_confirm" ? "text-ink" : "text-brand"
        }`}
      >
        {heading}
      </h1>
      <p className="m-0 text-base leading-[1.45]">{summary}</p>
      <p className="m-0 text-sm leading-[1.45] text-ink-muted">{t("result.caveat")}</p>
    </section>
  );
}
