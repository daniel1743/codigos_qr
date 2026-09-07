# CLEANER — CRIPQER BILLING OWNERSHIP & PLAN RESOLUTION CORE V1 REPORT

Date: 2026-06-09
Agent: Cleaner
Mode: SURGICAL_IMPLEMENTATION_MINIMUM_CONTEXT
Task: CRIPQER BILLING — OWNERSHIP & PLAN RESOLUTION CORE V1

---

## A. SCOPE

### Files read (exact — nothing else)

| File | Role |
|---|---|
| `src/lib/billing/billing.types.ts` | Canonical receiving types (plans / providers / intervals / records) |
| `src/server/billing/persistence.ts` | Frozen canonical persistence primitive signatures (mirrored, not modified) |
| `src/server/billing/webhooks.ts` | Frozen webhook normalization — `NormalizedBillingEvent` contract |
| `src/server/billing/checkout.ts` | Frozen Checkout Host (reference for DI/selfcheck conventions) |
| `src/server/billing/catalog.ts` | Frozen Server Catalog (registry/fail-closed pattern reference) |
| `src/server/billing/application.ts` | Frozen Application Core — `BillingPlanResolver` / `ApplicationContext` seam |
| `billing/CLEANER_BILLING_CHECKOUT_HOST_V1_REPORT.md` | Prior convention reference |
| `billing/CLEANER_BILLING_SERVER_CATALOG_V1_REPORT.md` | Prior convention reference |
| `billing/CLEANER_BILLING_APPLICATION_CORE_V1_REPORT.md` | Prior convention reference |
| `tsconfig.json` | Compiler flags (validation only) |
| `package.json` | `"type": "module"` + TypeScript version (validation only) |

> A temporary `tsconfig.resolution-check.json` was created for a targeted
> type-check and then **deleted**. It is not part of the deliverable.

### Files created (exact — nothing else)

| File | Role |
|---|---|
| `src/server/billing/resolution.ts` | Ownership & Plan Resolution Core V1 (server-side domain) |
| `src/server/billing/resolution.selfcheck.ts` | Pure-local selfcheck (no network, no DB) |
| `billing/CLEANER_BILLING_RESOLUTION_CORE_V1_REPORT.md` | This report |

### Files modified

**0** — no existing file was changed.

### Confirmation

No repository-wide search, no recursive `src/` scan, no route inspection, no
entitlements / premium_users inspection, no Engine V2 / Power Editor / Basic
Editor / Analytics / Smart Pages / Onboarding / Navigation inspection, no
node_modules / dist / build / coverage inspection. The only writes are the two
new source files and this report.

---

## B. OWNERSHIP RESOLUTION

### Sources actually supported (with frozen persistence)

| Priority | Source | Availability |
|---|---|---|
| P1 | `TRUSTED_CONTEXT` (trusted server userId from host context) | **Available** |
| P2 | `EXISTING_SUBSCRIPTION` (`getSubscriptionByProviderId`) | **Available** (frozen persistence) |
| P3 | `CANONICAL_CUSTOMER` | **BLOCKER** (frozen persistence cannot key by `providerCustomerId`) |
| P4 | `CANONICAL_CHECKOUT` | **BLOCKER** (frozen persistence cannot key by `providerCheckoutId`) |

### First-purchase ownership path

The frozen persistence exposes only ONE provider→owner discovery primitive:
`getSubscriptionByProviderId(provider, providerSubscriptionId)`. This can prove
ownership for a provider subscription that **already has a canonical row** — it
cannot prove the owner of a **first-ever** subscription after checkout but
before a canonical subscription exists.

The two other frozen primitives are **read-after-owner-is-known**, not
discovery primitives:

- `getBillingCustomer(userId, provider)` requires `userId` as **input**.
- `getBillingCheckoutForUser(checkoutId, userId)` requires `userId` as **input**.

### Are current persistence APIs sufficient?

**NO, for first-purchase ownership via customer/checkout.** They are sufficient
for ownership via trusted host context (P1) and via an already-associated
subscription (P2), but NOT for resolving the owner of a brand-new provider
subscription from a provider customer id or a provider checkout id.

### Missing canonical primitives (BLOCKERS — not implemented, not invented)

1. `getBillingCustomerByProviderCustomerId(provider, providerCustomerId)`
2. `getBillingCheckoutByProviderCheckoutId(provider, providerCheckoutId)`

Per the task, these are documented as BLOCKERS rather than added to the frozen
`persistence.ts`. The resolution core declares them as **optional** seam
capabilities so a later approved phase can wire them in without changing this
module's logic. With the frozen API alone, only P1 and P2 resolve.

### Ambiguity handling

All available authorities are gathered; if any two prove **different** userIds,
the result is `OWNER_CONFLICT` (fail closed). No authority is consulted that is
on the forbidden list (browser userId, provider-metadata userId, email, display
name, amount, guessing).

---

## C. PLAN RESOLUTION

### Registry design

`PlanMappingRegistry` is a trusted server-side registry of
`{ provider, providerPlanId, planId, billingInterval? }` entries. The conceptual
key is `(provider, providerPlanId)`; the value is a canonical paid `planId`
(pro / business / enterprise) plus an optional `billingInterval`.

`createBillingPlanResolver(registry)` returns a `BillingPlanResolver` that
structurally satisfies the frozen Application Core seam (returning `null` fails
closed as `PLAN_MAPPING_REQUIRED`). `resolvePlanReference(registry, provider,
providerPlanId)` returns a richer `PlanResolutionResult` with
`RESOLVED` / `PLAN_MAPPING_REQUIRED` / `PLAN_MAPPING_CONFLICT` and an optional
`billingInterval`.

### Default state

`EMPTY_PLAN_MAPPING_REGISTRY` is empty and `DEFAULT_PLAN_RESOLVER` fails closed
(resolves nothing). No real Mercado Pago / PayPal / Stripe plan references
exist yet, so the default registry resolves NOTHING — architecture only.

### Validation / fail-closed

Conflicting mappings (same key, different plan or interval) produce
`PLAN_MAPPING_CONFLICT`; free / unsupported plans, unsupported providers, and
empty references invalidate the registry, which then fails closed.

---

## D. APPLICATION CORE COMPATIBILITY

- `createBillingPlanResolver(registry)` returns a `BillingPlanResolver` that
  satisfies the frozen `application.ts` seam **without modifying it**.
- `createApplicationOwnershipContext(trustedUserId)` supplies a resolved
  canonical userId as the frozen `ApplicationContext`.

The Resolution Core can therefore supply both the `trustedUserId` and the
`BillingPlanResolver` semantics the Application Core expects. `application.ts`
was not modified.

---

## E. SECURITY (mandatory)

| Check | Result |
|---|---|
| email used as identity authority | **NO** |
| provider metadata userId authority | **NO** |
| amount used to infer plan | **NO** |
| free mapping possible | **NO** |
| DB writes | **NO** |
| provider calls | **NO** |

---

## F. VALIDATION

- **TypeScript: PASS** — `resolution.ts` and `resolution.selfcheck.ts`
  type-check with zero errors under the project's strict flags (`strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, `noUncheckedSideEffectImports`,
  `skipLibCheck`, Bundler resolution, ES2022). A targeted check reports only a
  pre-existing, out-of-scope error in the frozen `src/lib/env.ts`
  (`ImportMetaEnv` vs `vite/client` mismatch) — identical to the prior
  Webhook / Checkout / Catalog / Provider / Application reports; unrelated to
  this change and not modified.
- **Selfcheck: PASS — 30/30 assertions.** Run via
  `node src/server/billing/resolution.selfcheck.ts`.
- **Assertion count: 30.**

Cases covered: trusted_context, existing_subscription, canonical_customer,
canonical_checkout, no_owner, conflicting_owner, provider_metadata,
email, plan_mapping (Pro/Business/Enterprise), unknown_plan,
conflicting_mapping, free, amount, default_registry,
application_compatibility (resolver seam + ownership context),
no_writes, no_network.

---

## G. SCOPE EVIDENCE

- Auth modified: **0**
- Persistence modified: **0**
- Webhook Core modified: **0**
- Checkout Host modified: **0**
- Server Catalog modified: **0**
- Provider Host modified: **0**
- Application Core modified: **0**
- Routes modified: **0**
- DB/migrations modified: **0**
- Dependencies modified: **0**
- Provider network calls: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**

> The only writes are `src/server/billing/resolution.ts`,
> `src/server/billing/resolution.selfcheck.ts`, and this report.

