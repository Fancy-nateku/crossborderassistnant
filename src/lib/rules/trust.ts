import type { Source, TrustState } from "@/lib/domain";

export const DEFAULT_VERIFICATION_FRESHNESS_DAYS = 365;

/**
 * Trust state of a requirement from the sources behind it.
 * No source means "unknown": it is never treated as verified (CLAUDE.md rule 3).
 * Conflicting outranks unverified; verified requires all sources to be verified
 * and within the freshness policy window if verified dates are checked.
 */
export function deriveTrustState(
  sources: readonly Source[],
  options?: { asOf?: string; maxAgeDays?: number },
): TrustState {
  if (sources.length === 0) return "unknown";
  if (sources.some((s) => s.status === "conflicting")) return "conflicting";
  if (sources.some((s) => s.status === "unverified" || !s.lastVerifiedAt)) return "unverified";

  if (options?.asOf && options.maxAgeDays !== undefined) {
    const asOfMs = new Date(options.asOf).getTime();
    const maxAgeMs = options.maxAgeDays * 24 * 60 * 60 * 1000;
    const hasStale = sources.some((s) => {
      if (!s.lastVerifiedAt) return true;
      const verifiedMs = new Date(s.lastVerifiedAt).getTime();
      return !Number.isFinite(verifiedMs) || verifiedMs > asOfMs || asOfMs - verifiedMs > maxAgeMs;
    });
    if (hasStale) return "unverified";
  }

  return "verified";
}
