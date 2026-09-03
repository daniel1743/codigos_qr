import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BillingCheckoutInput,
  BillingCheckoutRecord,
  BillingCustomerInput,
  BillingCustomerRecord,
  BillingEventRecord,
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
