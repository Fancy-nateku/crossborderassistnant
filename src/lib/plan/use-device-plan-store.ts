"use client";

import { useSyncExternalStore } from "react";
import {
  DEVICE_PLAN_CHANGE_EVENT,
  getDevicePlanSnapshot,
  getServerDevicePlanSnapshot,
  invalidateDevicePlanSnapshot,
} from "./device-plans";

function subscribe(onStoreChange: () => void): () => void {
  const handleChange = () => {
    invalidateDevicePlanSnapshot();
    onStoreChange();
  };
  window.addEventListener("storage", handleChange);
  window.addEventListener(DEVICE_PLAN_CHANGE_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(DEVICE_PLAN_CHANGE_EVENT, handleChange);
  };
}

export function useDevicePlanStore() {
  return useSyncExternalStore(
    subscribe,
    getDevicePlanSnapshot,
    getServerDevicePlanSnapshot,
  );
}
