// Frontend view of the domain model. The backend owns the final schema
// (docs/PRD.md, "Data model and rules model"); these are the fields the UI depends on.

export type CountryCode = "KE" | "UG";
export type Currency = "KES" | "UGX";
export type Unit = "bags" | "kilograms" | "crates";
export type CommonListStatus = "yes" | "no" | "unknown";

export type TrustState = "verified" | "unverified" | "conflicting" | "unknown";
export type SourceStatus = "verified" | "unverified" | "conflicting";

export type Verdict =
  | "likely_str_eligible"
  | "above_threshold"
  | "not_on_common_list"
  | "cannot_confirm";

export interface Border {
  id: string;
  name: string;
  countries: readonly [CountryCode, CountryCode];
  note: string | null;
  active: boolean;
  deskContact: string | null;
}

export interface Product {
  id: string;
  officialName: string;
  localNames: string[];
  onCommonList: CommonListStatus;
  description: string | null;
}

export interface Source {
  id: string;
  name: string;
  url: string | null;
  publishedAt: string | null;
  lastVerifiedAt: string | null;
  status: SourceStatus;
}

export interface Requirement {
  id: string;
  title: string;
  plainExplanation: string;
  officialFee: string | null;
  whereToObtain: string | null;
  sourceIds: string[];
  /** Explains an unverified or conflicting state. Shown in the item's callout. */
  caveat: { subject: string | null; body: string } | null;
}

export interface RuleConditions {
  from: CountryCode;
  to: CountryCode;
  borderIds?: string[];
  commonList?: CommonListStatus;
  /** Exclusive lower bound, USD. */
  valueUsdAbove?: number;
  /** Inclusive upper bound, USD. */
  valueUsdUpTo?: number;
}

export interface Rule {
  id: string;
  version: number;
  conditions: RuleConditions;
  outcome: { verdict: Exclude<Verdict, "cannot_confirm">; requirementIds: string[] };
  sourceId: string;
  /** ISO date (YYYY-MM-DD). */
  effectiveFrom: string;
  status: "active" | "draft" | "retired";
  /** Higher wins when more than one rule matches. */
  priority: number;
}

export interface ExchangeRate {
  currency: Currency;
  ratePerUsd: number;
  /** ISO date (YYYY-MM-DD) the team set this rate. Never a live feed. */
  setAt: string;
  /** True for prototype fixtures. Real rates are set by an admin. */
  illustrative: boolean;
}

/** Everything the wizard collects. Nullable until the step that sets it. */
export interface PlanInput {
  from: CountryCode;
  to: CountryCode;
  borderId: string;
  productId: string | null;
  quantity: number | null;
  unit: Unit;
  currency: Currency;
  valueLocal: number | null;
}

export interface SavedPlan {
  id: string;
  input: PlanInput;
  doneCount: number;
  totalCount: number;
  /** ISO date (YYYY-MM-DD). */
  savedAt: string;
  ruleChanged: boolean;
}

/** One rendered checklist row, already joined to its sources and trust state. */
export interface ChecklistItemView {
  requirementId: string;
  title: string;
  plainExplanation: string;
  whereToObtain: string | null;
  officialFee: string | null;
  trustState: TrustState;
  caveat: { subject: string | null; body: string } | null;
  sources: Source[];
}
