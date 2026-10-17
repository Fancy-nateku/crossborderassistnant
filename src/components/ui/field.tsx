import type { ReactNode } from "react";

/** Shared look for text inputs and selects (docs/DESIGN.md, Inputs). */
export const controlClass =
  "box-border min-h-[52px] w-full rounded-control border-[1.5px] border-line-strong bg-panel px-3.5 text-[17px] text-ink focus:border-2 focus:border-brand";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="m-0 text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="m-0 text-sm font-bold text-conflicting-fg">
          {error}
        </p>
      ) : null}
    </div>
  );
}
