"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SourceLine } from "@/components/trust/source-line";
import { TrustBadge } from "@/components/trust/trust-badge";
import { TrustCallout } from "@/components/trust/trust-callout";
import type { ChecklistItemView } from "@/lib/domain";

/**
 * Checklist with tickable items. Ticks live in the browser only for now;
 * persistence on saved plans (FR-07) comes with the backend.
 */
export function Checklist({ items }: { items: ChecklistItemView[] }) {
  const t = useTranslations();
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <section className="flex flex-col gap-3" aria-labelledby="checklist-title">
      <div className="flex items-baseline justify-between">
        <h2 id="checklist-title" className="m-0 text-[22px] leading-[1.2] font-bold">
          {t("result.checklistTitle")}
        </h2>
        <span className="text-[15px] text-ink-muted" aria-live="polite">
          {t("result.progress", { done: done.size, total: items.length })}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((item) => (
          <li key={item.requirementId}>
            <ChecklistItem
              item={item}
              checked={done.has(item.requirementId)}
              onToggle={() => toggle(item.requirementId)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChecklistItem({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItemView;
  checked: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("trust");
  const { trustState, caveat, sources } = item;

  return (
    <article className="flex flex-col gap-2.5 rounded-control border border-line bg-panel p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-0.5 size-6 shrink-0 accent-brand"
        />
        <span className="text-lg leading-[1.3] font-bold">{item.title}</span>
      </label>

      <div className="ml-9 flex flex-col gap-2.5">
        <p className="m-0 text-[15px] leading-[1.45] text-ink-muted">{item.plainExplanation}</p>

        {item.whereToObtain || item.officialFee ? (
          <div className="flex flex-col gap-1 text-sm">
            {item.whereToObtain ? <span>{t("where", { value: item.whereToObtain })}</span> : null}
            {item.officialFee ? <span>{t("fee", { value: item.officialFee })}</span> : null}
          </div>
        ) : null}

        {trustState === "verified" ? (
          <div className="flex flex-wrap items-center gap-2">
            <TrustBadge state="verified" />
            {sources.map((s) => (
              <SourceLine key={s.id} source={s} />
            ))}
          </div>
        ) : (
          <>
            <TrustCallout
              state={trustState}
              subject={caveat?.subject}
              body={caveat?.body ?? t("unknownBody")}
            />
            {sources.length > 0 ? (
              <div className="flex flex-col gap-1">
                {sources.map((s) => (
                  <SourceLine key={s.id} source={s} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
