import { planToQuery } from "@/lib/plan/params";
import type { PlanInput } from "@/lib/domain";

/** Carries wizard state through a plain GET form so each step works without client JS. */
export function HiddenPlanFields({
  input,
  omit = [],
}: {
  input: PlanInput;
  omit?: readonly string[];
}) {
  return Object.entries(planToQuery(input))
    .filter(([name]) => !omit.includes(name))
    .map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />);
}
