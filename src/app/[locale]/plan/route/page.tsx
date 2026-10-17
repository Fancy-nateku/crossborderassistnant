import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HiddenPlanFields } from "@/components/plan/hidden-plan-fields";
import { ROUTE_PROGRESS } from "@/components/plan/route-strip";
import { WizardShell } from "@/components/plan/wizard-shell";
import { Button } from "@/components/ui/button";
import { Field, controlClass } from "@/components/ui/field";
import { OptionRow } from "@/components/ui/option-row";
import { getPathname } from "@/i18n/navigation";
import { repository } from "@/lib/data";
import { parsePlanInput } from "@/lib/plan/params";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "route" });
  return { title: t("meta") };
}

export default async function RoutePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const input = parsePlanInput(await searchParams);
  const borders = await repository.listBorders();
  const selected = borders.find((b) => b.id === input.borderId) ?? borders[0];

  return (
    <WizardShell
      step={1}
      backHref="/"
      from={input.from}
      to={input.to}
      borderName={selected?.name ?? ""}
      progress={ROUTE_PROGRESS.step1}
      footer={<Button type="submit" form="route-form">{t("route.next")}</Button>}
    >
      <h1 className="m-0 text-[28px] leading-[1.15] font-bold md:text-[34px]">{t("route.title")}</h1>

      <form
        id="route-form"
        method="get"
        action={getPathname({ href: "/plan/product", locale })}
        className="flex flex-col gap-[22px]"
      >
        <HiddenPlanFields input={input} omit={["from", "to", "border"]} />

        <div className="grid grid-cols-2 gap-3">
          <Field id="from" label={t("route.from")}>
            <select id="from" name="from" defaultValue="KE" className={controlClass}>
              <option value="KE">{t("countries.KE")}</option>
            </select>
          </Field>
          <Field id="to" label={t("route.to")}>
            <select id="to" name="to" defaultValue="UG" className={controlClass}>
              <option value="UG">{t("countries.UG")}</option>
            </select>
          </Field>
        </div>

        <fieldset className="m-0 grid gap-2.5 border-0 p-0 md:grid-cols-2">
          <legend className="mb-2.5 p-0 text-[15px] font-bold md:col-span-2">{t("route.crossing")}</legend>
          {borders.map((border) => (
            <OptionRow
              key={border.id}
              name="border"
              value={border.id}
              defaultChecked={border.id === selected?.id}
            >
              <span className="text-[17px] font-bold">{border.name}</span>
              {border.note ? (
                <span className="text-sm text-ink-muted">{border.note}</span>
              ) : null}
            </OptionRow>
          ))}
          <div className="flex flex-col gap-0.5 rounded-control border-[1.5px] border-dashed md:col-span-2 border-line-strong px-4 py-3 text-ink-muted">
            <span className="text-base font-bold">{t("route.otherTitle")}</span>
            <span className="text-sm">{t("route.otherBody")}</span>
          </div>
        </fieldset>
      </form>
    </WizardShell>
  );
}
