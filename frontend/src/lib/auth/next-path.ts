/**
 * Where to send someone after signing in or registering. The sign-in link carries the page
 * they came from as `?next=/plan/result?...` (a path without the locale). Only same-site paths
 * are accepted, so the parameter cannot be used to redirect to another site.
 */
export function afterAuthPath(search: string, locale: string): string {
  const next = new URLSearchParams(search).get("next");
  if (next && /^\/(?![/\\])[^\s\\]*$/.test(next) && !next.includes("://")) {
    return `/${locale}${next === "/" ? "" : next}`;
  }
  return `/${locale}/plans`;
}
