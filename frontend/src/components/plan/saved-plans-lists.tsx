"use client";

import { useSignedIn } from "@/lib/auth/use-signed-in";
import { AccountSavedPlans } from "./account-saved-plans";
import { DeviceSavedPlans } from "./device-saved-plans";

/**
 * Signed in: show only the account's plans, so another account on the same
 * browser never sees this device's guest plans. Signed out: device plans only.
 * While the session is still being checked, show neither list.
 */
export function SavedPlansLists() {
  const signedIn = useSignedIn();
  if (signedIn === null) return null;
  return signedIn ? <AccountSavedPlans /> : <DeviceSavedPlans />;
}
