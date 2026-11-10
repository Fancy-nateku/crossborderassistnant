import { useTranslations } from "next-intl";
import type { TrustState } from "@/lib/domain";

const styles: Record<TrustState, string> = {
  verified: "bg-verified-bg text-verified-fg",
  unverified: "bg-unverified-bg text-unverified-fg",
  conflicting: "bg-conflicting-bg text-conflicting-fg",
  unknown: "bg-unknown-bg text-unknown-fg",
};

const base = "inline-block self-start rounded-badge px-[9px] py-[3px] text-[13px] font-bold";

/** Trust state as text plus colour, so colour never carries meaning alone. */
export function TrustBadge({ state }: { state: TrustState }) {
  const t = useTranslations("trust.badge");
  return <span className={`${base} ${styles[state]}`}>{t(state)}</span>;
}

/** The Common List status of a product, in the trust colours (docs/DESIGN.md, Badge). */
export function CommonListBadge({ status }: { status: "yes" | "no" | "unknown" }) {
  const t = useTranslations("product");
  const map = {
    yes: ["verified", t("listYes")],
    no: ["conflicting", t("listNo")],
    unknown: ["unknown", t("listUnknown")],
  } as const;
  const [state, label] = map[status];
  return <span className={`${base} ${styles[state]}`}>{label}</span>;
}
