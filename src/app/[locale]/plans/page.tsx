import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Column } from "@/components/plan/column";
import { SavedPlanCard } from "@/components/plan/saved-plan-card";
import { LinkButton } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
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
    <Column>
      <header className="flex items-center justify-between border-b border-line bg-panel px-5 py-4">
        <Link href="/" className="text-lg font-bold no-underline">
          {t("app.name")}
        </Link>
        {session ? <span className="text-sm text-ink-muted">{session.identifier}</span> : null}
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 py-6">
        <h1 className="m-0 text-[28px] leading-[1.15] font-bold">{t("plans.title")}</h1>
        {cards.some(Boolean) ? (
          cards.map((card) =>
            card ? (
              <SavedPlanCard key={card.plan.id} plan={card.plan} product={card.product} border={card.border} />
            ) : null,
          )
        ) : (
          <>
            <p className="m-0 text-base text-ink-muted">{t("plans.empty")}</p>
            <LinkButton href="/plan/route">{t("plans.emptyCta")}</LinkButton>
          </>
        )}
      </main>

      {cards.some(Boolean) ? (
        <footer className="sticky bottom-0 border-t border-line bg-panel px-5 pt-4 pb-6">
          <LinkButton href="/plan/route">{t("plans.newPlan")}</LinkButton>
        </footer>
      ) : null}
    </Column>
  );
}
