"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PlanInput } from "@/lib/domain";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { planKey } from "@/lib/plan/params";

/**
 * The one place a plan is saved: the signed-in user's account. The Save button and the
 * checklist share this state so the progress shown on the result page and on the Plans page
 * always agree. Ticks made before saving are held in memory and sent with the save.
 */

export type SaveState = "idle" | "saving" | "saved" | "failed";

interface AccountPlanValue {
  /** true = signed in, false = signed out, null = still checking. */
  signedIn: boolean | null;
  /** The saved copy of this plan, if the account already has one. */
  planId: string | null;
  done: ReadonlySet<string>;
  saveState: SaveState;
  syncFailed: boolean;
  toggle: (requirementId: string) => void;
  save: () => Promise<void>;
}

const AccountPlanContext = createContext<AccountPlanValue | null>(null);

export function useAccountPlan(): AccountPlanValue {
  const value = useContext(AccountPlanContext);
  if (!value) throw new Error("useAccountPlan must be used inside AccountPlanProvider.");
  return value;
}

async function patchItem(planId: string, requirementId: string, done: boolean): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/v1/saved-plans/${encodeURIComponent(planId)}/checklist-items/${encodeURIComponent(requirementId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ done }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

const planSchemaIds = (body: unknown): { id: string; input: PlanInput }[] => {
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (p): p is { id: string; input: PlanInput } =>
      typeof p?.id === "string" && typeof p?.input === "object" && p.input !== null,
  );
};

export function AccountPlanProvider({
  input,
  requirementIds,
  children,
}: {
  input: PlanInput;
  requirementIds: string[];
  children: ReactNode;
}) {
  const signedIn = useSignedIn();
  const key = planKey(input);
  const [planId, setPlanId] = useState<string | null>(null);
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [syncFailed, setSyncFailed] = useState(false);

  // If the account already holds this plan, pick up its id and ticks.
  useEffect(() => {
    if (signedIn !== true) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetch("/api/v1/saved-plans", { cache: "no-store" });
        if (!list.ok) return;
        const match = planSchemaIds(await list.json()).find((p) => planKey(p.input) === key);
        if (!match) return;
        const detail = await fetch(`/api/v1/saved-plans/${encodeURIComponent(match.id)}`, { cache: "no-store" });
        if (!detail.ok) return;
        const items = ((await detail.json()) as { data?: { items?: { requirementId: string; done: boolean }[] } })
          .data?.items;
        if (cancelled) return;
        setPlanId(match.id);
        setSaveState("saved");
        setDone(new Set((items ?? []).filter((i) => i.done).map((i) => i.requirementId)));
      } catch {
        // Not found or offline: the plan simply shows as not saved yet.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, key]);

  const toggle = useCallback(
    (requirementId: string) => {
      const next = !done.has(requirementId);
      setDone((current) => {
        const copy = new Set(current);
        if (next) copy.add(requirementId);
        else copy.delete(requirementId);
        return copy;
      });
      if (!planId) return;
      setSyncFailed(false);
      void patchItem(planId, requirementId, next).then((ok) => {
        if (ok) return;
        setSyncFailed(true);
        setDone((current) => {
          const copy = new Set(current);
          if (next) copy.delete(requirementId);
          else copy.add(requirementId);
          return copy;
        });
      });
    },
    [done, planId],
  );

  const save = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/v1/saved-plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        setSaveState("failed");
        return;
      }
      const created = ((await res.json().catch(() => null)) as { data?: { id?: unknown } } | null)?.data?.id;
      if (typeof created !== "string") {
        setSaveState("failed");
        return;
      }
      // Carry over the items already ticked, so the saved plan shows the same progress.
      let allSynced = true;
      for (const requirementId of requirementIds) {
        if (done.has(requirementId) && !(await patchItem(created, requirementId, true))) allSynced = false;
      }
      setPlanId(created);
      setSyncFailed(!allSynced);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  }, [done, input, requirementIds]);

  const value = useMemo(
    () => ({ signedIn, planId, done, saveState, syncFailed, toggle, save }),
    [signedIn, planId, done, saveState, syncFailed, toggle, save],
  );
  return <AccountPlanContext.Provider value={value}>{children}</AccountPlanContext.Provider>;
}
