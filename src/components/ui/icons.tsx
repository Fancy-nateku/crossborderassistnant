type IconProps = { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function ChevronLeftIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.2}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function SearchIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

export function ShareIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
    </svg>
  );
}
