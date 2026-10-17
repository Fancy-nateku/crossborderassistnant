import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SavedPlanCard } from "@/components/plan/saved-plan-card";
import { LinkButton } from "@/components/ui/button";
import { Container, PageShell } from "@/components/ui/container";
import { BottomNav } from "@/components/site/bottom-nav";
import { SiteHeader } from "@/components/site/site-header";
import { getSession } from "@/lib/auth";
import { repository } from "@/lib/data";

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
  const [session, plans] = await Promise.all([getSession(), repository.listSavedPlans()]);

  const cards = await Promise.all(
    plans.map(async (plan) => {
      const [product, border] = await Promise.all([
        plan.input.productId ? repository.getProduct(plan.input.productId) : null,
        repository.getBorder(plan.input.borderId),
      ]);
      return border ? { plan, product, border } : null;
    }),
  );

  return (
    <PageShell>
      <SiteHeader />

      <main className="flex-1">
        <Container className="flex flex-col gap-4 py-6 md:gap-6 md:py-10">
          <h1 className="m-0 text-[28px] leading-[1.15] font-bold md:text-[34px]">
            {t("plans.title")}
          </h1>
          {session ? <p className="m-0 text-sm text-ink-muted">{session.identifier}</p> : null}
          {cards.some(Boolean) ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) =>
                card ? (
                  <SavedPlanCard
                    key={card.plan.id}
                    plan={card.plan}
                    product={card.product}
                    border={card.border}
                  />
                ) : null,
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:max-w-sm">
              <p className="m-0 text-base text-ink-muted">{t("plans.empty")}</p>
              <LinkButton href="/plan/route">{t("plans.emptyCta")}</LinkButton>
            </div>
          )}
        </Container>
      </main>

      {cards.some(Boolean) ? (
        <footer className="sticky bottom-0 hidden border-t border-line bg-panel md:block">
          <Container className="pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:flex md:justify-end md:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <LinkButton href="/plan/route" className="md:w-auto md:min-w-72">
              {t("plans.newPlan")}
            </LinkButton>
          </Container>
        </footer>
      ) : null}
      <BottomNav />
    </PageShell>
  );
}
