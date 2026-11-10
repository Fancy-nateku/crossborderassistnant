import { useTranslations } from "next-intl";
import type { TrustState } from "@/lib/domain";

const styles = {
  unverified: { box: "bg-unverified-bg", title: "text-unverified-fg", body: "text-unverified-ink" },
  conflicting: { box: "bg-conflicting-bg", title: "text-conflicting-fg", body: "text-conflicting-ink" },
  unknown: { box: "bg-unknown-bg", title: "text-unknown-fg", body: "text-unknown-fg" },
} as const;

/** Full-width warning for an item whose trust state is not "verified". */
export function TrustCallout({
  state,
  subject,
  body,
}: {
  state: Exclude<TrustState, "verified">;
  subject?: string | null;
  body: string;
}) {
  const t = useTranslations("trust.callout");
  const s = styles[state];
  const title =
    state === "conflicting"
      ? subject
        ? t("conflicting", { subject })
        : t("conflictingGeneric")
      : t(state);

  return (
    <div className={`flex flex-col gap-1 rounded-control p-3 ${s.box}`}>
      <span className={`text-sm font-bold ${s.title}`}>{title}</span>
      <span className={`text-sm leading-[1.45] ${s.body}`}>{body}</span>
    </div>
  );
}
