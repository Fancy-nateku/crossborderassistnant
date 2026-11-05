"use client";

import { useEffect, useState } from "react";

/** true = signed in, false = signed out or unknown, null = still checking. */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ user?: unknown } | null>) : null))
      .then((s) => {
        if (!cancelled) setSignedIn(Boolean(s?.user));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return signedIn;
}