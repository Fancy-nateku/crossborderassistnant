import type { ReactNode } from "react";

/** Title block shared by the content pages. */
export function PageIntro({ title, lead }: { title: string; lead: string }): ReactNode {
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-8 md:pb-10">
      <h1 className="m-0 text-[34px] leading-[1.1] font-bold md:text-[44px]">{title}</h1>
      <p className="m-0 max-w-xl text-lg text-ink-muted md:text-xl">{lead}</p>
    </div>
  );
}
