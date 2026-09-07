/**
 * CRIPQER BILLING — OWNERSHIP & PLAN RESOLUTION CORE V1 (SERVER-SIDE ONLY)
 *
 * This module resolves, WITHOUT guessing, the two facts the frozen Subscription
 * Application Core (`application.ts`) requires before it may safely apply a
 * first-time provider subscription:
 *
 *   1. canonical Cripqer user ownership  (provider reference -> trustedUserId)
 *   2. canonical paid plan               (provider plan reference -> planId)
 *
 * It is a PURE host-resolution layer. It performs NO subscription writes, NO
 * customer writes, NO checkout writes, NO event writes, NO provider network
 * calls, NO SDK usage, NO credential handling, NO entitlements, and NO routes.
 * It NEVER connects Mercado Pago / PayPal / Stripe. It never persists anything.
 *
 * Ownership is proven ONLY from, in descending priority:
 *
 *   P1  TRUSTED_CONTEXT        — a trusted server userId supplied by host context
 *   P2  EXISTING_SUBSCRIPTION  — getSubscriptionByProviderId (frozen persistence)
 *   P3  CANONICAL_CUSTOMER     — (BLOCKER: frozen persistence cannot key by
 *                                 providerCustomerId — see report)
 *   P4  CANONICAL_CHECKOUT     — (BLOCKER: frozen persistence cannot key by
 *                                 providerCheckoutId — see report)
 *
 * P3/P4 are declared here as OPTIONAL seam capabilities so that, when the
 * missing canonical lookup primitives are added to persistence in a later
 * approved phase, the host can wire them in WITHOUT changing this module's
 * logic. With the frozen persistence API alone, only P1 and P2 are available.
 *
 * Ambiguity is fail-closed: if two authoritative sources resolve to DIFFERENT
 * userIds, the result is OWNER_CONFLICT — never a guess.
 *
 * Plan resolution maps (provider, providerPlanId) -> canonical paid plan using a
 * trusted server-side mapping registry ONLY. It never infers a plan from amount,
 * currency, event type, or subscription status. Free can never be mapped. The
 * default production registry is EMPTY and therefore fails closed (resolves
 * nothing) until real offers are explicitly configured.
 *
 * This module introduces NO new runtime dependency and does not import any
 * frozen Billing module at runtime (application.ts is referenced via type-only
 * import to guarantee seam compatibility at compile time).
 */

import { BILLING_PLAN_IDS, BILLING_PROVIDERS } from "../../lib/billing/billing.types.ts";
import type {
  BillingCheckoutRecord,
  BillingCustomerRecord,
  BillingInterval,
  BillingPlanId,
  BillingProvider,
  BillingSubscriptionRecord,
} from "../../lib/billing/billing.types.ts";
import type { ApplicationContext, BillingPlanResolver } from "./application.ts";

/* ============================ runtime guards ============================ */

function isCanonicalProvider(value: unknown): value is BillingProvider {
  return typeof value === "string" && (BILLING_PROVIDERS as readonly string[]).includes(value);
}

function isCanonicalPlanId(value: unknown): value is BillingPlanId {
  return typeof value === "string" && (BILLING_PLAN_IDS as readonly string[]).includes(value);
}

/* ======================================================================== */
/* OWNERSHIP RESOLUTION                                                     */
/* ======================================================================== */

export type OwnershipResolutionStatus = "RESOLVED" | "OWNER_REQUIRED" | "OWNER_CONFLICT";

export type OwnershipSource =
  | "TRUSTED_CONTEXT"
  | "EXISTING_SUBSCRIPTION"
  | "CANONICAL_CUSTOMER"
  | "CANONICAL_CHECKOUT";

export interface OwnershipResolutionResult {
  status: OwnershipResolutionStatus;
  /** Canonical Cripqer user id — present only when ownership was proven. */
  userId: string | null;
  /** Which authoritative source produced `userId` (null when unresolved). */
  source: OwnershipSource | null;
  provider: BillingProvider;
  /** Safe, stable diagnostic code (never a raw payload or provider secret). */
  code: string;
}

/**
 * Provider-originated references that may resolve ownership, plus an optional
 * trusted host-context userId. NO browser userId, provider-metadata userId,
 * email, display name, or amount is ever an authority here.
 */
export interface OwnershipResolutionInput {
  provider: BillingProvider;
  trustedUserId?: string | null;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  providerCheckoutId?: string | null;
}

/**
 * Ownership resolution dependency seam. Only the FIRST primitive exists in the
 * frozen persistence module today:
 *
 *   getSubscriptionByProviderId(provider, providerSubscriptionId)
 *
 * The other two are declared OPTIONAL because the frozen persistence API cannot
 * currently look up a customer or a checkout by a provider-originated reference
 * (its `getBillingCustomer` and `getBillingCheckoutForUser` both require the
 * canonical userId as INPUT). They are BLOCKERS documented in the report; when
 * the missing primitives are approved, the host injects them here.
 */
export interface OwnershipResolutionDeps {
  getSubscriptionByProviderId(
    provider: BillingProvider,
    providerSubscriptionId: string,
  ): Promise<BillingSubscriptionRecord | null>;

  /** BLOCKER: not available in frozen persistence. */
  getBillingCustomerByProviderCustomerId?(
    provider: BillingProvider,
    providerCustomerId: string,
  ): Promise<BillingCustomerRecord | null>;

  /** BLOCKER: not available in frozen persistence. */
  getBillingCheckoutByProviderCheckoutId?(
    provider: BillingProvider,
    providerCheckoutId: string,
  ): Promise<BillingCheckoutRecord | null>;
}

interface OwnershipCandidate {
  source: OwnershipSource;
  userId: string;
}

/**
 * Resolve a provider-originated reference to ONE proven canonical Cripqer
 * userId. All available authorities are gathered; if any two prove DIFFERENT
 * users, the resolution fails closed with OWNER_CONFLICT. If nothing proves an
 * owner, the result is OWNER_REQUIRED.
 */
export async function resolveOwnership(
  deps: OwnershipResolutionDeps,
  input: OwnershipResolutionInput,
): Promise<OwnershipResolutionResult> {
  const provider = input.provider;
  const candidates: OwnershipCandidate[] = [];

  // P1 — trusted host context userId.
  if (typeof input.trustedUserId === "string" && input.trustedUserId.trim().length > 0) {
    candidates.push({ source: "TRUSTED_CONTEXT", userId: input.trustedUserId });
  }

  // P2 — existing canonical subscription (frozen persistence).
  if (
    typeof input.providerSubscriptionId === "string" &&
    input.providerSubscriptionId.length > 0
  ) {
    const existing = await deps.getSubscriptionByProviderId(
      provider,
      input.providerSubscriptionId,
    );
    if (existing && typeof existing.user_id === "string" && existing.user_id.length > 0) {
      candidates.push({ source: "EXISTING_SUBSCRIPTION", userId: existing.user_id });
    }
  }

  // P3 — canonical customer (only when the future primitive is wired in).
  if (
    deps.getBillingCustomerByProviderCustomerId &&
    typeof input.providerCustomerId === "string" &&
    input.providerCustomerId.length > 0
  ) {
    const customer = await deps.getBillingCustomerByProviderCustomerId(
      provider,
      input.providerCustomerId,
    );
    if (customer && typeof customer.user_id === "string" && customer.user_id.length > 0) {
      candidates.push({ source: "CANONICAL_CUSTOMER", userId: customer.user_id });
    }
  }

  // P4 — canonical checkout (only when the future primitive is wired in).
  if (
    deps.getBillingCheckoutByProviderCheckoutId &&
    typeof input.providerCheckoutId === "string" &&
    input.providerCheckoutId.length > 0
  ) {
    const checkout = await deps.getBillingCheckoutByProviderCheckoutId(
      provider,
      input.providerCheckoutId,
    );
    if (checkout && typeof checkout.user_id === "string" && checkout.user_id.length > 0) {
      candidates.push({ source: "CANONICAL_CHECKOUT", userId: checkout.user_id });
    }
  }

  if (candidates.length === 0) {
    return { status: "OWNER_REQUIRED", userId: null, source: null, provider, code: "OWNER_REQUIRED" };
  }

  const firstUserId = candidates[0]?.userId;
  const firstSource = candidates[0]?.source ?? null;
  if (typeof firstUserId !== "string") {
    return { status: "OWNER_REQUIRED", userId: null, source: null, provider, code: "OWNER_REQUIRED" };
  }

  const conflicting = candidates.some((candidate) => candidate.userId !== firstUserId);
  if (conflicting) {
    return { status: "OWNER_CONFLICT", userId: null, source: null, provider, code: "OWNER_CONFLICT" };
  }

  return { status: "RESOLVED", userId: firstUserId, source: firstSource, provider, code: "RESOLVED" };
}

/* ======================================================================== */
/* PLAN RESOLUTION                                                          */
/* ======================================================================== */

export type PlanResolutionStatus =
  | "RESOLVED"
  | "PLAN_MAPPING_REQUIRED"
  | "PLAN_MAPPING_CONFLICT";

export type PlanMappingSource = "REGISTRY";

export interface PlanResolutionResult {
  status: PlanResolutionStatus;
  planId: BillingPlanId | null;
  billingInterval: BillingInterval | null;
  source: PlanMappingSource | null;
  code: string;
}

/**
 * A single trusted server-side plan mapping. `planId` MUST be a canonical PAID
 * plan (pro / business / enterprise); "free" is never a valid mapping.
 */
export interface PlanMappingEntry {
  provider: BillingProvider;
  providerPlanId: string;
  planId: BillingPlanId;
  billingInterval?: BillingInterval | null;
}

/**
 * Trusted server-side plan mapping registry. Production wiring injects a
 * registry built from explicitly-approved configuration only; the browser and
 * the provider event NEVER supply it. The default production registry is EMPTY.
 */
export interface PlanMappingRegistry {
  entries: readonly PlanMappingEntry[];
}

export interface PlanMappingIssue {
  code: string;
  provider: BillingProvider | null;
  providerPlanId: string | null;
  message: string;
}

export interface PlanMappingValidationResult {
  valid: boolean;
  issues: PlanMappingIssue[];
  /** Keys that map to conflicting canonical plans/intervals. */
  conflictKeys: Set<string>;
}

function planKey(provider: string, providerPlanId: string): string {
  return `${provider}::${providerPlanId}`;
}

function isFreePlanReference(planId: unknown): boolean {
  return planId === "free";
}

function validatePlanMappings(
  entries: readonly PlanMappingEntry[],
): PlanMappingValidationResult {
  const issues: PlanMappingIssue[] = [];
  const conflictKeys = new Set<string>();
  const seen = new Map<string, PlanMappingEntry>();

  for (const entry of entries) {
    const provider = entry.provider;
    const providerPlanId = entry.providerPlanId;
    const rawPlanId = entry.planId as unknown;

    if (!isCanonicalProvider(provider)) {
      issues.push({
        code: "UNSUPPORTED_PROVIDER",
        provider: null,
        providerPlanId: null,
        message: `Unsupported provider: ${String(provider)}`,
      });
    }

    if (typeof providerPlanId !== "string" || providerPlanId.trim().length === 0) {
      issues.push({
        code: "EMPTY_PROVIDER_REFERENCE",
        provider: isCanonicalProvider(provider) ? provider : null,
        providerPlanId: null,
        message: "Provider plan reference must be a non-empty string.",
      });
    }

    if (isFreePlanReference(rawPlanId)) {
      issues.push({
        code: "FREE_PLAN",
        provider: isCanonicalProvider(provider) ? provider : null,
        providerPlanId: typeof providerPlanId === "string" ? providerPlanId : null,
        message: "Free is never a mappable paid plan.",
      });
    } else if (!isCanonicalPlanId(rawPlanId)) {
      issues.push({
        code: "UNSUPPORTED_PLAN",
        provider: isCanonicalProvider(provider) ? provider : null,
        providerPlanId: typeof providerPlanId === "string" ? providerPlanId : null,
        message: `Unsupported plan id: ${String(rawPlanId)}`,
      });
    }

    // Conflict detection only applies to well-formed keys.
    if (isCanonicalProvider(provider) && typeof providerPlanId === "string" && providerPlanId.trim().length > 0) {
      const key = planKey(provider, providerPlanId);
      const prior = seen.get(key);
      if (prior) {
        const priorInterval = prior.billingInterval ?? null;
        const entryInterval = entry.billingInterval ?? null;
        if (prior.planId !== entry.planId || priorInterval !== entryInterval) {
          conflictKeys.add(key);
          issues.push({
            code: "CONFLICTING_MAPPING",
            provider,
            providerPlanId,
            message: "Conflicting canonical mapping for the same provider plan reference.",
          });
        }
      } else {
        seen.set(key, entry);
      }
    }
  }

  return { valid: issues.length === 0, issues, conflictKeys };
}

interface BuiltPlanIndex {
  validation: PlanMappingValidationResult;
  index: Map<string, PlanMappingEntry>;
}

function buildPlanIndex(registry: PlanMappingRegistry): BuiltPlanIndex {
  const validation = validatePlanMappings(registry.entries);
  const index = new Map<string, PlanMappingEntry>();

  for (const entry of registry.entries) {
    if (!isCanonicalProvider(entry.provider)) continue;
    if (typeof entry.providerPlanId !== "string" || entry.providerPlanId.trim().length === 0) continue;
    const key = planKey(entry.provider, entry.providerPlanId);
    if (validation.conflictKeys.has(key)) continue;
    if (!index.has(key)) index.set(key, entry);
  }

  return { validation, index };
}

/**
 * Rich plan resolution: resolves (provider, providerPlanId) to a canonical paid
 * plan with full status diagnostics (RESOLVED / PLAN_MAPPING_REQUIRED /
 * PLAN_MAPPING_CONFLICT). Never infers from amount, currency, event type, or
 * subscription status.
 */
export function resolvePlanReference(
  registry: PlanMappingRegistry,
  provider: BillingProvider,
  providerPlanId: string | null,
): PlanResolutionResult {
  const { validation, index } = buildPlanIndex(registry);

  if (typeof providerPlanId !== "string" || providerPlanId.length === 0) {
    return { status: "PLAN_MAPPING_REQUIRED", planId: null, billingInterval: null, source: null, code: "PLAN_MAPPING_REQUIRED" };
  }
  if (!isCanonicalProvider(provider)) {
    return { status: "PLAN_MAPPING_REQUIRED", planId: null, billingInterval: null, source: null, code: "PLAN_MAPPING_REQUIRED" };
  }

  const key = planKey(provider, providerPlanId);

  if (validation.conflictKeys.has(key)) {
    return { status: "PLAN_MAPPING_CONFLICT", planId: null, billingInterval: null, source: null, code: "PLAN_MAPPING_CONFLICT" };
  }

  // Fail closed: an invalid registry (e.g. a free/unsupported entry elsewhere)
  // can never produce a mapping.
  if (!validation.valid) {
    return { status: "PLAN_MAPPING_REQUIRED", planId: null, billingInterval: null, source: null, code: "PLAN_MAPPING_REQUIRED" };
  }

  const entry = index.get(key);
  if (!entry) {
    return { status: "PLAN_MAPPING_REQUIRED", planId: null, billingInterval: null, source: null, code: "PLAN_MAPPING_REQUIRED" };
  }

  return {
    status: "RESOLVED",
    planId: entry.planId,
    billingInterval: entry.billingInterval ?? null,
    source: "REGISTRY",
    code: "RESOLVED",
  };
}

/**
 * Build a `BillingPlanResolver` that structurally satisfies the frozen
 * Application Core seam (`application.ts`) WITHOUT modifying it. Returning
 * `null` fails closed as PLAN_MAPPING_REQUIRED inside the Application Core.
 */
export function createBillingPlanResolver(
  registry: PlanMappingRegistry,
): BillingPlanResolver {
  const { validation, index } = buildPlanIndex(registry);

  return {
    resolvePlan(provider: BillingProvider, providerPlanId: string | null): BillingPlanId | null {
      if (!validation.valid) return null;
      if (!isCanonicalProvider(provider)) return null;
      if (typeof providerPlanId !== "string" || providerPlanId.length === 0) return null;
      const entry = index.get(planKey(provider, providerPlanId));
      if (!entry) return null;
      return entry.planId;
    },
  };
}

/* ======================================================================== */
/* APPLICATION CORE ADAPTERS                                                */
/* ======================================================================== */

/**
 * Supplies a resolved canonical userId to the frozen Application Core as its
 * trusted `ApplicationContext`. The browser and the provider event never call
 * this directly; only a host that has already proven ownership does.
 */
export function createApplicationOwnershipContext(
  trustedUserId: string | null,
): ApplicationContext {
  return { trustedUserId };
}

/* ======================================================================== */
/* DEFAULT PRODUCTION STATE                                                 */
/* ======================================================================== */

/**
 * The default production mapping registry. Intentionally EMPTY: no real
 * Mercado Pago / PayPal / Stripe plan references exist yet, so nothing can
 * resolve. Production wiring must inject an explicitly-approved registry.
 */
export const EMPTY_PLAN_MAPPING_REGISTRY: PlanMappingRegistry = {
  entries: [],
};

/**
 * Default fail-closed plan resolver (empty registry). Resolves nothing.
 */
export const DEFAULT_PLAN_RESOLVER: BillingPlanResolver = createBillingPlanResolver(
  EMPTY_PLAN_MAPPING_REGISTRY,
);
