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

export function HomeIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

export function InfoIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.01" />
    </svg>
  );
}

export function PlusIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.6}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function BookmarkIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M6 4h12v17l-6-4-6 4z" />
    </svg>
  );
}

export function HelpIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.01" />
    </svg>
  );
}
