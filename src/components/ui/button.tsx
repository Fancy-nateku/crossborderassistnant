import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Variant = "primary" | "secondary";

const shared =
  "flex w-full items-center justify-center gap-2.5 rounded-control text-center font-bold no-underline";

const variants: Record<Variant, string> = {
  primary:
    "min-h-14 bg-brand text-lg text-white hover:bg-brand-dark hover:text-white active:bg-brand-dark",
  secondary:
    "min-h-12 border-[1.5px] border-brand bg-panel text-base text-brand hover:border-brand-dark hover:text-brand-dark",
};

const cls = (variant: Variant, extra?: string) =>
  [shared, variants[variant], extra].filter(Boolean).join(" ");

/** An action. Use `LinkButton` or `ExternalButton` for navigation. */
export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type={type} className={cls(variant, className)} {...props} />;
}

/** Internal navigation, styled as a button. Renders an `<a>`. */
export function LinkButton({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cls(variant, className)} {...props} />;
}

/** Link to another site, styled as a button. Opens in a new tab. */
export function ExternalButton({
  variant = "secondary",
  className,
  ...props
}: ComponentProps<"a"> & { variant?: Variant }) {
  return <a target="_blank" rel="noopener noreferrer" className={cls(variant, className)} {...props} />;
}
