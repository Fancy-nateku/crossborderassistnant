"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const inputClass = "min-h-11 w-full rounded-control border border-line bg-panel px-3 text-[16px]";
const labelClass = "flex flex-col gap-1.5 font-bold";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    if (!result || result.error) {
      setPending(false);
      setError(t("errorInvalid"));
      return;
    }
    window.location.assign(new URL(`/${locale}/plans`, window.location.origin).href);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <h1 className="m-0 text-[28px] leading-[1.15] font-bold">{t("loginTitle")}</h1>
      <label className={labelClass}>
        {t("email")}
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <label className={labelClass}>
        {t("password")}
        <input name="password" type="password" autoComplete="current-password" required minLength={8} className={inputClass} />
      </label>
      {error ? <p role="alert" className="m-0 text-[15px] text-red-700">{error}</p> : null}
      <Button type="submit" disabled={pending}>{t("loginButton")}</Button>
      <p className="m-0 text-[15px]">
        {t("noAccount")} <Link href="/register">{t("register")}</Link>
      </p>
    </form>
  );
}