import { createServerFn } from "@tanstack/react-start";
import { resolveEntitlement } from "../../server/billing/entitlements";
import { requireBillingUser } from "../../server/billing/auth";
import { getCanonicalSubscriptionForUser } from "../../server/billing/persistence";

/**
 * Read-only browser boundary for UI capability decisions.
 * The browser supplies no user id and cannot override the resolved tier.
 */
export const getAnalyticsEffectiveTierFn = createServerFn({ method: "GET", strict: false }).handler(
  async () => {
    const user = await requireBillingUser();
    const subscription = await getCanonicalSubscriptionForUser(user.userId);
    return resolveEntitlement(subscription).effectiveTier;
  },
);
