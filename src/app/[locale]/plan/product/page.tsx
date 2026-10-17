import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HiddenPlanFields } from "@/components/plan/hidden-plan-fields";
import { ROUTE_PROGRESS } from "@/components/plan/route-strip";
import { WizardShell } from "@/components/plan/wizard-shell";
import { CommonListBadge } from "@/components/trust/trust-badge";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { SearchIcon } from "@/components/ui/icons";
import { OptionRow } from "@/components/ui/option-row";
import { Link, getPathname } from "@/i18n/navigation";
import { repository } from "@/lib/data";
import { parsePlanInput, planToQuery } from "@/lib/plan/params";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "product" });
  return { title: t("meta") };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const raw = await searchParams;
  const input = parsePlanInput(raw);
  const q = (Array.isArray(raw.q) ? raw.q[0] : raw.q)?.slice(0, 80) ?? "";

  const [border, products] = await Promise.all([
    repository.getBorder(input.borderId),
    repository.searchProducts(q),
  ]);

  const skipQuery = planToQuery({ ...input, productId: null });

  return (
    <WizardShell
      step={2}
      backHref={{ pathname: "/plan/route", query: planToQuery(input) }}
      from={input.from}
      to={input.to}
      borderName={border?.name ?? ""}
      progress={ROUTE_PROGRESS.step2}
      footer={<Button type="submit" form="product-form">{t("product.next")}</Button>}
    >
      <h1 className="m-0 text-[28px] leading-[1.15] font-bold md:text-[34px]">{t("product.title")}</h1>

      <form
        role="search"
        method="get"
        action={getPathname({ href: "/plan/product", locale })}
        className="flex flex-col gap-1.5"
      >
        <HiddenPlanFields input={input} omit={["product"]} />
        <label htmlFor="q" className="text-[15px] font-bold">
          {t("product.searchLabel")}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-4 left-3.5 text-ink-muted">
            <SearchIcon />
          </span>
          <input
            id="q"
            name="q"
            type="search"
            enterKeyHint="search"
            defaultValue={q}
            autoComplete="off"
            aria-describedby="q-hint"
            className={`${controlClass} pl-11`}
          />
        </div>
        <p id="q-hint" className="m-0 text-sm text-ink-muted">
          {t("product.searchHint")}
        </p>
      </form>

      {q ? (
        <p className="m-0 text-sm text-ink-muted" aria-live="polite">
          {t("product.matches", { count: products.length })}
        </p>
      ) : null}

      <form
        id="product-form"
        method="get"
        action={getPathname({ href: "/plan/value", locale })}
        className="flex flex-col gap-2.5"
      >
        <HiddenPlanFields input={input} omit={["product"]} />
        <fieldset className="m-0 grid gap-2.5 border-0 p-0 md:grid-cols-2 lg:grid-cols-3">
          <legend className="sr-only">{t("product.resultsLabel")}</legend>
          {products.length === 0 ? (
            <p className="m-0 text-base text-ink-muted md:col-span-2 lg:col-span-3">{t("product.noMatches", { query: q })}</p>
          ) : null}
          {products.map((product, i) => {
            const alias = product.localNames.length
              ? t("product.alsoCalled", { names: product.localNames.join(", ") })
              : product.description;
            return (
              <OptionRow
                key={product.id}
                name="product"
                value={product.id}
                defaultChecked={product.id === input.productId}
                required={i === 0}
              >
                <span className="text-[17px] font-bold">{product.officialName}</span>
                {alias ? <span className="text-sm text-ink-muted">{alias}</span> : null}
                <CommonListBadge status={product.onCommonList} />
              </OptionRow>
            );
          })}
        </fieldset>
      </form>

      <p className="m-0 text-sm leading-[1.45] text-ink-muted">
        {t.rich("product.skip", {
          link: (chunks) => (
            <Link
              href={{ pathname: "/plan/value", query: skipQuery }}
              className="font-bold"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
    </WizardShell>
  );
}
