// Stands in for `next-intl/server` in tests. The real module needs a Next request
// context; `createTranslator` gives the same `t` over the real en.json messages,
// so screen tests assert the copy traders actually see.
import { createTranslator } from "next-intl";
import messages from "../../../messages/en.json";

const LOCALE = "en";

type Options = { locale?: string; namespace?: string };

export function setRequestLocale(): void {}

export async function getTranslations(options?: string | Options) {
  const namespace = typeof options === "string" ? options : options?.namespace;
  // The real module infers the namespace as a key union from its generic; here it is
  // only known at runtime, so this one cast stands in for that inference.
  return createTranslator({ locale: LOCALE, messages, namespace: namespace as never });
}

export async function getLocale() {
  return LOCALE;
}
