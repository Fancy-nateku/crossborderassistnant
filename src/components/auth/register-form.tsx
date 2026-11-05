"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const inputClass = "min-h-11 w-full rounded-control border border-line bg-panel px-3 text-[16px]";
const labelClass = "flex flex-col gap-1.5 font-bold";

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name || undefined, email, password }),
    });
    if (!res.ok) {
      setPending(false);
      setError(res.status === 409 ? t("errorTaken") : t("errorGeneric"));
      return;
    }
    const result = await signIn("credentials", { email, password, redirect: false });
    if (!result || result.error) {
      setPending(false);
      setError(t("errorGeneric"));
      return;
    }
    window.location.assign(new URL(`/${locale}/plans`, window.location.origin).href);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <h1 className="m-0 text-[28px] leading-[1.15] font-bold">{t("registerTitle")}</h1>
      <label className={labelClass}>
        {t("name")}
        <input name="name" type="text" autoComplete="name" maxLength={100} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("email")}
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("password")}
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
        <span className="text-[14px] font-normal">{t("passwordHint")}</span>
      </label>
      {error ? <p role="alert" className="m-0 text-[15px] text-red-700">{error}</p> : null}
      <Button type="submit" disabled={pending}>{t("registerButton")}</Button>
      <p className="m-0 text-[15px]">
        {t("haveAccount")} <Link href="/login">{t("login")}</Link>
      </p>
    </form>
  );
}