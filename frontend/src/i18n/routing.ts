import { defineRouting } from "next-intl/routing";

// English only for now. Swahili is next: add "sw" here and a messages/sw.json
// that a Swahili speaker has reviewed.
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
