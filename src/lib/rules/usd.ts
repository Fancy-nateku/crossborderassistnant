import type { ExchangeRate } from "@/lib/domain";

/**
 * Converts a local-currency value to USD using an admin-set rate.
 * Returns null when there is no rate, so callers cannot guess a value.
 * Rounded to cents.
 */
export function toUsd(
  valueLocal: number,
  rate: Pick<ExchangeRate, "ratePerUsd"> | null,
): number | null {
  if (!rate || rate.ratePerUsd <= 0) return null;
  return Math.round((valueLocal / rate.ratePerUsd) * 100) / 100;
}
