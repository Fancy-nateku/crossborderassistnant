import { useTranslations } from "next-intl";
import type { CountryCode } from "@/lib/domain";

/** Border marker sits at this point on the track (docs/DESIGN.md, Route strip). */
const BORDER_POSITION = 68;

/** Progress by screen: step 1 = 18, step 2 = 38, step 3 = 58, result = 100. */
export const ROUTE_PROGRESS = { landing: 0, step1: 18, step2: 38, step3: 58, result: 100 } as const;

/**
 * The signature element: the trip from one country to the next.
 * Decorative, so it is hidden from assistive tech. Progress is also given as
 * text in the header ("Step 2 of 3").
 */
export function RouteStrip({
  from,
  to,
  borderName,
  progress,
  size = "compact",
}: {
  from: CountryCode;
  to: CountryCode;
  borderName: string;
  progress: number;
  size?: "compact" | "hero";
}) {
  const t = useTranslations("countries");
  const complete = progress >= 100;
  const started = progress > 0;
  const hero = size === "hero";

  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-2.5 ${hero ? "pt-3.5 pb-1" : "bg-panel px-5 pt-4 pb-1.5"}`}
    >
      <span className={`font-bold text-brand ${hero ? "text-[15px]" : "text-sm"}`}>{t(from)}</span>
      <div className={`relative flex-1 ${hero ? "h-10" : "h-9"}`}>
        <div className="absolute inset-x-0 top-[11px] border-t-2 border-dashed border-line-strong" />
        {started ? (
          <div
            className="absolute top-2.5 left-0 h-1 rounded-sm bg-brand"
            style={{ width: `${progress}%` }}
          />
        ) : null}
        <div
          className="absolute top-0 h-6 w-[3px] bg-ink"
          style={{ left: `${BORDER_POSITION}%` }}
        />
        <div
          className="absolute top-6 -translate-x-[40%] text-xs text-ink-muted"
          style={{ left: `${BORDER_POSITION}%` }}
        >
          {borderName}
        </div>
        <div
          className={`absolute top-[5px] size-3.5 -translate-x-1/2 rounded-full border-2 border-brand ${
            started ? "bg-panel" : "bg-brand"
          }`}
          style={{ left: `${progress}%` }}
        />
      </div>
      <span
        className={`font-bold ${complete ? "text-brand" : "text-ink-muted"} ${hero ? "text-[15px]" : "text-sm"}`}
      >
        {t(to)}
      </span>
    </div>
  );
}
