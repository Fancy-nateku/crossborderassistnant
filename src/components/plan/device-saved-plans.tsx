"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/button";
import {
  countDoneItems,
  deleteDevicePlan,
  DevicePlanStorageError,
  type StorageFailure,
} from "@/lib/plan/device-plans";
import { useDevicePlanStore } from "@/lib/plan/use-device-plan-store";
import { SavedPlanCard } from "./saved-plan-card";

export function DeviceSavedPlans() {
  const t = useTranslations();
  const snapshot = useDevicePlanStore();
  const [mutationFailure, setMutationFailure] = useState<StorageFailure | null>(null);
  const storageFailure =
    mutationFailure ?? (snapshot.status === "error" ? snapshot.reason : null);

  const removePlan = (id: string) => {
    if (!window.confirm(t("plans.deleteConfirm"))) return;
    try {
      deleteDevicePlan(id);
      setMutationFailure(null);
    } catch (error) {
      setMutationFailure(
        error instanceof DevicePlanStorageError ? error.reason : "unavailable",
      );
    }
  };

  if (storageFailure) {
    return (
      <div className="flex flex-col gap-4" role="alert">
        <p className="m-0 text-base text-conflicting-fg">
          {storageFailure === "outdated"
            ? t("plans.storageOutdated")
            : t("plans.storageUnavailable")}
        </p>
        <LinkButton href="/plan/route">{t("plans.emptyCta")}</LinkButton>
      </div>
    );
  }

  if (snapshot.status === "loading") {
    return <p className="m-0 text-base text-ink-muted" role="status">{t("plans.loading")}</p>;
  }
  if (snapshot.status !== "ready") return null;
  const { store } = snapshot;

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-ink-muted">{t("plans.deviceNote")}</p>
      {store.plans.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {store.plans.map((plan) => (
            <SavedPlanCard
              key={plan.id}
              plan={plan}
              doneCount={countDoneItems(plan, store)}
              onDelete={() => removePlan(plan.id)}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 text-base text-ink-muted">{t("plans.empty")}</p>
      )}
      <div className="md:max-w-sm">
        <LinkButton href="/plan/route">
          {store.plans.length > 0 ? t("plans.newPlan") : t("plans.emptyCta")}
        </LinkButton>
      </div>
    </div>
  );
}
