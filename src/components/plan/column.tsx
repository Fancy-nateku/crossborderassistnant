import type { ReactNode } from "react";

/** Centres content in a 480 px column on wide screens; full width on a phone. */
export function Column({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col border-line bg-surface sm:border-x">
      {children}
    </div>
  );
}
