import type { ComponentProps, ReactNode } from "react";

/**
 * A radio card (docs/DESIGN.md, Option row). The whole row is the label.
 * The 0.5 px padding trade keeps the row from shifting when the border thickens.
 */
export function OptionRow({
  children,
  className = "",
  ...input
}: Omit<ComponentProps<"input">, "type" | "children"> & { children: ReactNode }) {
  return (
    <label
      className={`flex min-h-16 cursor-pointer items-start gap-3.5 rounded-control border-[1.5px] border-line-strong bg-panel p-4 has-checked:border-2 has-checked:bg-muted has-checked:border-brand has-checked:p-[15.5px] ${className}`}
    >
      <input type="radio" className="mt-0.5 size-[22px] shrink-0 accent-brand" {...input} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</span>
    </label>
  );
}
