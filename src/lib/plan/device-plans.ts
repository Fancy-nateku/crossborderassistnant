import { z } from "zod";
import type { PlanInput, Verdict } from "@/lib/domain";

const planInputSchema = z.object({
  from: z.enum(["KE", "UG"]),
  to: z.enum(["KE", "UG"]),
  borderId: z.string().min(1).max(80),
  productId: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.enum(["bags", "kilograms", "crates"]),
  currency: z.enum(["KES", "UGX"]),
  valueLocal: z.number().nullable(),
}) satisfies z.ZodType<PlanInput>;

const verdictSchema = z.enum([
  "likely_str_eligible",
  "above_threshold",
  "not_on_common_list",
  "cannot_confirm",
]) satisfies z.ZodType<Verdict>;

const savedPlanSchema = z.object({
  id: z.string().min(1),
  input: planInputSchema,
  borderName: z.string(),
  productName: z.string().nullable(),
  verdict: verdictSchema,
  savedAt: z.string().datetime(),
  totalCount: z.number().int().nonnegative(),
  requirementIds: z.array(z.string()),
});

const storeSchema = z.object({
  version: z.literal(1),
  plans: z.array(savedPlanSchema),
  checklists: z.record(z.string(), z.array(z.string())),
});

export type DeviceSavedPlan = z.infer<typeof savedPlanSchema>;
export type DevicePlanStore = z.infer<typeof storeSchema>;
export type StorageFailure = "unavailable" | "corrupt" | "outdated";
export type DevicePlanSnapshot =
  | { status: "loading" }
  | { status: "ready"; store: DevicePlanStore }
  | { status: "error"; reason: StorageFailure };

export class DevicePlanStorageError extends Error {
  constructor(public readonly reason: StorageFailure) {
    super(`Device plan storage ${reason}.`);
    this.name = "DevicePlanStorageError";
  }
}

const STORAGE_KEY = "crossborderassist.device-plans.v1";
export const DEVICE_PLAN_CHANGE_EVENT = "crossborderassist:device-plans-change";

const SERVER_SNAPSHOT: DevicePlanSnapshot = { status: "loading" };
const UNAVAILABLE_SNAPSHOT: DevicePlanSnapshot = {
  status: "error",
  reason: "unavailable",
};
let cachedRaw: string | null | undefined;
let cachedSnapshot: DevicePlanSnapshot | null = null;

export function getServerDevicePlanSnapshot(): DevicePlanSnapshot {
  return SERVER_SNAPSHOT;
}

export function invalidateDevicePlanSnapshot(): void {
  cachedRaw = undefined;
  cachedSnapshot = null;
}

export function getDevicePlanSnapshot(): DevicePlanSnapshot {
  try {
    const raw = readRaw(browserStorage());
    if (cachedSnapshot && cachedRaw === raw) return cachedSnapshot;
    cachedRaw = raw;
    try {
      cachedSnapshot = { status: "ready", store: readStore(browserStorage()) };
    } catch (error) {
      if (!(error instanceof DevicePlanStorageError)) throw error;
      cachedSnapshot = { status: "error", reason: error.reason };
    }
    return cachedSnapshot;
  } catch (error) {
    if (!(error instanceof DevicePlanStorageError)) throw error;
    cachedRaw = undefined;
    cachedSnapshot =
      error.reason === "unavailable"
        ? UNAVAILABLE_SNAPSHOT
        : { status: "error", reason: error.reason };
    return cachedSnapshot;
  }
}

export function planStorageKey(input: PlanInput): string {
  return JSON.stringify([
    input.from,
    input.to,
    input.borderId,
    input.productId,
    input.quantity,
    input.unit,
    input.currency,
    input.valueLocal,
  ]);
}

function browserStorage(): Storage {
  try {
    return window.localStorage;
  } catch {
    throw new DevicePlanStorageError("unavailable");
  }
}

function readRaw(storage: Storage): string | null {
  try {
    return storage.getItem(STORAGE_KEY);
  } catch {
    throw new DevicePlanStorageError("unavailable");
  }
}

function readStore(storage: Storage): DevicePlanStore {
  const raw = readRaw(storage);
  if (raw === null) return { version: 1, plans: [], checklists: {} };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new DevicePlanStorageError("corrupt");
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version !== 1
  ) {
    throw new DevicePlanStorageError("outdated");
  }

  const parsed = storeSchema.safeParse(value);
  if (!parsed.success) throw new DevicePlanStorageError("corrupt");
  return parsed.data;
}

function writeStore(storage: Storage, store: DevicePlanStore): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    throw new DevicePlanStorageError("unavailable");
  }
  invalidateDevicePlanSnapshot();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DEVICE_PLAN_CHANGE_EVENT));
  }
}

export function readDevicePlanStore(storage?: Storage): DevicePlanStore {
  return readStore(storage ?? browserStorage());
}

export function saveDevicePlan(
  details: Omit<DeviceSavedPlan, "id" | "savedAt">,
  storage?: Storage,
): DeviceSavedPlan {
  const selectedStorage = storage ?? browserStorage();
  const store = readStore(selectedStorage);
  const existing = store.plans.find(
    (plan) => planStorageKey(plan.input) === planStorageKey(details.input),
  );
  if (existing) return existing;

  const plan: DeviceSavedPlan = {
    ...details,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  writeStore(selectedStorage, { ...store, plans: [plan, ...store.plans] });
  return plan;
}

export function setChecklistItem(
  input: PlanInput,
  requirementId: string,
  done: boolean,
  storage?: Storage,
): void {
  const selectedStorage = storage ?? browserStorage();
  const store = readStore(selectedStorage);
  const key = planStorageKey(input);
  const current = new Set(store.checklists[key] ?? []);
  if (done) current.add(requirementId);
  else current.delete(requirementId);

  const checklists = { ...store.checklists };
  if (current.size > 0) checklists[key] = [...current];
  else delete checklists[key];
  writeStore(selectedStorage, { ...store, checklists });
}

export function deleteDevicePlan(id: string, storage?: Storage): void {
  const selectedStorage = storage ?? browserStorage();
  const store = readStore(selectedStorage);
  const deleted = store.plans.find((plan) => plan.id === id);
  const plans = store.plans.filter((plan) => plan.id !== id);
  const checklists = { ...store.checklists };
  if (
    deleted &&
    !plans.some((plan) => planStorageKey(plan.input) === planStorageKey(deleted.input))
  ) {
    delete checklists[planStorageKey(deleted.input)];
  }
  writeStore(selectedStorage, { ...store, plans, checklists });
}

export function countDoneItems(
  plan: DeviceSavedPlan,
  store: DevicePlanStore,
): number {
  const done = new Set(store.checklists[planStorageKey(plan.input)] ?? []);
  return plan.requirementIds.filter((id) => done.has(id)).length;
}
