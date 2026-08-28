import { describe, expect, it } from "vitest";
import { buildSyncPlan } from "./sync-power-editor-template-pack.mjs";

describe("power editor template synchronization plan", () => {
  it("planifica templates maestros con claves estables y fingerprints no repetidos", () => {
    const plan = buildSyncPlan();
    expect(plan).toHaveLength(12);
    expect(new Set(plan.map((item) => item.blueprintKey)).size).toBe(plan.length);
    expect(new Set(plan.map((item) => item.fingerprint)).size).toBe(plan.length);
    expect(plan.every((item) => item.pageConfig && item.name && item.category)).toBe(true);
  });
});
