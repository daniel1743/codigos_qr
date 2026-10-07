import { createServerFn } from "@tanstack/react-start";
import { requireBillingUser } from "../../server/billing/auth";
import { resolveUserPlan } from "../../server/billing/plan-service";

/**
 * Read-only browser boundary for UI capability decisions.
 * The browser supplies no user id and cannot override the resolved tier.
 *
 * B0 — this goes through the ONE decision service (`resolveUserPlan`), which
 * reads BOTH canonical sources (paid subscription and grants). It used to read
 * the subscription alone, so a user holding an invitation or an admin grant was
 * reported as free here while the QR studio called them Premium: the same user,
 * two answers. There is now a single answer.
 */
export const getAnalyticsEffectiveTierFn = createServerFn({ method: "GET", strict: false }).handler(
  async () => {
    const user = await requireBillingUser();
    return (await resolveUserPlan(user.userId)).effectiveTier;
  },
);
