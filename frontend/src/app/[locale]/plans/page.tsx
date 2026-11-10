import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountSavedPlans } from "@/components/plan/account-saved-plans";
import { DeviceSavedPlans } from "@/components/plan/device-saved-plans";
import { Container, PageShell } from "@/components/ui/container";
import { BottomNav } from "@/components/site/bottom-nav";
import { SiteHeader } from "@/components/site/site-header";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "plans" });
  return { title: t("meta") };
}

export default async function PlansPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <PageShell>
      <SiteHeader />

      <main className="flex-1">
        <Container className="flex flex-col gap-4 py-6 md:gap-6 md:py-10">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[28px] leading-[1.15] font-bold md:text-[34px]">
              {t("plans.title")}
            </h1>
          </div>
          <AccountSavedPlans />
          <DeviceSavedPlans />
        </Container>
      </main>
      <BottomNav />
    </PageShell>
  );
}
