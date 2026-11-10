import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@/lib/format";
import type { Source } from "@/lib/domain";

/** "Source name, checked 7 Oct 2026". The source name links out when we have its URL. */
export function SourceLine({ source }: { source: Source }) {
  const t = useTranslations("trust");
  const locale = useLocale();

  const date = source.lastVerifiedAt
    ? formatDate(source.lastVerifiedAt, locale)
    : t("dateMissing");

  return (
    <span className="text-[13px] leading-[1.5] text-ink-muted">
      {t.rich("checkedSource", {
        source: (name) =>
          source.url ? (
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
              {name}
            </a>
          ) : (
            name
          ),
        name: source.name,
        date,
      })}
    </span>
  );
}
