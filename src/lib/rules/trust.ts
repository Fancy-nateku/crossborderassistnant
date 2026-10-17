import type { Source, TrustState } from "@/lib/domain";

/**
 * Trust state of a requirement from the sources behind it.
 * No source means "unknown": it is never treated as verified (CLAUDE.md rule 3).
 * The worst state among the sources wins.
 */
export function deriveTrustState(sources: readonly Source[]): TrustState {
  if (sources.length === 0) return "unknown";
  if (sources.some((s) => s.status === "conflicting")) return "conflicting";
  if (sources.some((s) => s.status === "unverified")) return "unverified";
  return "verified";
}
