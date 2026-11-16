"use client";

import { useEffect, type ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";

const TRAIL_KEY = "crossborderassist.back-trail";
const TRAIL_LIMIT = 20;

function readTrail(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(TRAIL_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function writeTrail(trail: string[]) {
  try {
    window.sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail.slice(-TRAIL_LIMIT)));
  } catch {
    // Storage can be blocked; the link then behaves as a normal link.
  }
}

/**
 * Back arrow for the plan screens. A plain link pushes a new history entry, so
 * pressing it repeatedly buries the forward history and the browser Back button
 * ends up cycling between the same two screens. When the screen we want is the
 * one the user just came from, step back in history instead; otherwise (a
 * bookmark, a shared link, the first screen) fall back to the link.
 */
export function BackLink({ href, onClick, ...rest }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const target = typeof href === "string" ? href : href.pathname;

  useEffect(() => {
    const trail = readTrail();
    if (trail[trail.length - 1] !== pathname) writeTrail([...trail, pathname]);
  }, [pathname]);

  return (
    <Link
      href={href}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const trail = readTrail();
        if (trail.length >= 2 && trail[trail.length - 2] === target && window.history.length > 1) {
          event.preventDefault();
          writeTrail(trail.slice(0, -1));
          window.history.back();
        }
      }}
    />
  );
}
