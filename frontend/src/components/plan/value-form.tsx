"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field, controlClass } from "@/components/ui/field";
import { getPathname } from "@/i18n/navigation";
import { formatDate, formatNumber } from "@/lib/format";
import { toUsd } from "@/lib/rules/usd";
import type { Currency, ExchangeRate, PlanInput, Unit } from "@/lib/domain";

export const VALUE_FORM_ID = "value-form";

const CURRENCIES: Currency[] = ["KES", "UGX"];
const UNITS: Unit[] = ["bags", "kilograms", "crates"];

const digitsOnly = (s: string) => s.replace(/\D/g, "");

/**
 * Step 3 inputs. Client-side only for the currency toggle, the live dollar
 * conversion and inline validation. It submits as a plain GET to the result page.
 */
export function ValueForm({
  input,
  rates,
}: {
  input: PlanInput;
  rates: Record<Currency, ExchangeRate | null>;
}) {
  const t = useTranslations("value");
  const tUnits = useTranslations("unitOptions");
  const tCurrencies = useTranslations("currencies");
  const locale = useLocale();

  const [currency, setCurrency] = useState<Currency>(input.currency);
  const [valueDigits, setValueDigits] = useState(
    input.valueLocal === null ? "" : String(input.valueLocal),
  );
  const [valueShown, setValueShown] = useState(
    input.valueLocal === null ? "" : formatNumber(input.valueLocal, locale),
  );
  const [errors, setErrors] = useState<{ qty?: string; value?: string }>({});
  const qtyRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);

  const rate = rates[currency];
  const usd = valueDigits ? toUsd(Number(valueDigits), rate) : null;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const qty = Number(qtyRef.current?.value);
    const next: typeof errors = {};
    if (!Number.isInteger(qty) || qty < 1) next.qty = t("errorQuantity");
    if (!valueDigits || Number(valueDigits) < 1) next.value = t("errorValue");
    setErrors(next);
    if (next.qty || next.value) {
      e.preventDefault();
      (next.qty ? qtyRef : valueRef).current?.focus();
    }
  }

  return (
    <form
      id={VALUE_FORM_ID}
      method="get"
      action={getPathname({ href: "/plan/result", locale })}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-[22px] lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8"
    >
      <input type="hidden" name="from" value={input.from} />
      <input type="hidden" name="to" value={input.to} />
      <input type="hidden" name="border" value={input.borderId} />
      {input.productId ? <input type="hidden" name="product" value={input.productId} /> : null}
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="value" value={valueDigits} />

      <div className="grid grid-cols-2 gap-3 lg:col-span-2">
        <Field id="qty" label={t("quantity")} error={errors.qty}>
          <input
            ref={qtyRef}
            id="qty"
            name="qty"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            defaultValue={input.quantity ?? ""}
            aria-invalid={errors.qty ? true : undefined}
            aria-describedby={errors.qty ? "qty-error" : undefined}
            className={controlClass}
          />
        </Field>
        <Field id="unit" label={t("unit")}>
          <select id="unit" name="unit" defaultValue={input.unit} className={controlClass}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {tUnits(u)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span id="value-label" className="text-[15px] font-bold">
          {t("total")}
        </span>
        <div
          role="group"
          aria-labelledby="value-label"
          className="flex overflow-hidden rounded-control border-2 border-brand bg-panel focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
        >
          <div className="flex">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={currency === c}
                onClick={() => setCurrency(c)}
                className={`min-h-[52px] min-w-16 px-3 text-base font-bold ${
                  currency === c ? "bg-brand text-white" : "bg-panel text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            ref={valueRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={t("totalAria", { currency: tCurrencies(currency) })}
            aria-invalid={errors.value ? true : undefined}
            aria-describedby={errors.value ? "value-error" : undefined}
            value={valueShown}
            onChange={(e) => {
              const digits = digitsOnly(e.target.value).slice(0, 12);
              setValueDigits(digits);
              setValueShown(digits);
            }}
            onBlur={() =>
              setValueShown(valueDigits ? formatNumber(Number(valueDigits), locale) : "")
            }
            className="min-w-0 flex-1 border-0 px-3.5 text-[22px] font-bold text-ink outline-none"
          />
        </div>
        {errors.value ? (
          <p id="value-error" className="m-0 text-sm font-bold text-conflicting-fg">
            {errors.value}
          </p>
        ) : null}
      </div>

      <div
        className="flex flex-col gap-2 rounded-control border border-line bg-panel p-4"
        aria-live="polite"
      >
        <p className="m-0 text-[15px] text-ink-muted">{t("usdLabel")}</p>
        {usd !== null ? (
          <p className="m-0 text-[30px] leading-tight font-bold text-brand">
            {t("usdAmount", { amount: formatNumber(usd, locale, 2) })}
          </p>
        ) : null}
        {rate ? (
          <>
            {usd === null ? <p className="m-0 text-base text-ink-muted">{t("usdEmpty")}</p> : null}
            <p className="m-0 text-sm leading-[1.45] text-ink-muted">
              {t("usdRate", {
                rate: formatNumber(rate.ratePerUsd, locale),
                currency,
                date: formatDate(rate.setAt, locale),
              })}
              {rate.illustrative ? ` ${t("usdRateIllustrative")}` : ""}
            </p>
          </>
        ) : (
          <p className="m-0 text-sm leading-[1.45] text-ink-muted">
            {t("usdNoRate", { currency })}
          </p>
        )}
      </div>
    </form>
  );
}
