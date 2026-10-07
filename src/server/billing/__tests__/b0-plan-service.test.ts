import { describe, expect, it, vi } from "vitest";
import { isUserPro, resolveUserPlan, type PlanServiceDeps } from "../plan-service";
import type {
  BillingGrantRecord,
  BillingSubscriptionRecord,
} from "../../../lib/billing/billing.types";

/**
 * B0 — `resolveUserPlan` is THE single decision. These tests pin the property
 * that matters most: every surface asks the same function and therefore gets the
 * same answer, whatever the source of access is.
 */

function grant(overrides: Partial<BillingGrantRecord> = {}): BillingGrantRecord {
  return {
    id: "grant_1",
    user_id: "user_1",
    plan_id: "pro",
    grant_source: "admin",
    expires_at: null,
    revoked_at: null,
    granted_by: null,
    invitation_code_id: null,
    note: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function subscription(
  overrides: Partial<BillingSubscriptionRecord> = {},
): BillingSubscriptionRecord {
  return {
    id: "sub_1",
    user_id: "user_1",
    plan_id: "pro",
    provider: "paypal",
    billing_customer_id: null,
    provider_customer_id: null,
    provider_subscription_id: "sub_1",
    billing_interval: "monthly",
    currency: "USD",
    status: "active",
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    payment_method_label: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function deps(overrides: Partial<PlanServiceDeps> = {}): PlanServiceDeps {
  return {
    getSubscription: async () => null,
    getGrants: async () => [],
    ...overrides,
  };
}

describe("B0 · resolveUserPlan — single source of truth", () => {
  it("returns Pro for a paid subscription", async () => {
    const plan = await resolveUserPlan(
      "user_1",
      deps({ getSubscription: async () => subscription() }),
    );
    expect(plan.isPro).toBe(true);
    expect(plan.effectiveTier).toBe("pro");
    expect(plan.reason).toBe("ACTIVE_PAID_SUBSCRIPTION");
  });

  it("returns Pro for a canonical grant with NO subscription — the case that used to split", async () => {
    const plan = await resolveUserPlan(
      "user_1",
      deps({ getGrants: async () => [grant({ grant_source: "invitation" })] }),
    );
    expect(plan.isPro).toBe(true);
    expect(plan.reason).toBe("ACTIVE_GRANT");
  });

  it("returns Free when neither source grants access", async () => {
    const plan = await resolveUserPlan("user_1", deps());
    expect(plan.isPro).toBe(false);
    expect(plan.effectiveTier).toBe("free");
  });

  it("reads BOTH sources on every call — it never short-circuits one away", async () => {
    const getSubscription = vi.fn(async () => null);
    const getGrants = vi.fn(async () => []);
    await resolveUserPlan("user_1", deps({ getSubscription, getGrants }));
    expect(getSubscription).toHaveBeenCalledWith("user_1");
    expect(getGrants).toHaveBeenCalledWith("user_1");
  });

  it("resolves Free WITHOUT touching any source when there is no trusted identity", async () => {
    const getSubscription = vi.fn(async () => subscription());
    const getGrants = vi.fn(async () => [grant()]);

    for (const anonymous of [null, undefined, "", "   "]) {
      const plan = await resolveUserPlan(anonymous, deps({ getSubscription, getGrants }));
      expect(plan.isPro).toBe(false);
    }

    // An absent identity must not even reach for data.
    expect(getSubscription).not.toHaveBeenCalled();
    expect(getGrants).not.toHaveBeenCalled();
  });

  it("propagates a lookup failure instead of inventing access", async () => {
    await expect(
      resolveUserPlan(
        "user_1",
        deps({
          getGrants: async () => {
            throw new Error("db down");
          },
        }),
      ),
    ).rejects.toThrow("db down");
  });

  it("isUserPro is the same decision, not a shortcut", async () => {
    expect(await isUserPro("user_1", deps({ getGrants: async () => [grant()] }))).toBe(true);
    expect(await isUserPro(null, deps({ getGrants: async () => [grant()] }))).toBe(false);
  });
});

describe("B0.3 · legacy premium_users compatibility window", () => {
  it("keeps an existing premium user Pro after the browser stopped deciding", async () => {
    // This is the regression that matters: removing the browser read must not
    // silently revoke access from users who already hold a legacy row.
    const plan = await resolveUserPlan(
      "user_1",
      deps({
        getLegacyGrants: async () => [
          grant({ id: "legacy_premium:1", grant_source: "legacy_premium", plan_id: "pro" }),
        ],
      }),
    );
    expect(plan.isPro).toBe(true);
    expect(plan.reason).toBe("ACTIVE_GRANT");
  });

  it("still resolves Free when the legacy source is absent", async () => {
    const plan = await resolveUserPlan("user_1", deps());
    expect(plan.isPro).toBe(false);
  });

  it("lets a real subscription outrank a legacy row", async () => {
    const plan = await resolveUserPlan(
      "user_1",
      deps({
        getSubscription: async () => subscription({ plan_id: "business" }),
        getLegacyGrants: async () => [
          grant({ id: "legacy_premium:1", grant_source: "legacy_premium", plan_id: "pro" }),
        ],
      }),
    );
    expect(plan.effectiveTier).toBe("business");
    expect(plan.reason).toBe("ACTIVE_PAID_SUBSCRIPTION");
  });
});
