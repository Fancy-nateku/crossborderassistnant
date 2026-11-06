"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/button";
import type { PlanInput, Verdict } from "@/lib/domain";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import {
  DevicePlanStorageError,
  planStorageKey,
  saveDevicePlan,
  type StorageFailure,
} from "@/lib/plan/device-plans";
import { useDevicePlanStore } from "@/lib/plan/use-device-plan-store";

interface SavePlanButtonProps {
  input: PlanInput;
  borderName: string;
  productName: string | null;
  verdict: Verdict;
  totalCount: number;
  requirementIds: string[];
}

type AccountSaveState = "idle" | "saving" | "saved" | "failed";

export function SavePlanButton({
  input,
  borderName,
  productName,
  verdict,
  totalCount,
  requirementIds,
}: SavePlanButtonProps) {
  const t = useTranslations("result");
  const ta = useTranslations("account");
  const signedIn = useSignedIn();
  const snapshot = useDevicePlanStore();
  const [mutationFailure, setMutationFailure] = useState<StorageFailure | null>(null);
  const [accountState, setAccountState] = useState<AccountSaveState>("idle");
  const saved =
    snapshot.status === "ready"
      ? snapshot.store.plans.find(
          (plan) => planStorageKey(plan.input) === planStorageKey(input),
        )
      : undefined;
  const storageFailure =
    mutationFailure ?? (snapshot.status === "error" ? snapshot.reason : null);

  const handleSave = () => {
    setMutationFailure(null);
    try {
      saveDevicePlan({
        input,
        borderName,
        productName,
        verdict,
        totalCount,
        requirementIds,
      });
    } catch (error) {
      setMutationFailure(
        error instanceof DevicePlanStorageError ? error.reason : "unavailable",
      );
    }
  };

  const handleAccountSave = async () => {
    setAccountState("saving");
    try {
      const res = await fetch("/api/v1/saved-plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      setAccountState(res.ok ? "saved" : "failed");
    } catch {
      setAccountState("failed");
    }
  };

  if (signedIn) {
    return (
      <div className="flex flex-col gap-2">
        {accountState === "saved" ? (
          <div className="flex flex-col gap-2 rounded-control border border-line bg-muted p-3 text-center">
            <p className="m-0 text-sm font-bold text-brand">{ta("saved")}</p>
            <LinkButton href="/plans" variant="secondary" className="min-h-10 text-sm">
              {ta("viewSaved")}
            </LinkButton>
          </div>
        ) : (
          <button
            type="button"
            disabled={accountState === "saving"}
            onClick={handleAccountSave}
            className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-control bg-brand px-4 text-[17px] font-bold text-white transition-colors hover:bg-brand-dark disabled:cursor-wait disabled:opacity-70"
          >
            {ta("saveButton")}
          </button>
        )}
        <p className="m-0 text-center text-sm text-ink-muted">{ta("storedInAccount")}</p>
        {accountState === "failed" ? (
          <p className="m-0 text-sm text-conflicting-fg" role="alert">{ta("saveFailed")}</p>
        ) : null}
      </div>
    );
  }

  const errorMessage =
    storageFailure === "outdated"
      ? t("storageOutdated")
      : storageFailure
        ? t("storageUnavailable")
        : null;

  return (
    <div className="flex flex-col gap-2">
      {saved ? (
        <div className="flex flex-col gap-2 rounded-control border border-line bg-muted p-3 text-center">
          <p className="m-0 text-sm font-bold text-brand">{t("savedSuccess")}</p>
          <LinkButton href="/plans" variant="secondary" className="min-h-10 text-sm">
            {t("viewSaved")}
          </LinkButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-control bg-brand px-4 text-[17px] font-bold text-white transition-colors hover:bg-brand-dark"
        >
          {t("save")}
        </button>
      )}
      <p className="m-0 text-center text-sm text-ink-muted">{t("storedOnDevice")}</p>
      <p className="m-0 text-center text-xs text-ink-muted">{t("deviceStorageLimit")}</p>
      {errorMessage ? (
        <p className="m-0 text-sm text-conflicting-fg" role="alert">{errorMessage}</p>
      ) : null}
    </div>
  );
}