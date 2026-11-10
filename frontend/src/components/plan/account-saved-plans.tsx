"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { Link } from "@/i18n/navigation";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { planToQuery } from "@/lib/plan/params";

const inputSchema = z.object({
  from: z.enum(["KE", "UG"]),
  to: z.enum(["KE", "UG"]),
  borderId: z.string(),
  productId: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.enum(["bags", "kilograms", "crates"]),
  currency: z.enum(["KES", "UGX"]),
  valueLocal: z.number().nullable(),
});

const planSchema = z.object({
  id: z.string(),
  input: inputSchema,
  verdict: z.enum(["likely_str_eligible", "above_threshold", "not_on_common_list", "cannot_confirm"]),
  doneCount: z.number(),
  totalCount: z.number(),
  savedAt: z.string(),
});

const listSchema = z.object({ data: z.array(planSchema) });

type AccountPlan = z.infer<typeof planSchema>;

const VERDICT_KEYS = {
  likely_str_eligible: "verdictLikely",
  above_threshold: "verdictAbove",
  not_on_common_list: "verdictNotListed",
  cannot_confirm: "verdictUnconfirmed",
} as const;

export function AccountSavedPlans() {
  const t = useTranslations("account");
  const locale = useLocale();
  const signedIn = useSignedIn();
  const [plans, setPlans] = useState<AccountPlan[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (signedIn !== true) return;
    let cancelled = false;
    fetch("/api/v1/saved-plans", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("load failed");
        return listSchema.parse(await res.json());
      })
      .then((body) => {
        if (!cancelled) setPlans(body.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (signedIn !== true) return null;

  async function remove(id: string) {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      const res = await fetch(`/api/v1/saved-plans/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        setPlans((current) => (current ? current.filter((p) => p.id !== id) : current));
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    }
  }

  return (
    <section aria-labelledby="account-plans-title" className="flex flex-col gap-4">
      <h2 id="account-plans-title" className="m-0 text-[22px] leading-[1.2] font-bold">
        {t("title")}
      </h2>
      {failed ? (
        <p role="alert" className="m-0 text-base text-conflicting-fg">{t("loadError")}</p>
      ) : plans === null ? (
        <p role="status" className="m-0 text-base text-ink-muted">{t("loading")}</p>
      ) : plans.length === 0 ? (
        <p className="m-0 text-base text-ink-muted">{t("empty")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="flex flex-col gap-2 rounded-control border border-line bg-panel p-4">
              <h3 className="m-0 text-lg font-bold capitalize">
                {plan.input.borderId} · {plan.input.from} → {plan.input.to}
              </h3>
              <p className="m-0 text-[15px]">{t(VERDICT_KEYS[plan.verdict])}</p>
              <p className="m-0 text-sm text-ink-muted">
                {t("progress", { done: plan.doneCount, total: plan.totalCount })} ·{" "}
                {new Date(plan.savedAt).toLocaleDateString(locale)}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={{ pathname: "/plan/result", query: planToQuery(plan.input) }}
                  className="flex min-h-11 items-center font-bold text-brand"
                >
                  {t("open")}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(plan.id)}
                  className="min-h-11 cursor-pointer border-0 bg-transparent font-bold text-conflicting-fg"
                >
                  {t("delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}