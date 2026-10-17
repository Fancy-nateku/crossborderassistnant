const intlLocale = (locale: string) => (locale === "en" ? "en-GB" : locale);

/** "7 Oct 2026" from an ISO date (YYYY-MM-DD). */
export function formatDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** "30,000" */
export function formatNumber(value: number, locale: string, maxFractionDigits = 0): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}
