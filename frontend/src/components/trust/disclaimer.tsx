import { useTranslations } from "next-intl";

/** Must appear on every result page and the landing page (CLAUDE.md rule 2). */
export function Disclaimer() {
  const t = useTranslations();
  return <p className="m-0 text-[13px] leading-[1.5] text-ink-muted">{t("disclaimer")}</p>;
}
