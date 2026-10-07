import { createServerFn } from "@tanstack/react-start";
import { requireBillingUser } from "../../server/billing/auth";
import { resolveUserPlan, type PlanDecision } from "../../server/billing/plan-service";
import { redeemInvitationCode } from "../../server/billing/persistence";

/**
 * CRIPQER BILLING — B0 · BROWSER-FACING PLAN BOUNDARY
 *
 * The ONLY way the browser is allowed to learn about paid access, and the only
 * way it can redeem an invitation code.
 *
 * Two things this boundary guarantees:
 *
 *  1. The browser supplies NO identity on either call. `requireBillingUser()`
 *     resolves the user from the session cookies server-side, so a client cannot
 *     ask about — or redeem for — anybody else.
 *  2. The browser never touches a table. It does not read `premium_users`, it
 *     does not read `invitation_codes`, and it cannot list codes: the redemption
 *     RPC is service-role only and the enumerating policy is gone.
 *
 * Before B0, `QRStudio` read `premium_users` with the browser client and fell
 * back to a hardcoded e-mail allowlist. That is exactly the class of parallel
 * decision this module removes: the answer now comes from one place.
 */

/**
 * The canonical plan of the CURRENT user. Read-only.
 *
 * Fails closed: an anonymous visitor, an expired session or a lookup failure all
 * resolve to `free` — the boundary never invents paid access.
 */
export const getMyPlanFn = createServerFn({ method: "GET", strict: false }).handler(
  async (): Promise<PlanDecision> => {
    try {
      const user = await requireBillingUser();
      return await resolveUserPlan(user.userId);
    } catch {
      // No session — the common case for a public page. Free, without throwing.
      return {
        effectiveTier: "free",
        hasPaidAccess: false,
        isPro: false,
        canonicalPlanId: null,
        subscriptionStatus: null,
        cancelAtPeriodEnd: null,
        currentPeriodEnd: null,
        reason: "NO_SUBSCRIPTION",
      };
    }
  },
);

export interface RedeemInviteCodeResult {
  ok: boolean;
  /**
   * `INVALID` deliberately covers unknown, inactive, expired and exhausted
   * codes with ONE value: the browser must not be able to tell a real code from
   * a fake one by the shape of the answer.
   */
  reason?: "INVALID" | "ALREADY_REDEEMED" | "UNAUTHENTICATED";
  planId?: string;
  expiresAt?: string | null;
}

/**
 * Redeems an invitation code for the CURRENT authenticated user.
 *
 * The code is checked server-side, the grant is written by an atomic
 * `SECURITY DEFINER` function, and the browser never sees the code table.
 */
export const redeemInviteCodeFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Solicitud inválida.");
    const raw = (input as { code?: unknown }).code;
    if (typeof raw !== "string") throw new Error("Solicitud inválida.");
    // Bound the input: a code is short, and an unbounded string is free work for
    // the server. Trim here so the RPC receives what the user meant to type.
    const code = raw.trim().slice(0, 128);
    return { code };
  })
  .handler(async ({ data }): Promise<RedeemInviteCodeResult> => {
    let userId: string;
    try {
      userId = (await requireBillingUser()).userId;
    } catch {
      // An anonymous caller gets a typed answer, not an exception. The code is
      // not inspected at all in that case, so an unauthenticated probe learns
      // nothing about which codes exist.
      return { ok: false, reason: "UNAUTHENTICATED" };
    }

    const result = await redeemInvitationCode(userId, data.code);
    if (!result.ok) return { ok: false, reason: result.reason };

    return { ok: true, planId: result.planId, expiresAt: result.expiresAt };
  });
