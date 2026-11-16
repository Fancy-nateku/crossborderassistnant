"use client";

import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { AccountSavedPlans } from "./account-saved-plans";

/**
 * Saved plans live in the account only. Signed out, there is nothing to list, so the page
 * explains that and offers to sign in. While the session is being checked, show nothing.
 */
export function SavedPlansLists() {
  const t = useTranslations("plans");
  const signedIn = useSignedIn();
  if (signedIn === null) return null;
  if (signedIn) return <AccountSavedPlans />;

  return (
    <section aria-labelledby="signed-out-title" className="flex max-w-md flex-col gap-3">
      <h2 id="signed-out-title" className="m-0 text-[22px] leading-[1.2] font-bold">
        {t("signedOutTitle")}
      </h2>
      <p className="m-0 text-base leading-[1.45] text-ink-muted">{t("signedOutBody")}</p>
      <LinkButton href={{ pathname: "/login", query: { next: "/plans" } }}>{t("signedOutCta")}</LinkButton>
      <p className="m-0 text-[15px]">
        {t("signedOutNoAccount")}{" "}
        <Link href={{ pathname: "/register", query: { next: "/plans" } }}>{t("signedOutRegister")}</Link>
      </p>
    </section>
  );
}
