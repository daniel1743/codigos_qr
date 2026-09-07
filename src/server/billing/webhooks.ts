/**
 * CRIPQER BILLING V1 — canonical webhook normalization core (SERVER-SIDE ONLY).
 *
 * Provider-agnostic normalization of verified provider webhook payloads, plus a
 * canonical idempotency bridge. This module:
 *
 *   - contains NO provider SDKs, NO secrets, NO network calls, NO routes;
 *   - performs NO persistence writes of its own (subscription application is a
 *     later phase) — only the idempotency bridge is wired to canonical
 *     persistence primitives;
 *   - accepts the RAW provider payload only as transient function input, uses it
 *     during normalization, and NEVER emits it in normalized output nor
 *     persists it (canonical billing_events has no raw column by design);
 *   - never introduces a "free" subscription status: Free is represented by the
 *     absence of a canonical paid billing_subscriptions row.
 *
 * Pipeline slice delivered here:
 *
 *   raw/verified provider payload
 *     -> normalization (Stripe / Mercado Pago / PayPal)
 *     -> normalized Billing event | authoritative lookup instruction
 *     -> canonical event idempotency bridge (claimBillingEvent /
 *        markBillingEventProcessed / markBillingEventFailed)
 *
 * Signature verification and authoritative provider API fetches are host-owned
 * (later phases); only their contracts are declared here.
 */

import type {
  BillingInterval,
  BillingProvider,
  BillingSubscriptionStatus,
  SafeBillingDiagnostic,
} from "../../lib/billing/billing.types.ts";

/* ------------------------------ event types ------------------------------- */

export type BillingEventType =
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_ACTIVATED"
  | "SUBSCRIPTION_UPDATED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "SUBSCRIPTION_PAUSED"
  | "SUBSCRIPTION_CANCELLED"
  | "SUBSCRIPTION_EXPIRED";

/**
 * Provider-neutral, canonical normalized billing event.
 *
 * `providerSubscriptionId` is ALWAYS a subscription reference — never an
 * invoice / sale / payment id. `status` uses the canonical PAID
 * BillingSubscriptionStatus semantics; the portable "free" sentinel is
 * deliberately absent. `raw` is intentionally NOT part of this shape.
 */
export interface NormalizedBillingEvent {
  eventId: string;
  provider: BillingProvider;
  type: BillingEventType;
  occurredAt: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerPlanId: string | null;
  billingInterval: BillingInterval | null;
  currency: string | null;
  status: BillingSubscriptionStatus | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  requiresAuthoritativeLookup: boolean;
}

/* ---------------------------- lookup contract ----------------------------- */

/** Resource kinds a provider notification can point at. */
export type ProviderResourceType =
  | "subscription"
  | "preapproval"
  | "authorized_payment"
  | "payment"
  | "invoice"
  | "sale"
  | "unknown";

/**
 * Emitted when a notification is "thin" (Mercado Pago) or points at a
 * non-subscription resource (PayPal sale). The host MUST fetch the
 * authoritative resource from the provider API before normalizing state.
 */
export interface WebhookLookupInstruction {
  eventId: string;
  provider: BillingProvider;
  resourceType: ProviderResourceType;
  resourceId: string | null;
  occurredAt: string;
}

export type WebhookIntake =
  | { kind: "normalized"; event: NormalizedBillingEvent }
  | { kind: "lookup_required"; lookup: WebhookLookupInstruction }
  | { kind: "ignored"; reason: string };

/* --------------------------- verification contract ------------------------ */

/**
 * The host implements one verifier per provider using its server secrets. It
 * MUST verify over the RAW request body using a timing-safe compare. No secrets
 * live in this module and no real signature verification is implemented here.
 */
export interface WebhookVerifier {
  verify(rawBody: string, headers: Record<string, string>): Promise<boolean> | boolean;
}

/** Authoritative provider resource lookup — implemented by the host. */
export interface ProviderResourceFetcher {
  fetchResource(
    provider: BillingProvider,
    resourceType: ProviderResourceType,
    resourceId: string,
  ): Promise<unknown>;
}

/* ------------------------------ status maps ------------------------------- */

export const STRIPE_SUBSCRIPTION_STATUS: Record<string, BillingSubscriptionStatus> = {
  trialing: "active",
  active: "active",
  past_due: "past_due",
  unpaid: "past_due",
  paused: "paused",
  canceled: "cancelled",
  incomplete: "pending",
  incomplete_expired: "expired",
};

export const MERCADO_PAGO_STATUS: Record<string, BillingSubscriptionStatus> = {
  pending: "pending",
  authorized: "active",
  paused: "paused",
  cancelled: "cancelled",
  finished: "expired",
};

export const PAYPAL_STATUS: Record<string, BillingSubscriptionStatus> = {
  APPROVAL_PENDING: "pending",
  APPROVED: "pending",
  ACTIVE: "active",
  SUSPENDED: "paused",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

/* -------------------------------- helpers --------------------------------- */

/** Safe ISO parser: never throws, returns null for anything unparseable. */
export function safeIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const ms = Math.abs(value) < 1e11 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;

const get = (o: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], o);

/* ------------------------------- Stripe ----------------------------------- */

const STRIPE_SUBSCRIPTION_EVENTS: Record<string, BillingEventType> = {
  "customer.subscription.created": "SUBSCRIPTION_CREATED",
  "customer.subscription.updated": "SUBSCRIPTION_UPDATED",
  "customer.subscription.deleted": "SUBSCRIPTION_CANCELLED",
  "customer.subscription.paused": "SUBSCRIPTION_PAUSED",
  "customer.subscription.resumed": "SUBSCRIPTION_UPDATED",
};

const STRIPE_INVOICE_EVENTS: Record<string, BillingEventType> = {
  "invoice.paid": "PAYMENT_SUCCEEDED",
  "invoice.payment_succeeded": "PAYMENT_SUCCEEDED",
  "invoice.payment_failed": "PAYMENT_FAILED",
};

/** Stripe places the subscription reference in different fields per object. */
function stripeSubscriptionRefFromInvoice(invoice: unknown): string | null {
  return (
    str(get(invoice, "subscription")) ??
    str(get(invoice, "subscription_details.subscription")) ??
    str(get(invoice, "parent.subscription_details.subscription")) ??
    str(get(invoice, "lines.data.0.subscription")) ??
    str(get(invoice, "lines.data.0.parent.subscription_item_details.subscription")) ??
    null
  );
}

export function normalizeStripeEvent(event: unknown): NormalizedBillingEvent | null {
  const type = String(get(event, "type") ?? "");
  const obj = get(event, "data.object");
  const eventId = str(get(event, "id")) ?? "";
  const occurredAt = safeIso(get(event, "created")) ?? new Date().toISOString();

  const subEvent = STRIPE_SUBSCRIPTION_EVENTS[type];
  if (subEvent) {
    return {
      eventId,
      provider: "stripe",
      type: subEvent,
      occurredAt,
      providerCustomerId: str(get(obj, "customer")),
      providerSubscriptionId: str(get(obj, "id")),
      providerPlanId: str(get(obj, "items.data.0.price.id")),
      billingInterval:
        get(obj, "items.data.0.price.recurring.interval") === "year" ? "yearly" : "monthly",
      currency: (str(get(obj, "currency")) ?? "").toUpperCase() || null,
      status: STRIPE_SUBSCRIPTION_STATUS[String(get(obj, "status") ?? "")] ?? null,
      currentPeriodStart:
        safeIso(get(obj, "current_period_start")) ??
        safeIso(get(obj, "items.data.0.current_period_start")),
      currentPeriodEnd:
        safeIso(get(obj, "current_period_end")) ??
        safeIso(get(obj, "items.data.0.current_period_end")),
      cancelAtPeriodEnd:
        typeof get(obj, "cancel_at_period_end") === "boolean"
          ? (get(obj, "cancel_at_period_end") as boolean)
          : null,
      requiresAuthoritativeLookup: false,
    };
  }

  const invEvent = STRIPE_INVOICE_EVENTS[type];
  if (invEvent) {
    const subscriptionId = stripeSubscriptionRefFromInvoice(obj);
    return {
      eventId,
      provider: "stripe",
      type: invEvent,
      occurredAt,
      providerCustomerId: str(get(obj, "customer")),
      // NEVER the invoice id.
      providerSubscriptionId: subscriptionId,
      providerPlanId: str(get(obj, "lines.data.0.price.id")),
      billingInterval:
        get(obj, "lines.data.0.price.recurring.interval") === "year" ? "yearly" : "monthly",
      currency: (str(get(obj, "currency")) ?? "").toUpperCase() || null,
      // An invoice carries no subscription status; the host reads it from the
      // subscription object or a subsequent subscription event.
      status: null,
      currentPeriodStart: safeIso(get(obj, "lines.data.0.period.start")),
      currentPeriodEnd: safeIso(get(obj, "lines.data.0.period.end")),
      cancelAtPeriodEnd: null,
      requiresAuthoritativeLookup: subscriptionId === null,
    };
  }

  if (type === "checkout.session.completed") {
    const subscriptionId = str(get(obj, "subscription"));
    return {
      eventId,
      provider: "stripe",
      type: "SUBSCRIPTION_ACTIVATED",
      occurredAt,
      providerCustomerId: str(get(obj, "customer")),
      providerSubscriptionId: subscriptionId,
      providerPlanId: null,
      billingInterval: null,
      currency: (str(get(obj, "currency")) ?? "").toUpperCase() || null,
      status: get(obj, "payment_status") === "paid" ? "active" : "pending",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: null,
      requiresAuthoritativeLookup: subscriptionId === null,
    };
  }

  return null;
}

/* ----------------------------- Mercado Pago -------------------------------- */

/**
 * Mercado Pago notifications are THIN: they carry a topic and a resource id,
 * not a complete subscription. Never trust status/plan/currency from the body.
 */
export function intakeMercadoPagoNotification(event: unknown): WebhookIntake {
  const topic = String(get(event, "type") ?? get(event, "topic") ?? "");
  const action = String(get(event, "action") ?? "");
  const resourceId =
    str(get(event, "data.id")) ?? str(get(event, "resource")) ?? str(get(event, "id"));
  const eventId =
    str(get(event, "id")) ?? (resourceId ? `${topic}:${action}:${resourceId}` : "");

  const resourceType: ProviderResourceType =
    topic.includes("preapproval_plan")
      ? "unknown"
      : topic.includes("preapproval") || topic.includes("subscription")
        ? "preapproval"
        : topic.includes("authorized_payment")
          ? "authorized_payment"
          : topic.includes("payment")
            ? "payment"
            : "unknown";

  if (!resourceId || resourceType === "unknown") {
    return { kind: "ignored", reason: "unsupported_or_incomplete_notification" };
  }

  return {
    kind: "lookup_required",
    lookup: {
      eventId,
      provider: "mercado_pago",
      resourceType,
      resourceId,
      occurredAt: safeIso(get(event, "date_created")) ?? new Date().toISOString(),
    },
  };
}

/**
 * Normalizes the AUTHORITATIVE resource fetched from the Mercado Pago API
 * (preapproval, authorized payment, or payment), not the webhook body.
 */
export function normalizeMercadoPagoResource(
  resource: unknown,
  lookup: WebhookLookupInstruction,
): NormalizedBillingEvent | null {
  const isPreapproval =
    lookup.resourceType === "preapproval" || lookup.resourceType === "unknown";
  const preapprovalId = isPreapproval
    ? str(get(resource, "id"))
    : str(get(resource, "preapproval_id"));

  const rawStatus = String(get(resource, "status") ?? "");
  const status = isPreapproval ? (MERCADO_PAGO_STATUS[rawStatus] ?? null) : null;

  let type: BillingEventType;
  if (isPreapproval) {
    type =
      status === "active"
        ? "SUBSCRIPTION_ACTIVATED"
        : status === "paused"
          ? "SUBSCRIPTION_PAUSED"
          : status === "cancelled"
            ? "SUBSCRIPTION_CANCELLED"
            : status === "expired"
              ? "SUBSCRIPTION_EXPIRED"
              : status === "pending"
                ? "SUBSCRIPTION_CREATED"
                : "SUBSCRIPTION_UPDATED";
  } else {
    type = ["approved", "accredited"].includes(rawStatus)
      ? "PAYMENT_SUCCEEDED"
      : rawStatus === "refunded"
        ? "PAYMENT_REFUNDED"
        : ["rejected", "cancelled"].includes(rawStatus)
          ? "PAYMENT_FAILED"
          : "SUBSCRIPTION_UPDATED";
  }

  return {
    eventId: lookup.eventId,
    provider: "mercado_pago",
    type,
    occurredAt: lookup.occurredAt,
    providerCustomerId:
      str(get(resource, "payer_id")) ?? str(get(resource, "payer.id")) ?? null,
    providerSubscriptionId: preapprovalId,
    providerPlanId: str(get(resource, "preapproval_plan_id")),
    billingInterval: isPreapproval
      ? get(resource, "auto_recurring.frequency_type") === "years"
        ? "yearly"
        : "monthly"
      : null,
    currency:
      str(get(resource, "auto_recurring.currency_id")) ?? str(get(resource, "currency_id")),
    status,
    currentPeriodStart: safeIso(get(resource, "last_modified")),
    currentPeriodEnd: safeIso(get(resource, "next_payment_date")),
    cancelAtPeriodEnd: null,
    // A payment resource only points at the preapproval; the host still has to
    // read the preapproval to know the authoritative subscription state.
    requiresAuthoritativeLookup: preapprovalId === null || !isPreapproval,
  };
}

/* --------------------------------- PayPal ---------------------------------- */

const PAYPAL_SUBSCRIPTION_EVENTS: Record<string, BillingEventType> = {
  "BILLING.SUBSCRIPTION.CREATED": "SUBSCRIPTION_CREATED",
  "BILLING.SUBSCRIPTION.ACTIVATED": "SUBSCRIPTION_ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED": "SUBSCRIPTION_UPDATED",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED": "SUBSCRIPTION_ACTIVATED",
  "BILLING.SUBSCRIPTION.SUSPENDED": "SUBSCRIPTION_PAUSED",
  "BILLING.SUBSCRIPTION.CANCELLED": "SUBSCRIPTION_CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED": "SUBSCRIPTION_EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "PAYMENT_FAILED",
};

const PAYPAL_SALE_EVENTS: Record<string, BillingEventType> = {
  "PAYMENT.SALE.COMPLETED": "PAYMENT_SUCCEEDED",
  "PAYMENT.SALE.DENIED": "PAYMENT_FAILED",
  "PAYMENT.SALE.REFUNDED": "PAYMENT_REFUNDED",
  "PAYMENT.SALE.REVERSED": "PAYMENT_REFUNDED",
};

export function normalizePayPalEvent(event: unknown): NormalizedBillingEvent | null {
  const type = String(get(event, "event_type") ?? "");
  const res = get(event, "resource");
  const eventId = str(get(event, "id")) ?? "";
  const occurredAt = safeIso(get(event, "create_time")) ?? new Date().toISOString();

  const subEvent = PAYPAL_SUBSCRIPTION_EVENTS[type];
  if (subEvent) {
    return {
      eventId,
      provider: "paypal",
      type: subEvent,
      occurredAt,
      providerCustomerId: str(get(res, "subscriber.payer_id")),
      providerSubscriptionId: str(get(res, "id")),
      providerPlanId: str(get(res, "plan_id")),
      billingInterval: null,
      currency: str(get(res, "billing_info.last_payment.amount.currency_code")),
      status: PAYPAL_STATUS[String(get(res, "status") ?? "")] ?? null,
      currentPeriodStart: safeIso(get(res, "start_time")),
      currentPeriodEnd: safeIso(get(res, "billing_info.next_billing_time")),
      cancelAtPeriodEnd: null,
      requiresAuthoritativeLookup: false,
    };
  }

  // Sale resources: resource.id is a SALE id, never a subscription id.
  const saleEvent = PAYPAL_SALE_EVENTS[type];
  if (saleEvent) {
    const subscriptionId =
      str(get(res, "billing_agreement_id")) ??
      str(get(res, "supplementary_data.related_ids.subscription_id")) ??
      null;
    return {
      eventId,
      provider: "paypal",
      type: saleEvent,
      occurredAt,
      providerCustomerId: str(get(res, "payer.payer_info.payer_id")),
      providerSubscriptionId: subscriptionId,
      providerPlanId: null,
      billingInterval: null,
      currency: str(get(res, "amount.currency")) ?? str(get(res, "amount.currency_code")),
      status: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: null,
      // Sale id (resource.id) is deliberately NOT used as a subscription id.
      requiresAuthoritativeLookup: subscriptionId === null,
    };
  }

  return null;
}

export function intakePayPalEvent(event: unknown): WebhookIntake {
  const normalized = normalizePayPalEvent(event);
  if (!normalized) return { kind: "ignored", reason: "unsupported_event" };
  if (normalized.requiresAuthoritativeLookup && !normalized.providerSubscriptionId) {
    return {
      kind: "lookup_required",
      lookup: {
        eventId: normalized.eventId,
        provider: "paypal",
        resourceType: "sale",
        resourceId: str(get(event, "resource.id")),
        occurredAt: normalized.occurredAt,
      },
    };
  }
  return { kind: "normalized", event: normalized };
}

/* -------------------------------- intake ---------------------------------- */

export function intakeWebhookEvent(provider: BillingProvider, event: unknown): WebhookIntake {
  if (provider === "mercado_pago") return intakeMercadoPagoNotification(event);
  if (provider === "paypal") return intakePayPalEvent(event);
  const normalized = normalizeStripeEvent(event);
  return normalized
    ? { kind: "normalized", event: normalized }
    : { kind: "ignored", reason: "unsupported_event" };
}

/** Detects what a fetched PayPal resource actually is. */
function paypalResourceKind(
  lookup: WebhookLookupInstruction,
  resource: unknown,
): "subscription" | "sale" {
  if (lookup.resourceType === "sale" || lookup.resourceType === "payment") return "sale";
  if (get(resource, "plan_id") !== undefined || get(resource, "billing_info") !== undefined) {
    return "subscription";
  }
  if (
    get(resource, "billing_agreement_id") !== undefined ||
    get(resource, "amount") !== undefined
  ) {
    return "sale";
  }
  return lookup.resourceType === "subscription" ? "subscription" : "sale";
}

/**
 * Normalizes an AUTHORITATIVE resource fetched by the host after a lookup
 * instruction. Returns null when nothing usable can be derived.
 */
export function normalizeAuthoritativeResource(
  lookup: WebhookLookupInstruction,
  resource: unknown,
): NormalizedBillingEvent | null {
  if (lookup.provider === "mercado_pago") {
    return normalizeMercadoPagoResource(resource, lookup);
  }
  if (lookup.provider === "paypal") {
    const kind = paypalResourceKind(lookup, resource);
    if (kind === "sale") {
      const subscriptionId =
        str(get(resource, "billing_agreement_id")) ??
        str(get(resource, "supplementary_data.related_ids.subscription_id")) ??
        null;
      return {
        eventId: lookup.eventId,
        provider: "paypal",
        type: "PAYMENT_SUCCEEDED",
        occurredAt: lookup.occurredAt,
        providerCustomerId: str(get(resource, "payer.payer_info.payer_id")),
        providerSubscriptionId: subscriptionId,
        providerPlanId: null,
        billingInterval: null,
        currency:
          str(get(resource, "amount.currency")) ?? str(get(resource, "amount.currency_code")),
        status: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: null,
        requiresAuthoritativeLookup: true,
      };
    }
    const subscriptionId = str(get(resource, "id"));
    return {
      eventId: lookup.eventId,
      provider: "paypal",
      type:
        PAYPAL_STATUS[String(get(resource, "status") ?? "")] === "active"
          ? "SUBSCRIPTION_ACTIVATED"
          : "SUBSCRIPTION_UPDATED",
      occurredAt: lookup.occurredAt,
      providerCustomerId: str(get(resource, "subscriber.payer_id")),
      providerSubscriptionId: subscriptionId,
      providerPlanId: str(get(resource, "plan_id")),
      billingInterval: null,
      currency: str(get(resource, "billing_info.last_payment.amount.currency_code")),
      status: PAYPAL_STATUS[String(get(resource, "status") ?? "")] ?? null,
      currentPeriodStart: safeIso(get(resource, "start_time")),
      currentPeriodEnd: safeIso(get(resource, "billing_info.next_billing_time")),
      cancelAtPeriodEnd: null,
      requiresAuthoritativeLookup: subscriptionId === null,
    };
  }
  // Stripe: the fetched resource IS the subscription object.
  return normalizeStripeEvent({
    id: lookup.eventId,
    type: "customer.subscription.updated",
    created: lookup.occurredAt,
    data: { object: resource },
  });
}

/* --------------------------- idempotency bridge ---------------------------- */

/**
 * Canonical idempotency bridge: adapts the portable claim / markProcessed /
 * release semantics to Cripqer's canonical persistence primitives.
 *
 *   portable `claim`         -> `claimBillingEvent`         (atomic, provider-scoped)
 *   portable `markProcessed` -> `markBillingEventProcessed`
 *   portable `release`       -> `markBillingEventFailed`    (re-claimable on redelivery)
 *
 * There is NO second event store: this is a thin adapter over the canonical
 * functions. The real persistence functions (or a Supabase client) are wired in
 * by the host in a later phase; no DB is touched by this module itself.
 */
export interface CanonicalIdempotencyBridge {
  claim(provider: BillingProvider, eventId: string): Promise<boolean>;
  markProcessed(provider: BillingProvider, eventId: string): Promise<void>;
  release(
    provider: BillingProvider,
    eventId: string,
    diagnostic?: SafeBillingDiagnostic,
  ): Promise<void>;
}

export function createCanonicalIdempotencyBridge(deps: {
  claimBillingEvent: typeof import("./persistence.ts").claimBillingEvent;
  markBillingEventProcessed: typeof import("./persistence.ts").markBillingEventProcessed;
  markBillingEventFailed: typeof import("./persistence.ts").markBillingEventFailed;
}): CanonicalIdempotencyBridge {
  return {
    claim: (provider, eventId) => deps.claimBillingEvent(provider, eventId),
    markProcessed: async (provider, eventId) => {
      await deps.markBillingEventProcessed(provider, eventId);
    },
    release: async (provider, eventId, diagnostic) => {
      await deps.markBillingEventFailed(provider, eventId, diagnostic ?? {
        error_code: "WEBHOOK_APPLY_FAILED",
        diagnostic_reference: eventId,
      });
    },
  };
}

