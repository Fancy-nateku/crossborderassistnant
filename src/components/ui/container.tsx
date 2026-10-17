import type { ReactNode } from "react";

/** Whole-page wrapper. Header and footer bars span the full width inside it. */
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-surface">{children}</div>;
}

const widths = {
  /** Wizard steps: a phone column that grows to a comfortable form width. */
  narrow: "max-w-[480px] md:max-w-[720px] lg:max-w-[880px]",
  /** Landing, result and saved plans: use the room on tablets and desktops. */
  wide: "max-w-[1120px] xl:max-w-[1200px]",
} as const;

export type ContainerWidth = keyof typeof widths;

/** Centres content, with side padding that grows from phone to tablet. */
export function Container({
  width = "wide",
  className = "",
  children,
}: {
  width?: ContainerWidth;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full px-5 md:px-8 lg:px-10 ${widths[width]} ${className}`}>{children}</div>
  );
}
