// PROTOTYPE FIXTURES. Copied from the design canvas "Core Flow v0.1".
// Common List statuses, fees and sources here are ILLUSTRATIVE. Real values come only
// from the verified source registry (CLAUDE.md rule 1). Text in [square brackets]
// marks data we do not have yet and is shown to the user as-is.

import type {
  Border,
  ExchangeRate,
  Product,
  Requirement,
  Rule,
  SavedPlan,
  Source,
} from "@/lib/domain";

export const borders: Border[] = [
  {
    id: "busia",
    name: "Busia",
    countries: ["KE", "UG"],
    note: "One-stop border post",
    active: true,
    deskContact: "[Desk contact details]",
  },
  {
    id: "malaba",
    name: "Malaba",
    countries: ["KE", "UG"],
    note: null,
    active: true,
    deskContact: "[Desk contact details]",
  },
];

export const products: Product[] = [
  {
    id: "beans-dry",
    officialName: "Beans, dry",
    localNames: ["maharagwe"],
    onCommonList: "yes",
    description: null,
  },
  {
    id: "beans-fresh-green",
    officialName: "Beans, fresh green",
    localNames: ["[local name]"],
    onCommonList: "unknown",
    description: null,
  },
  {
    id: "bean-flour",
    officialName: "Bean flour",
    localNames: [],
    onCommonList: "no",
    description: "Processed product",
  },
  {
    id: "maize-grain",
    officialName: "Maize grain",
    localNames: [],
    onCommonList: "unknown",
    description: null,
  },
];

export const sources: Source[] = [
  {
    id: "src-kra-str",
    name: "[KRA STR information pack]",
    url: null,
    publishedAt: null,
    lastVerifiedAt: null,
    status: "verified",
  },
  {
    id: "src-eprc",
    name: "[EPRC Uganda 2024]",
    url: null,
    publishedAt: null,
    lastVerifiedAt: null,
    status: "conflicting",
  },
  {
    id: "src-registry",
    name: "[Source name]",
    url: null,
    publishedAt: null,
    lastVerifiedAt: null,
    status: "verified",
  },
  {
    id: "src-product",
    name: "[Source name]",
    url: null,
    publishedAt: null,
    lastVerifiedAt: null,
    status: "unverified",
  },
];

export const requirements: Requirement[] = [
  {
    id: "req-sco",
    title: "Get a Simplified Certificate of Origin",
    plainExplanation:
      "Shows your goods come from the EAC, so no import duty applies. Issued by customs at the border.",
    officialFee: null,
    whereToObtain: null,
    sourceIds: ["src-kra-str", "src-eprc"],
    caveat: {
      subject: "the fee",
      body: "The certificate is meant to support duty-free trade, but traders report being charged at some Kenyan crossings. Ask the Trade Information Desk before paying.",
    },
  },
  {
    id: "req-scd",
    title: "Fill in the Simplified Customs Document",
    plainExplanation: "A short declaration form for small consignments.",
    officialFee: "[OFFICIAL FEE]",
    whereToObtain: "[office at Busia]",
    sourceIds: ["src-registry"],
    caveat: null,
  },
  {
    id: "req-threshold",
    title: "Keep the value under USD 2,000 for this crossing",
    plainExplanation:
      "Above this, the standard customs procedure applies instead.",
    officialFee: null,
    whereToObtain: null,
    sourceIds: ["src-kra-str"],
    caveat: null,
  },
  {
    id: "req-product",
    title: "[Product-specific requirement]",
    plainExplanation: "[Plain explanation from the source registry]",
    officialFee: null,
    whereToObtain: null,
    sourceIds: ["src-product"],
    caveat: {
      subject: null,
      body: "Last checked [date]. Confirm with [authority] before you travel.",
    },
  },
];

// Fixture rules are always in effect.
const ALWAYS = "1970-01-01";

export const rules: Rule[] = [
  {
    id: "rule-str-eligible",
    version: 1,
    conditions: {
      from: "KE",
      to: "UG",
      borderIds: ["busia", "malaba"],
      commonList: "yes",
      valueUsdUpTo: 2000,
    },
    outcome: {
      verdict: "likely_str_eligible",
      requirementIds: ["req-sco", "req-scd", "req-threshold", "req-product"],
    },
    sourceId: "src-kra-str",
    effectiveFrom: ALWAYS,
    status: "active",
    priority: 10,
  },
  {
    id: "rule-above-threshold",
    version: 1,
    conditions: {
      from: "KE",
      to: "UG",
      borderIds: ["busia", "malaba"],
      commonList: "yes",
      valueUsdAbove: 2000,
    },
    outcome: { verdict: "above_threshold", requirementIds: [] },
    sourceId: "src-kra-str",
    effectiveFrom: ALWAYS,
    status: "active",
    priority: 10,
  },
  {
    id: "rule-not-on-list",
    version: 1,
    conditions: {
      from: "KE",
      to: "UG",
      borderIds: ["busia", "malaba"],
      commonList: "no",
    },
    outcome: { verdict: "not_on_common_list", requirementIds: [] },
    sourceId: "src-kra-str",
    effectiveFrom: ALWAYS,
    status: "active",
    priority: 10,
  },
];

// Illustrative rates so the prototype can reach a verdict. An admin sets real ones.
export const exchangeRates: ExchangeRate[] = [
  { currency: "KES", ratePerUsd: 130, setAt: "2026-10-07", illustrative: true },
  { currency: "UGX", ratePerUsd: 3700, setAt: "2026-10-07", illustrative: true },
];

export const savedPlans: SavedPlan[] = [
  {
    id: "plan-1",
    input: {
      from: "KE",
      to: "UG",
      borderId: "busia",
      productId: "beans-dry",
      quantity: 5,
      unit: "bags",
      currency: "KES",
      valueLocal: 30000,
    },
    doneCount: 1,
    totalCount: 4,
    savedAt: "2026-10-07",
    ruleChanged: false,
  },
  {
    id: "plan-2",
    input: {
      from: "KE",
      to: "UG",
      borderId: "malaba",
      productId: "maize-grain",
      quantity: null,
      unit: "bags",
      currency: "KES",
      valueLocal: null,
    },
    doneCount: 0,
    totalCount: 0,
    savedAt: "2026-10-07",
    ruleChanged: true,
  },
];
