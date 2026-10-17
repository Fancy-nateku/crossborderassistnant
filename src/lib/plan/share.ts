import type { ChecklistItemView } from "@/lib/domain";

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Builds the wa.me link: a plain-text summary with source links (FR-13).
 * The caller passes already-translated pieces so this stays free of i18n setup.
 */
export function buildWhatsAppUrl({
  t,
  heading,
  summary,
  items,
}: {
  t: Translate;
  heading: string;
  summary: string;
  items: readonly ChecklistItemView[];
}): string {
  const lines = [t("title"), "", heading, summary];

  items.forEach((item, i) => {
    lines.push("", `${i + 1}. ${item.title}`);
    if (item.officialFee) lines.push(t("fee", { value: item.officialFee }));
    for (const s of item.sources) {
      lines.push(t("source", { name: s.name, url: s.url ?? "" }).trim());
    }
  });

  lines.push("", t("footer"));
  return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
}
