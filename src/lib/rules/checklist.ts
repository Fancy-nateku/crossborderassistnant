import type { ChecklistItemView, Requirement, Source } from "@/lib/domain";
import { deriveTrustState } from "./trust";

/**
 * Joins requirement ids to their records and sources, keeping rule order.
 * A requirement or source id that does not exist is a data integrity error,
 * so it throws rather than quietly hiding an item from the trader.
 */
export function buildChecklist(
  requirementIds: readonly string[],
  requirements: readonly Requirement[],
  sources: readonly Source[],
): ChecklistItemView[] {
  const reqById = new Map(requirements.map((r) => [r.id, r]));
  const srcById = new Map(sources.map((s) => [s.id, s]));

  return requirementIds.map((id) => {
    const req = reqById.get(id);
    if (!req) throw new Error(`Rule references unknown requirement "${id}"`);

    const itemSources = req.sourceIds.map((sid) => {
      const src = srcById.get(sid);
      if (!src) throw new Error(`Requirement "${id}" references unknown source "${sid}"`);
      return src;
    });

    return {
      requirementId: req.id,
      title: req.title,
      plainExplanation: req.plainExplanation,
      whereToObtain: req.whereToObtain,
      officialFee: req.officialFee,
      trustState: deriveTrustState(itemSources),
      caveat: req.caveat,
      sources: itemSources,
    };
  });
}
