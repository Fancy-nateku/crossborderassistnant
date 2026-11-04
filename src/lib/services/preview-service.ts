import "server-only";
import type { Repository } from "@/lib/data/repository";
import type {
  Border,
  ExchangeRate,
  PlanInput,
  Product,
  Verdict,
  ChecklistItemView,
} from "@/lib/domain";
import { evaluate } from "@/lib/rules/evaluate";
import { strThresholdUsd } from "@/lib/rules/evaluate";
import { buildChecklist } from "@/lib/rules/checklist";
import { toUsd } from "@/lib/rules/usd";

export class PreviewServiceError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "BORDER_NOT_FOUND"
      | "BORDER_INACTIVE"
      | "ROUTE_MISMATCH"
      | "PRODUCT_NOT_FOUND"
      | "RATE_UNAVAILABLE",
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PreviewServiceError";
  }
}

export interface PreviewResult {
  input: PlanInput;
  border: Border;
  product: Product | null;
  rate: ExchangeRate | null;
  valueUsd: number | null;
  verdict: Verdict;
  ruleId: string | null;
  ruleVersion: number | null;
  asOf: string;
  items: ChecklistItemView[];
  threshold: number | null;
  rateProvenance: {
    currency: string;
    ratePerUsd: number;
    setAt: string;
    illustrative: boolean;
  } | null;
  officialDeskContact: string | null;
  disclaimer: string;
}

export const OFFICIAL_DISCLAIMER_TEXT =
  "Informational guidance based on referenced sources. Not a customs authority, legal adviser or government service. Check requirements with the official authority before you trade.";

export class PreviewService {
  constructor(private readonly repo: Repository) {}

  async evaluatePlan(
    rawInput: PlanInput,
    options?: { asOf?: string },
  ): Promise<PreviewResult> {
    const asOf = options?.asOf ?? new Date().toISOString().slice(0, 10);

    // 1. Validate route & countries
    if (!rawInput.from || !rawInput.to) {
      throw new PreviewServiceError("INVALID_INPUT", "Source and destination countries are required.");
    }
    if (rawInput.from === rawInput.to) {
      throw new PreviewServiceError("ROUTE_MISMATCH", "Source and destination countries cannot be the same.");
    }

    // 2. Validate Border
    if (!rawInput.borderId) {
      throw new PreviewServiceError("INVALID_INPUT", "Border selection is required.");
    }
    const border = await this.repo.getBorder(rawInput.borderId);
    if (!border) {
      throw new PreviewServiceError("BORDER_NOT_FOUND", `Border "${rawInput.borderId}" was not found.`);
    }
    if (!border.active) {
      throw new PreviewServiceError("BORDER_INACTIVE", `Border "${border.name}" is currently inactive.`);
    }
    if (!border.countries.includes(rawInput.from) || !border.countries.includes(rawInput.to)) {
      throw new PreviewServiceError(
        "ROUTE_MISMATCH",
        `Border "${border.name}" does not connect ${rawInput.from} and ${rawInput.to}.`,
      );
    }

    // 3. Resolve optional product
    let product: Product | null = null;
    if (rawInput.productId) {
      product = await this.repo.getProduct(rawInput.productId);
      if (!product) {
        throw new PreviewServiceError(
          "PRODUCT_NOT_FOUND",
          `Product "${rawInput.productId}" is not recognized.`,
        );
      }
    }

    // 4. Validate quantity and value if provided
    if (rawInput.quantity !== null) {
      if (!Number.isFinite(rawInput.quantity) || rawInput.quantity <= 0 || !Number.isInteger(rawInput.quantity)) {
        throw new PreviewServiceError("INVALID_INPUT", "Quantity must be a positive integer.", {
          field: "quantity",
        });
      }
    }

    if (rawInput.valueLocal !== null) {
      if (!Number.isFinite(rawInput.valueLocal) || rawInput.valueLocal <= 0) {
        throw new PreviewServiceError("INVALID_INPUT", "Local value must be a positive number.", {
          field: "valueLocal",
        });
      }
    }

    // 5. Exchange rate and USD conversion
    const rate = await this.repo.getExchangeRate(rawInput.currency);
    const valueUsd = rawInput.valueLocal !== null ? toUsd(rawInput.valueLocal, rate) : null;

    // 6. Rules list and evaluation
    const rules = await this.repo.listActiveRules();

    const evaluation = evaluate(
      {
        from: rawInput.from,
        to: rawInput.to,
        borderId: rawInput.borderId,
        commonList: product?.onCommonList ?? null,
        valueUsd,
        asOf,
      },
      rules,
    );

    // 7. Ordered requirements and sources
    let items: ChecklistItemView[] = [];
    if (evaluation.requirementIds.length > 0) {
      const requirements = await this.repo.getRequirements(evaluation.requirementIds);
      const sources = await this.repo.getSourcesForRequirements(requirements);
      items = buildChecklist(evaluation.requirementIds, requirements, sources);
    }

    // 8. Deterministic threshold ceiling
    const threshold = strThresholdUsd(rules, {
      from: rawInput.from,
      to: rawInput.to,
      borderId: rawInput.borderId,
      asOf,
    });

    return {
      input: rawInput,
      border,
      product,
      rate,
      valueUsd,
      verdict: evaluation.verdict,
      ruleId: evaluation.ruleId,
      ruleVersion: evaluation.ruleVersion,
      asOf,
      items,
      threshold,
      rateProvenance: rate
        ? {
            currency: rate.currency,
            ratePerUsd: rate.ratePerUsd,
            setAt: rate.setAt,
            illustrative: rate.illustrative,
          }
        : null,
      officialDeskContact: border.deskContact,
      disclaimer: OFFICIAL_DISCLAIMER_TEXT,
    };
  }
}
