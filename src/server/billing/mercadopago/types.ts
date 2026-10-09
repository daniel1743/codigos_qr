/**
 * CRIPQER BILLING — MERCADO PAGO ADAPTER · TYPES (MP-M1)
 *
 * Server-side only. Nothing in this module may reach the browser bundle: it
 * describes the shape of Mercado Pago's Subscription API and the one commercial
 * plan Cripqer sells in V1.
 *
 * WHY THESE INTERFACES ARE DOCUMENTATION-GRADE
 * The canonical normalization core (`../webhooks.ts`) reads provider payloads
 * defensively through `unknown` and narrow accessors, and it must keep doing so:
 * a provider may add, rename or null a field at any time, and a strict parse at
 * the network boundary would turn a benign provider change into a billing
 * outage. The interfaces below are therefore not a parser — they are the shared
 * vocabulary for what the adapter expects to find, used by the adapter code, the
 * tests and a human reader. The runtime read remains defensive.
 */

import type { BillingInterval, BillingPlanId } from "../../../lib/billing/billing.types.ts";

/* ============================ configuration ============================= */

/**
 * Server-side Mercado Pago configuration.
 *
 * Every field is nullable on purpose: a missing value must be representable, so
 * the adapter can fail closed with an explicit reason instead of starting up
 * half-configured. No secret in this shape is ever read from a `VITE_*` name —
 * a `VITE_`-prefixed token is inlined into the client bundle by Vite and would
 * be a public credential.
 */
export interface MercadoPagoConfig {
  /** Bearer token for `https://api.mercadopago.com`. Server-side only. */
  accessToken: string | null;
  /**
   * Webhook signature secret. Declared here so the configuration surface is
   * complete, but NOT consumed in MP-M1: the webhook endpoint and its
   * `WebhookVerifier` are MP-M2. An unused secret is inert; a missing one is
   * only a problem once an endpoint exists to verify.
   */
  webhookSecret: string | null;
  /**
   * Mercado Pago `preapproval_plan` id backing the Cripqer PRO plan.
   * `null` until the remote plan is created — and while it is `null`, the plan
   * resolver fails closed (see `./plan.ts`).
   */
  proPlanId: string | null;
  /** Overridable API origin. Defaults to the real Mercado Pago API. */
  baseUrl?: string;
  /** Explicit request timeout in milliseconds. */
  timeoutMs?: number;
}

/* ======================= provider resource shapes ======================= */

/**
 * The recurring block every `preapproval` carries.
 *
 * It is also the structural marker the canonical normalizer uses to recognise a
 * preapproval (see `isMercadoPagoPreapprovalResource` in `../webhooks.ts`): a
 * payment resource never has it. Status could NOT be used for that purpose,
 * because `pending` is a legal status for both resource kinds.
 */
export interface MercadoPagoAutoRecurring {
  frequency?: number;
  frequency_type?: string;
  currency_id?: string;
  transaction_amount?: number;
  free_trial?: { frequency?: number; frequency_type?: string } | null;
}

/**
 * `GET /preapproval/{id}` — the subscription itself. This is the resource whose
 * `status` is authoritative for Cripqer's subscription state.
 */
export interface MercadoPagoPreapprovalResource {
  id?: string;
  /** `pending | authorized | paused | cancelled | finished`. */
  status?: string;
  preapproval_plan_id?: string | null;
  payer_id?: number | string | null;
  auto_recurring?: MercadoPagoAutoRecurring | null;
  next_payment_date?: string | null;
  last_modified?: string | null;
  date_created?: string | null;
  external_reference?: string | null;
}

/**
 * `GET /authorized_payments/{id}` — a charge attempt made under a preapproval.
 *
 * It carries NO subscription status of its own; `preapproval_id` is the only
 * relation that matters, and it is the one the resource fetcher follows.
 */
export interface MercadoPagoAuthorizedPaymentResource {
  id?: number | string;
  preapproval_id?: string | null;
  /** `scheduled | processed | recycling | cancelled`. */
  status?: string;
  payment_id?: number | string | null;
  transaction_amount?: number;
  currency_id?: string;
  date_created?: string | null;
}

/**
 * `GET /v1/payments/{id}` — a payment.
 *
 * Same rule as the authorized payment: `preapproval_id` is the only link to a
 * subscription, and it is present only when the payment belongs to one.
 */
export interface MercadoPagoPaymentResource {
  id?: number | string;
  /** `approved | rejected | refunded | pending | in_process | cancelled`. */
  status?: string;
  preapproval_id?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  date_created?: string | null;
}

/* ========================== commercial contract ========================= */

/**
 * The commercial shape of one Cripqer plan, as it will be created in Mercado
 * Pago. This is a CONTRACT, not a request: nothing in MP-M1 creates a remote
 * plan, and no id is invented here.
 */
export interface CripqerPlanContract {
  planId: BillingPlanId;
  billingInterval: BillingInterval;
  /**
   * Integer MINOR units, matching the canonical catalog convention. CLP is a
   * zero-decimal currency (ISO 4217 exponent 0), so the minor unit IS the peso
   * and `7990` means exactly 7.990 CLP — not 79,90 CLP.
   */
  amount: number;
  /** Uppercase ISO-4217. */
  currency: string;
  /** Recurring frequency value (Mercado Pago `auto_recurring.frequency`). */
  frequency: number;
  frequencyType: "days" | "months";
  /** Free-trial length (Mercado Pago `auto_recurring.free_trial.frequency`). */
  freeTrial: number;
  freeTrialFrequencyType: "days" | "months";
}
