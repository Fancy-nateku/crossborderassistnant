"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Link } from "@/i18n/navigation";

type SessionResponse = { user?: { email?: string | null } } | null;

const linkClass = "flex min-h-11 items-center px-2 font-bold text-brand no-underline";

export function AuthNav() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<SessionResponse>) : null))
      .then((s) => {
        if (!cancelled) setSignedIn(Boolean(s?.user));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (signedIn === null) return null;
  if (!signedIn) {
    return (
      <Link href="/login" className={linkClass}>
        {t("login")}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={`${linkClass} cursor-pointer border-0 bg-transparent`}
      onClick={async () => {
        await signOut({ redirect: false });
        setSignedIn(false);
        router.push(`/${locale}`);
        router.refresh();
      }}
    >
      {t("logout")}
    </button>
  );
}