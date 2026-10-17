import { useTranslations } from "next-intl";

export function HelpPanel({
  borderName,
  contact,
}: {
  borderName: string;
  contact: string | null;
}) {
  const t = useTranslations("result");
  return (
    <section className="flex flex-col gap-1.5 rounded-control bg-unknown-bg p-4 text-unknown-fg">
      <h2 className="m-0 text-base font-bold">{t("helpTitle")}</h2>
      <p className="m-0 text-[15px] leading-[1.45]">
        {contact
          ? t("helpBody", { border: borderName, contact })
          : t("helpNoContact", { border: borderName })}
      </p>
    </section>
  );
}
