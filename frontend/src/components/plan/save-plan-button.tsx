"use client";

import { useTranslations } from "next-intl";
import { Button, LinkButton } from "@/components/ui/button";
import type { PlanInput } from "@/lib/domain";
import { planToQuery } from "@/lib/plan/params";
import { useAccountPlan } from "./account-plan-context";

/**
 * Plans are saved to the account, always. Signed out, the button sends the person to sign in
 * (and brings them back to this result); signed in, it saves and then shows the saved state.
 */
export function SavePlanButton({ input }: { input: PlanInput }) {
  const t = useTranslations("account");
  const r = useTranslations("result");
  const { signedIn, planId, saveState, syncFailed, save } = useAccountPlan();

  if (signedIn === null) {
    return <div className="min-h-[52px]" aria-hidden="true" />;
  }

  if (!signedIn) {
    const next = `/plan/result?${new URLSearchParams(planToQuery(input)).toString()}`;
    return (
      <div className="flex flex-col gap-2">
        <LinkButton
          href={{ pathname: "/login", query: { next } }}
          className="min-h-[52px] text-[17px]"
        >
          {r("signInToSave")}
        </LinkButton>
        <p className="m-0 text-center text-sm text-ink-muted">{r("signInToSaveHint")}</p>
      </div>
    );
  }

  if (planId || saveState === "saved") {
    return (
      <div className="flex flex-col gap-2 rounded-control border border-line bg-muted p-3 text-center">
        <p className="m-0 text-sm font-bold text-brand">{t("saved")}</p>
        {syncFailed ? (
          <p role="alert" className="m-0 text-sm text-conflicting-fg">{t("syncFailed")}</p>
        ) : null}
        <LinkButton href="/plans" variant="secondary" className="min-h-10 text-sm">
          {t("viewSaved")}
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={saveState === "saving"}
        onClick={save}
        className="min-h-[52px] text-[17px] disabled:cursor-wait disabled:opacity-70"
      >
        {t("saveButton")}
      </Button>
      <p className="m-0 text-center text-sm text-ink-muted">{t("storedInAccount")}</p>
      {saveState === "failed" ? (
        <p className="m-0 text-sm text-conflicting-fg" role="alert">{t("saveFailed")}</p>
      ) : null}
    </div>
  );
}
