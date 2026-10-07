import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BillingCheckoutInput,
  BillingCheckoutRecord,
  BillingCustomerInput,
  BillingCustomerRecord,
  BillingEventRecord,
  BillingGrantRecord,
  BillingProvider,
  BillingSubscriptionRecord,
  NormalizedSubscriptionInput,
  SafeBillingDiagnostic,
} from "../../lib/billing/billing.types.ts";

type BillingPersistenceClient = SupabaseClient;

async function resolveClient(client?: BillingPersistenceClient): Promise<BillingPersistenceClient> {
  if (client) return client;
  const { getBillingPrivilegedSupabaseClient } = await import("./auth.ts");
  return getBillingPrivilegedSupabaseClient();
}

function requireTrustedId(value: string, name: string): string {
  if (!value.trim()) throw new Error(`${name} is required.`);
  return value;
}

function throwIfError(error: { message: string; code?: string } | null): void {
  if (error) throw error;
}

export async function getCanonicalSubscriptionForUser(
  userId: string,
  client?: BillingPersistenceClient,
): Promise<BillingSubscriptionRecord | null> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_subscriptions")
    .select("*")
    .eq("user_id", requireTrustedId(userId, "userId"))
    .in("status", ["pending", "active", "past_due", "paused"])
    .maybeSingle();

  throwIfError(error);
  return (data as BillingSubscriptionRecord | null) ?? null;
}

export async function getSubscriptionByProviderId(
  provider: BillingProvider,
  providerSubscriptionId: string,
  client?: BillingPersistenceClient,
): Promise<BillingSubscriptionRecord | null> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_subscriptions")
    .select("*")
    .eq("provider", provider)
    .eq(
      "provider_subscription_id",
      requireTrustedId(providerSubscriptionId, "providerSubscriptionId"),
    )
    .maybeSingle();

  throwIfError(error);
  return (data as BillingSubscriptionRecord | null) ?? null;
}

export async function upsertNormalizedSubscription(
  input: NormalizedSubscriptionInput,
  client?: BillingPersistenceClient,
): Promise<BillingSubscriptionRecord> {
  const supabase = await resolveClient(client);
  const existing = input.provider_subscription_id
    ? await getSubscriptionByProviderId(input.provider, input.provider_subscription_id, supabase)
    : null;

  if (existing) {
    const { data, error } = await supabase
      .from("billing_subscriptions")
      .update(input)
      .eq("id", existing.id)
      .select()
      .single();
    throwIfError(error);
    return data as BillingSubscriptionRecord;
  }

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .insert(input)
    .select()
    .single();
  if (error?.code === "23505" && input.provider_subscription_id) {
    const raced = await getSubscriptionByProviderId(
      input.provider,
      input.provider_subscription_id,
      supabase,
    );
    if (raced) return upsertNormalizedSubscription({ ...input }, supabase);
  }
  throwIfError(error);
  return data as BillingSubscriptionRecord;
}

export async function getBillingCustomer(
  userId: string,
  provider: BillingProvider,
  client?: BillingPersistenceClient,
): Promise<BillingCustomerRecord | null> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_customers")
    .select("*")
    .eq("user_id", requireTrustedId(userId, "userId"))
    .eq("provider", provider)
    .maybeSingle();

  throwIfError(error);
  return (data as BillingCustomerRecord | null) ?? null;
}

export async function getBillingCustomerByProviderCustomerId(
  provider: BillingProvider,
  providerCustomerId: string,
  client?: BillingPersistenceClient,
): Promise<BillingCustomerRecord | null> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_customers")
    .select("*")
    .eq("provider", provider)
    .eq("provider_customer_id", requireTrustedId(providerCustomerId, "providerCustomerId"))
    .maybeSingle();

  throwIfError(error);
  return (data as BillingCustomerRecord | null) ?? null;
}

export async function upsertBillingCustomer(
  input: BillingCustomerInput,
  client?: BillingPersistenceClient,
): Promise<BillingCustomerRecord> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_customers")
    .upsert(input, { onConflict: "user_id,provider" })
    .select()
    .single();

  throwIfError(error);
  return data as BillingCustomerRecord;
}

export async function createBillingCheckout(
  input: BillingCheckoutInput,
  client?: BillingPersistenceClient,
): Promise<BillingCheckoutRecord> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_checkouts")
    .insert(input)
    .select()
    .single();

  throwIfError(error);
  return data as BillingCheckoutRecord;
}

export async function getBillingCheckoutForUser(
  checkoutId: string,
  userId: string,
  client?: BillingPersistenceClient,
): Promise<BillingCheckoutRecord | null> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_checkouts")
    .select("*")
    .eq("id", requireTrustedId(checkoutId, "checkoutId"))
    .eq("user_id", requireTrustedId(userId, "userId"))
    .maybeSingle();

  throwIfError(error);
  return (data as BillingCheckoutRecord | null) ?? null;
}

export async function getBillingCheckoutByProviderCheckoutId(
  provider: BillingProvider,
  providerCheckoutId: string,
  client?: BillingPersistenceClient,
): Promise<BillingCheckoutRecord | null> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_checkouts")
    .select("*")
    .eq("provider", provider)
    .eq("provider_checkout_id", requireTrustedId(providerCheckoutId, "providerCheckoutId"))
    .maybeSingle();

  throwIfError(error);
  return (data as BillingCheckoutRecord | null) ?? null;
}

export async function updateBillingCheckoutStatus(
  checkoutId: string,
  userId: string,
  status: BillingCheckoutRecord["status"],
  client?: BillingPersistenceClient,
): Promise<BillingCheckoutRecord> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_checkouts")
    .update({ status })
    .eq("id", requireTrustedId(checkoutId, "checkoutId"))
    .eq("user_id", requireTrustedId(userId, "userId"))
    .select()
    .single();

  throwIfError(error);
  return data as BillingCheckoutRecord;
}

/* ========================= B0 — grants (canonical) ======================= */

/**
 * Every NON-revoked grant for a user, active or expired.
 *
 * Expiry is deliberately NOT filtered in SQL: the resolver already owns that
 * decision (`isGrantActive`) and duplicating it here would create a second
 * place where "is this grant in force?" is answered. Revoked rows are excluded
 * because they can never count, at any clock.
 */
export async function getGrantsForUser(
  userId: string,
  client?: BillingPersistenceClient,
): Promise<BillingGrantRecord[]> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_grants")
    .select("*")
    .eq("user_id", requireTrustedId(userId, "userId"))
    .is("revoked_at", null);

  throwIfError(error);
  return (data as BillingGrantRecord[] | null) ?? [];
}

/** Inserts an admin/promotion grant. Invitation grants go through the RPC. */
export async function insertBillingGrant(
  input: {
    user_id: string;
    plan_id: BillingGrantRecord["plan_id"];
    grant_source: BillingGrantRecord["grant_source"];
    expires_at?: string | null;
    granted_by?: string | null;
    note?: string | null;
  },
  client?: BillingPersistenceClient,
): Promise<BillingGrantRecord> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_grants")
    .insert({
      user_id: requireTrustedId(input.user_id, "userId"),
      plan_id: input.plan_id,
      grant_source: input.grant_source,
      expires_at: input.expires_at ?? null,
      granted_by: input.granted_by ?? null,
      note: input.note ?? null,
    })
    .select()
    .single();

  throwIfError(error);
  return data as BillingGrantRecord;
}

/** Soft revoke. History is preserved; the grant simply stops counting. */
export async function revokeBillingGrant(
  grantId: string,
  client?: BillingPersistenceClient,
): Promise<BillingGrantRecord> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_grants")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", requireTrustedId(grantId, "grantId"))
    .select()
    .single();

  throwIfError(error);
  return data as BillingGrantRecord;
}

/**
 * B0.3 — LEGACY COMPATIBILITY READ of `premium_users`.
 *
 * WHY THIS EXISTS
 * `premium_users` used to be the *entitlement* — the browser read it and decided
 * Premium on its own. B0 removed that decision from the browser, but it must not
 * silently revoke access from the users who already hold a row: they are real,
 * historical grants that nobody has migrated yet.
 *
 * So the table is READ here, on the server, and its rows are presented to the
 * resolver as ordinary grants with `grant_source: "legacy_premium"`. Nothing
 * else in the system can read it, and the UI still cannot decide anything — the
 * decision stays in the one resolver.
 *
 * THIS IS TEMPORARY, AND IT IS NAMED
 * It is a compatibility source with a defined exit, not a permanent exception:
 * once `premium_users` rows are backfilled into `billing_grants` (the statement
 * is prepared in the B0 close-out report, deliberately NOT applied here), this
 * function and its call site are deleted and the table can be dropped.
 *
 * The mapping to canonical vocabulary is one-way and explicit:
 *   tier 'premium'      → plan_id 'pro'
 *   tier 'premium_pro'  → plan_id 'business'
 *
 * Reads through the PRIVILEGED client: the browser role has no access to this
 * table through this path even though its RLS once allowed an own-row read.
 */
export async function getLegacyPremiumGrants(
  userId: string,
  client?: BillingPersistenceClient,
): Promise<BillingGrantRecord[]> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("premium_users")
    .select("id, user_id, tier, expires_at, created_at")
    .eq("user_id", requireTrustedId(userId, "userId"));

  throwIfError(error);

  const rows = (data as Array<Record<string, unknown>> | null) ?? [];
  const now = Date.now();

  return rows
    .map((row): BillingGrantRecord | null => {
      const tier = typeof row["tier"] === "string" ? row["tier"] : "premium";
      const planId = tier === "premium_pro" ? "business" : "pro";
      const expiresAt = (row["expires_at"] as string | null) ?? null;

      // Expiry is applied HERE, once, so the resolver receives a grant that is
      // either in force or absent — never a legacy row it has to interpret.
      if (expiresAt !== null) {
        const ms = Date.parse(expiresAt);
        if (!Number.isFinite(ms) || ms <= now) return null;
      }

      const createdAt =
        typeof row["created_at"] === "string" ? row["created_at"] : new Date(0).toISOString();
      return {
        id: `legacy_premium:${String(row["id"])}`,
        user_id: String(row["user_id"]),
        plan_id: planId,
        grant_source: "legacy_premium",
        expires_at: expiresAt,
        revoked_at: null,
        granted_by: null,
        invitation_code_id: null,
        note: "Migrated view of a premium_users row (B0 compatibility source).",
        created_at: createdAt,
        updated_at: createdAt,
      };
    })
    .filter((grant): grant is BillingGrantRecord => grant !== null);
}

/** The outcome the SECURITY DEFINER redeem function reports back. */
export type RedeemResult =
  | { ok: true; grantId: string; planId: string; expiresAt: string | null }
  | { ok: false; reason: "INVALID" | "ALREADY_REDEEMED" };

/**
 * Calls the server-only redemption RPC.
 *
 * The privileged client is used, so the call runs under `service_role` and the
 * function's EXECUTE grant (service_role only) is satisfied. The browser can
 * never reach this: the RPC is revoked from PUBLIC/anon/authenticated, and the
 * only caller is the server-function boundary.
 *
 * `userId` MUST come from `requireBillingUser()` — never from a request body.
 */
export async function redeemInvitationCode(
  userId: string,
  code: string,
  client?: BillingPersistenceClient,
): Promise<RedeemResult> {
  const { data, error } = await (
    await resolveClient(client)
  ).rpc("redeem_invitation_code_v1", {
    p_user_id: requireTrustedId(userId, "userId"),
    p_code: code,
  });

  throwIfError(error);

  const payload = (data ?? {}) as Record<string, unknown>;
  if (payload["ok"] === true) {
    return {
      ok: true,
      grantId: String(payload["grant_id"] ?? ""),
      planId: String(payload["plan_id"] ?? ""),
      expiresAt: (payload["expires_at"] as string | null) ?? null,
    };
  }

  const reason = payload["reason"] === "ALREADY_REDEEMED" ? "ALREADY_REDEEMED" : "INVALID";
  return { ok: false, reason };
}

export async function claimBillingEvent(
  provider: BillingProvider,
  eventId: string,
  client?: BillingPersistenceClient,
): Promise<boolean> {
  const { data, error } = await (
    await resolveClient(client)
  ).rpc("claim_billing_event", {
    p_provider: provider,
    p_event_id: requireTrustedId(eventId, "eventId"),
  });

  throwIfError(error);
  return data === true;
}

export async function markBillingEventProcessed(
  provider: BillingProvider,
  eventId: string,
  client?: BillingPersistenceClient,
): Promise<BillingEventRecord> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("event_id", requireTrustedId(eventId, "eventId"))
    .select()
    .single();

  throwIfError(error);
  return data as BillingEventRecord;
}

export async function markBillingEventFailed(
  provider: BillingProvider,
  eventId: string,
  diagnostic: SafeBillingDiagnostic,
  client?: BillingPersistenceClient,
): Promise<BillingEventRecord> {
  const { data, error } = await (
    await resolveClient(client)
  )
    .from("billing_events")
    .update({ status: "failed", ...diagnostic })
    .eq("provider", provider)
    .eq("event_id", requireTrustedId(eventId, "eventId"))
    .select()
    .single();

  throwIfError(error);
  return data as BillingEventRecord;
}
