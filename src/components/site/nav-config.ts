/** One source for site navigation: where each page lives and where it is linked from. */
const HREF = {
  home: "/",
  how: "/how-it-works",
  about: "/about",
  help: "/help",
  plans: "/plans",
  start: "/plan/route",
} as const;

export type NavKey = keyof typeof HREF;

export const navHref = (key: NavKey) => HREF[key];

/** Top bar from tablet width up. Start is a separate button there. */
export const HEADER_KEYS = ["home", "how", "about", "help", "plans"] as const satisfies readonly NavKey[];

export const FOOTER_KEYS = ["how", "about", "help", "plans"] as const satisfies readonly NavKey[];

/** Phone bottom bar. Start sits in the middle as the main action. */
export const TAB_KEYS = ["home", "how", "start", "plans", "help"] as const satisfies readonly NavKey[];
