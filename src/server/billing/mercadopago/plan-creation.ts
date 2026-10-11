import "@tanstack/react-start/server-only";

import { MercadoPagoError, type MercadoPagoWriteClient } from "./client.ts";
import { buildProAutoRecurring } from "./plan.ts";
import type { MercadoPagoPreapprovalPlanResource } from "./types.ts";

/**
 * CRIPQER BILLING — MERCADO PAGO PRO PLAN PROVISIONING (MP-M3B)
 *
 * Creates the ONE remote plan Cripqer sells: `POST /preapproval_plan`.
 *
 * NOTHING CALLS THIS AUTOMATICALLY. It is not a route, not a server function
 * and not a startup hook: provisioning the real plan is a deliberate, one-shot
 * operator action against the owner's Mercado Pago account, taken once per
 * environment, whose result — the plan id — is then frozen into
 * `MERCADOPAGO_PRO_PLAN_ID`. Every test exercises this module against fakes and
 * never touches the network.
 *
 * WHY THE CALLER CANNOT INFLUENCE THE COMMERCIAL TERMS
 * There is no price, currency, frequency, trial or tier parameter to pass. The
 * body is assembled from `CRIPQER_PRO_PLAN_CONTRACT` through
 * `buildProAutoRecurring()` — the same function the plan resolver's tests
 * already pin — so changing the price is a change to the contract, never to a
 * call site. The only caller-supplied value is `backUrl` (where Mercado Pago
 * returns the subscriber), which is not a commercial term and is validated
 * before anything is sent.
 *
 * MERCADO PAGO'S CONTRACT, AS VERIFIED AGAINST ITS PUBLIC REFERENCE
 * `POST /preapproval_plan` takes `reason`, `auto_recurring` and `back_url`
 * (`back_url` is marked required by the reference). The documented response
 * carries `id` — the value the rest of Billing knows as `preapproval_plan_id` —
 * plus `status` (example: `"active"`) and `init_point`. Deliberately NOT sent:
 * `status` (the provider creates the plan `active`) and
 * `payment_methods_allowed` (leaving it out lets the account configuration
 * decide, instead of freezing a payment-method list into code). No idempotency
 * key is documented for this endpoint, so none is sent: idempotency here is an
 * operator discipline, enforced by the creation function below.
 */

/* ============================== contract =============================== */

/** The only Mercado Pago endpoint Cripqer writes to. */
export const MERCADOPAGO_PREAPPROVAL_PLAN_PATH = "/preapproval_plan";

/**
 * The plan's `reason`: the short description the subscriber reads at checkout.
 * Owner decision recorded verbatim — the remote plan is named "Cripqer Pro".
 */
export const CRIPQER_PRO_PLAN_REASON = "Cripqer Pro";

/** The exact JSON body `POST /preapproval_plan` receives. */
export interface ProPlanCreationRequestBody {
  reason: string;
  /** The same block the PRO contract builds for any preapproval — one source. */
  auto_recurring: ReturnType<typeof buildProAutoRecurring>;
  /** Where Mercado Pago returns the subscriber after checkout. */
  back_url: string;
}

/* ============================== builder ================================ */

/**
 * Validates the caller's return URL and fails closed BEFORE any request.
 *
 * The value can arrive from an operator's shell, not only from typed code, and
 * a plan created with an empty `back_url` is a broken remote resource that
 * editing code cannot fix. So a missing or non-https URL is a typed refusal,
 * not a bare `TypeError`.
 */
function requireHttpsBackUrl(backUrl: string): string {
  const value = typeof backUrl === "string" ? backUrl.trim() : "";
  if (value === "" || !value.startsWith("https://")) {
    throw new MercadoPagoError(
      "INVALID_REQUEST",
      "The PRO plan requires an absolute https back_url; nothing was sent to Mercado Pago.",
    );
  }
  return value;
}

/**
 * Builds the exact body for `POST /preapproval_plan`. Pure: it sends nothing.
 *
 * Commercial terms come from the frozen PRO contract and nothing else; the
 * return URL is the only value the caller contributes.
 */
export function buildProPlanCreationRequestBody(options: {
  backUrl: string;
}): ProPlanCreationRequestBody {
  return {
    reason: CRIPQER_PRO_PLAN_REASON,
    auto_recurring: buildProAutoRecurring(),
    back_url: requireHttpsBackUrl(options.backUrl),
  };
}

/* ============================== response =============================== */

/**
 * Reads the created plan's id defensively.
 *
 * Mercado Pago documents `id` as a string, but ids elsewhere in its API are
 * numeric, so a finite number is coerced instead of rejected. The asymmetry is
 * deliberate: after a successful POST the plan ALREADY EXISTS remotely, and
 * reporting "no id" for a plan that was in fact created is the one failure that
 * costs a duplicate remote resource. Only a genuinely unusable `id` is `null`.
 */
export function readProPlanId(response: unknown): string | null {
  if (response === null || typeof response !== "object") return null;

  const id: unknown = (response as MercadoPagoPreapprovalPlanResource).id;
  if (typeof id === "string") {
    const trimmed = id.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

/* ============================== creation =============================== */

/**
 * Creates the remote PRO plan. THE ONLY FUNCTION IN BILLING THAT MUTATES
 * MERCADO PAGO STATE.
 *
 * Run it once per environment, deliberately. It is NOT idempotent and Mercado
 * Pago documents no idempotency key for this endpoint, so a blind retry creates
 * a second plan. If this call fails, read the failure first: a failure AFTER
 * the request was accepted says the plan may exist, and the next step is the
 * Mercado Pago panel, not another call.
 */
export async function createMercadoPagoProPlan(
  client: MercadoPagoWriteClient,
  options: { backUrl: string },
): Promise<{ preapprovalPlanId: string }> {
  const body = buildProPlanCreationRequestBody(options);
  const response = await client.postJson(MERCADOPAGO_PREAPPROVAL_PLAN_PATH, body);

  const preapprovalPlanId = readProPlanId(response);
  if (preapprovalPlanId === null) {
    throw new MercadoPagoError(
      "INVALID_JSON",
      "Mercado Pago accepted the plan request but returned no usable id. The plan MAY have been created: check the Mercado Pago panel before retrying, so a second plan is not created.",
    );
  }

  return { preapprovalPlanId };
}
