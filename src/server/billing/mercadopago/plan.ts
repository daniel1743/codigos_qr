import "@tanstack/react-start/server-only";

import type { BillingPlanId, BillingProvider } from "../../../lib/billing/billing.types.ts";
import type { BillingPlanResolver } from "../application.ts";
import type { CripqerPlanContract } from "./types.ts";

/**
 * CRIPQER BILLING — MERCADO PAGO PLAN CONTRACT & RESOLVER (MP-M1)
 *
 * Two related things, both deliberately inert in MP-M1:
 *
 *   1. the COMMERCIAL CONTRACT for Cripqer PRO — what will be created remotely
 *      in Mercado Pago, written down as data so the numbers live in one place;
 *   2. the `BillingPlanResolver` that maps a Mercado Pago plan id to a canonical
 *      Cripqer plan, fail-closed while no id is configured.
 *
 * NEITHER CREATES ANYTHING REMOTELY. No `POST /preapproval_plan`, no network
 * call of any kind happens in this module. Creating the remote plan is a later
 * phase and requires the owner's Mercado Pago account.
 */

/* ========================== commercial contract ========================= */

/**
 * Cripqer PRO — the ONLY plan sold in Billing V1.
 *
 * Owner decisions recorded here verbatim: Mercado Pago (Chile), CLP, PRO,
 * monthly, 7.990 CLP per month, 10-day free trial. Business and enterprise are
 * out of scope for V1 and are deliberately absent.
 *
 * `amount: 7990` is 7.990 CLP, not 79,90 CLP: CLP has no minor unit, so the
 * canonical "integer minor units" convention and the peso amount are the same
 * number for this currency.
 */
export const CRIPQER_PRO_PLAN_CONTRACT: CripqerPlanContract = {
  planId: "pro",
  billingInterval: "monthly",
  amount: 7990,
  currency: "CLP",
  frequency: 1,
  frequencyType: "months",
  freeTrial: 10,
  freeTrialFrequencyType: "days",
};

/**
 * Builds the `auto_recurring` block for the PRO plan.
 *
 * Pure: it returns the object Mercado Pago's `preapproval`/`preapproval_plan`
 * API expects, and it sends it nowhere. Keeping the trial shape executable
 * rather than only documented means the 10-day trial is a value a test can
 * assert, instead of a sentence a future reader has to trust.
 *
 * Trial semantics this encodes (the product rule): day 0 registers and
 * authorises a payment method with no charge; days 1–10 grant Pro; cancelling
 * inside the window prevents the first charge; the first recurring charge is
 * attempted when the trial ends. Mercado Pago owns the timing; Cripqer owns the
 * rule that the resulting state must come from the provider.
 */
export function buildProAutoRecurring(contract: CripqerPlanContract = CRIPQER_PRO_PLAN_CONTRACT): {
  frequency: number;
  frequency_type: string;
  transaction_amount: number;
  currency_id: string;
  free_trial: { frequency: number; frequency_type: string };
} {
  return {
    frequency: contract.frequency,
    frequency_type: contract.frequencyType,
    transaction_amount: contract.amount,
    currency_id: contract.currency,
    free_trial: {
      frequency: contract.freeTrial,
      frequency_type: contract.freeTrialFrequencyType,
    },
  };
}

/* ============================== resolver ================================ */

/**
 * Maps a Mercado Pago plan reference to a canonical Cripqer plan.
 *
 * FAIL-CLOSED, AND CURRENTLY NOT OPERATIONAL. `MERCADOPAGO_PRO_PLAN_ID` is
 * unset, so `proPlanId` is `null` and this resolver returns `null` for every
 * input — which the application core turns into `PLAN_MAPPING_REQUIRED`, i.e.
 * nothing is applied. That is the intended state until the owner creates the
 * remote plan and the real id is configured. No id is hardcoded here, and no
 * fallback maps an unknown plan to PRO: an unrecognised plan must never grant
 * access.
 *
 * Only the PRO plan is mapped. Business and enterprise are out of V1 scope, so a
 * reference for them resolves to `null` — absent, not approximated.
 */
export function createMercadoPagoPlanResolver(config: {
  proPlanId: string | null;
}): BillingPlanResolver {
  const proPlanId =
    typeof config.proPlanId === "string" && config.proPlanId.trim() !== ""
      ? config.proPlanId.trim()
      : null;

  return {
    resolvePlan(provider: BillingProvider, providerPlanId: string | null): BillingPlanId | null {
      if (provider !== "mercado_pago") return null;
      if (proPlanId === null) return null;
      if (typeof providerPlanId !== "string" || providerPlanId.trim() === "") return null;
      return providerPlanId.trim() === proPlanId ? "pro" : null;
    },
  };
}
