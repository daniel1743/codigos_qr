/**
 * Receiving-side canonical billing types for Cripqer Billing V1.
 * These are intentionally provider-neutral and will later map to the approved
 * portable Billing contract without importing that package in this phase.
 */

export const BILLING_PLAN_IDS = ["pro", "business", "enterprise"] as const;
export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];

export const BILLING_PROVIDERS = ["stripe", "mercado_pago", "paypal"] as const;
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

export const BILLING_INTERVALS = ["monthly", "yearly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const BILLING_SUBSCRIPTION_STATUSES = [
  "pending",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "expired",
] as const;
export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number];

export const BILLING_CHECKOUT_STATUSES = [
  "processing",
  "pending",
  "success",
  "failed",
  "cancelled",
  "expired",
] as const;
export type BillingCheckoutStatus = (typeof BILLING_CHECKOUT_STATUSES)[number];

export const BILLING_EVENT_STATUSES = ["processing", "processed", "failed"] as const;
export type BillingEventStatus = (typeof BILLING_EVENT_STATUSES)[number];

/**
 * B0 — canonical non-subscription sources of paid access.
 *
 * A grant is anything that gives paid access WITHOUT a provider subscription:
 * an invitation code, an admin action, a promotion, or a legacy `premium_users`
 * row during the compatibility window. Grants live in `billing_grants` and are
 * read ONLY by the entitlement resolver — never by the browser.
 */
export const BILLING_GRANT_SOURCES = [
  "invitation",
  "admin",
  "promotion",
  "legacy_premium",
] as const;
export type BillingGrantSource = (typeof BILLING_GRANT_SOURCES)[number];

export interface BillingGrantRecord {
  id: string;
  user_id: string;
  plan_id: BillingPlanId;
  grant_source: BillingGrantSource;
  /** NULL means a PERMANENT grant — a legitimate state, not a missing value. */
  expires_at: string | null;
  /** Soft revoke: a revoked grant stops counting but is never deleted. */
  revoked_at: string | null;
  granted_by: string | null;
  invitation_code_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingCustomerRecord {
  id: string;
  user_id: string;
  provider: BillingProvider;
  provider_customer_id: string;
  created_at: string;
  updated_at: string;
}

export interface BillingSubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: BillingPlanId;
  provider: BillingProvider;
  billing_customer_id: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  billing_interval: BillingInterval | null;
  currency: string | null;
  status: BillingSubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingCheckoutRecord {
  id: string;
  user_id: string;
  provider: BillingProvider;
  plan_id: BillingPlanId;
  billing_interval: BillingInterval;
  provider_checkout_id: string | null;
  status: BillingCheckoutStatus;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface BillingEventRecord {
  id: string;
  provider: BillingProvider;
  event_id: string;
  status: BillingEventStatus;
  received_at: string;
  processed_at: string | null;
  error_code: string | null;
  diagnostic_reference: string | null;
}

export type NormalizedSubscriptionInput = Omit<
  BillingSubscriptionRecord,
  "id" | "created_at" | "updated_at"
>;

export type BillingCustomerInput = Omit<BillingCustomerRecord, "id" | "created_at" | "updated_at">;

export type BillingCheckoutInput = Omit<BillingCheckoutRecord, "id" | "created_at" | "updated_at">;

export type SafeBillingDiagnostic = Pick<BillingEventRecord, "error_code" | "diagnostic_reference">;
