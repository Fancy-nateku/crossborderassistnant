"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The `?next=` value of the current URL (null on the server and when absent). */
export function useNextParam(): string | null {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return new URLSearchParams(search).get("next");
}
