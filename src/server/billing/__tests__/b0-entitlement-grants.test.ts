import { describe, expect, it } from "vitest";
import {
  isGrantActive,
  resolveEntitlementWithGrants,
  selectStrongestActiveGrant,
} from "../entitlements";
import type {
  BillingGrantRecord,
  BillingSubscriptionRecord,
} from "../../../lib/billing/billing.types";

/**
 * B0 — the ONE Free/Pro decision.
 *
 * Before B0, paid access came from a subscription only, and grants lived in a
 * table nobody canonical consulted. These tests pin the new precedence and,
 * just as importantly, the fail-closed edges: a revoked, expired or malformed
 * grant must never grant access.
 */

const NOW = "2026-10-07T12:00:00.000Z";

function grant(overrides: Partial<BillingGrantRecord> = {}): BillingGrantRecord {
  return {
    id: "grant_1",
    user_id: "user_1",
    plan_id: "pro",
    grant_source: "invitation",
    expires_at: null,
    revoked_at: null,
    granted_by: null,
    invitation_code_id: "code_1",
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
    provider_customer_id: "cus_1",
    provider_subscription_id: "sub_1",
    billing_interval: "monthly",
    currency: "USD",
    status: "active",
    current_period_start: "2026-09-01T00:00:00.000Z",
    current_period_end: "2026-11-01T00:00:00.000Z",
    cancel_at_period_end: false,
    payment_method_label: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("B0 · isGrantActive", () => {
  it("treats a null expires_at as PERMANENT, not as missing", () => {
    expect(isGrantActive(grant({ expires_at: null }), Date.parse(NOW))).toBe(true);
  });

  it("counts a future expiry as active and a past one as inert", () => {
    expect(isGrantActive(grant({ expires_at: "2026-12-01T00:00:00.000Z" }), Date.parse(NOW))).toBe(
      true,
    );
    expect(isGrantActive(grant({ expires_at: "2026-09-01T00:00:00.000Z" }), Date.parse(NOW))).toBe(
      false,
    );
  });

  it("never counts a revoked grant, even a permanent one", () => {
    expect(isGrantActive(grant({ revoked_at: NOW, expires_at: null }), Date.parse(NOW))).toBe(
      false,
    );
  });

  it("fails closed on a malformed expiry", () => {
    expect(isGrantActive(grant({ expires_at: "not-a-date" }), Date.parse(NOW))).toBe(false);
  });

  it("fails closed on a non-canonical plan or source", () => {
    expect(isGrantActive(grant({ plan_id: "free" as never }), Date.parse(NOW))).toBe(false);
    expect(isGrantActive(grant({ grant_source: "guess" as never }), Date.parse(NOW))).toBe(false);
  });
});

describe("B0 · selectStrongestActiveGrant", () => {
  it("returns null for an empty, absent or non-array input", () => {
    expect(selectStrongestActiveGrant([], Date.parse(NOW))).toBeNull();
    expect(selectStrongestActiveGrant(null, Date.parse(NOW))).toBeNull();
    expect(selectStrongestActiveGrant(undefined, Date.parse(NOW))).toBeNull();
  });

  it("prefers the higher plan over the lower one", () => {
    const chosen = selectStrongestActiveGrant(
      [grant({ id: "a", plan_id: "pro" }), grant({ id: "b", plan_id: "business" })],
      Date.parse(NOW),
    );
    expect(chosen?.id).toBe("b");
  });

  it("prefers the longer-running grant when the plans tie", () => {
    const chosen = selectStrongestActiveGrant(
      [
        grant({ id: "short", expires_at: "2026-11-01T00:00:00.000Z" }),
        grant({ id: "forever", expires_at: null }),
      ],
      Date.parse(NOW),
    );
    expect(chosen?.id).toBe("forever");
  });

  it("ignores inactive grants entirely", () => {
    const chosen = selectStrongestActiveGrant(
      [
        grant({ id: "revoked", plan_id: "enterprise", revoked_at: NOW }),
        grant({ id: "expired", plan_id: "enterprise", expires_at: "2026-01-01T00:00:00.000Z" }),
        grant({ id: "live", plan_id: "pro" }),
      ],
      Date.parse(NOW),
    );
    expect(chosen?.id).toBe("live");
  });
});

describe("B0 · resolveEntitlementWithGrants", () => {
  it("grants Pro from an invitation with no subscription at all", () => {
    const result = resolveEntitlementWithGrants({
      subscription: null,
      grants: [grant()],
      now: NOW,
    });
    expect(result.effectiveTier).toBe("pro");
    expect(result.hasPaidAccess).toBe(true);
    expect(result.reason).toBe("ACTIVE_GRANT");
  });

  it("reports free when every grant is expired or revoked", () => {
    const result = resolveEntitlementWithGrants({
      subscription: null,
      grants: [
        grant({ id: "a", expires_at: "2026-01-01T00:00:00.000Z" }),
        grant({ id: "b", revoked_at: NOW }),
      ],
      now: NOW,
    });
    expect(result.effectiveTier).toBe("free");
    expect(result.hasPaidAccess).toBe(false);
    expect(result.reason).toBe("NO_SUBSCRIPTION");
  });

  it("lets the SUBSCRIPTION win when both sources grant access", () => {
    const result = resolveEntitlementWithGrants({
      subscription: subscription({ plan_id: "business" }),
      grants: [grant({ plan_id: "pro" })],
      now: NOW,
    });
    expect(result.effectiveTier).toBe("business");
    expect(result.reason).toBe("ACTIVE_PAID_SUBSCRIPTION");
  });

  it("falls back to the grant when the subscription is NOT active", () => {
    const result = resolveEntitlementWithGrants({
      subscription: subscription({ status: "past_due" }),
      grants: [grant({ plan_id: "pro" })],
      now: NOW,
    });
    expect(result.effectiveTier).toBe("pro");
    expect(result.reason).toBe("ACTIVE_GRANT");
  });

  it("keeps the subscription's diagnostic when nothing grants access", () => {
    const result = resolveEntitlementWithGrants({
      subscription: subscription({ status: "past_due" }),
      grants: [],
      now: NOW,
    });
    expect(result.effectiveTier).toBe("free");
    // Losing this would turn a billing problem into a generic "no subscription".
    expect(result.reason).toBe("PAST_DUE");
  });

  it("never demotes an active subscription that cancels at period end", () => {
    const result = resolveEntitlementWithGrants({
      subscription: subscription({ cancel_at_period_end: true }),
      grants: [],
      now: NOW,
    });
    expect(result.hasPaidAccess).toBe(true);
    expect(result.cancelAtPeriodEnd).toBe(true);
  });

  it("uses the grant's own end date as the horizon when there is no subscription", () => {
    const end = "2027-01-01T00:00:00.000Z";
    const result = resolveEntitlementWithGrants({
      subscription: null,
      grants: [grant({ expires_at: end })],
      now: NOW,
    });
    expect(result.currentPeriodEnd).toBe(end);
  });

  it("is deterministic: the same input always yields the same answer", () => {
    const input = { subscription: null, grants: [grant()], now: NOW };
    expect(resolveEntitlementWithGrants(input)).toEqual(resolveEntitlementWithGrants(input));
  });
});
