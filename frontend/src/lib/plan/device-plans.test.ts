import { beforeEach, describe, expect, it } from "vitest";
import type { PlanInput } from "@/lib/domain";
import type { DeviceSavedPlan } from "./device-plans";
import {
  countDoneItems,
  deleteDevicePlan,
  DevicePlanStorageError,
  planStorageKey,
  readDevicePlanStore,
  saveDevicePlan,
  setChecklistItem,
} from "./device-plans";

const input: PlanInput = {
  from: "KE",
  to: "UG",
  borderId: "busia",
  productId: "beans-dry",
  quantity: 5,
  unit: "bags",
  currency: "KES",
  valueLocal: 30000,
};

const planDetails: Omit<DeviceSavedPlan, "id" | "savedAt"> = {
  input,
  borderName: "Busia",
  productName: "Beans, dry",
  verdict: "likely_str_eligible",
  totalCount: 2,
  requirementIds: ["origin", "declaration"],
};

function readFailure(): DevicePlanStorageError {
  try {
    readDevicePlanStore();
  } catch (error) {
    if (error instanceof DevicePlanStorageError) return error;
    throw error;
  }
  throw new Error("Expected local storage data to be rejected.");
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("device-only saved plans", () => {
  it("saves a plan without an account and reads it back from browser storage", () => {
    const saved = saveDevicePlan(planDetails);

    expect(saved.id).toBeTruthy();
    expect(readDevicePlanStore().plans).toEqual([saved]);
  });

  it("persists checklist ticks when the store is read again", () => {
    const plan = saveDevicePlan(planDetails);
    setChecklistItem(input, "origin", true);

    const reopenedStore = readDevicePlanStore();
    expect(reopenedStore.checklists).toEqual({
      [planStorageKey(input)]: ["origin"],
    });
    expect(countDoneItems(plan, reopenedStore)).toBe(1);
  });

  it("deletes the plan and its checklist when no duplicate plan remains", () => {
    const plan = saveDevicePlan(planDetails);
    setChecklistItem(input, "origin", true);

    deleteDevicePlan(plan.id);

    expect(readDevicePlanStore()).toEqual({ version: 1, plans: [], checklists: {} });
  });

  it("reports malformed and outdated storage without throwing parse errors", () => {
    window.localStorage.setItem("crossborderassist.device-plans.v1", "{");
    expect(readFailure().reason).toBe("corrupt");

    window.localStorage.setItem(
      "crossborderassist.device-plans.v1",
      JSON.stringify({ version: 2 }),
    );
    expect(readFailure().reason).toBe("outdated");
  });
});
