"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Container, PageShell } from "@/components/ui/container";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error("A page could not be rendered.", {
      digest: error.digest,
      name: error.name,
    });
  }, [error]);

  return (
    <PageShell>
      <main className="flex flex-1 items-center">
        <Container className="flex max-w-lg flex-col gap-4 py-10">
          <h1 className="m-0 text-[28px] leading-[1.15] font-bold">
            {t("message")}
          </h1>
          <div className="flex flex-col gap-3">
            <Button type="button" onClick={reset}>{t("tryAgain")}</Button>
            <Link href="/" className="min-h-11 text-center font-bold text-brand">
              {t("home")}
            </Link>
          </div>
        </Container>
      </main>
    </PageShell>
  );
}
