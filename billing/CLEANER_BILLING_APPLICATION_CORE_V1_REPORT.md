# CLEANER — CRIPQER BILLING SUBSCRIPTION APPLICATION CORE V1 REPORT

Date: 2026-06-09
Agent: Cleaner
Mode: SURGICAL_IMPLEMENTATION_MINIMUM_CONTEXT
Task: CRIPQER BILLING — CANONICAL SUBSCRIPTION APPLICATION CORE V1

---

## A. SCOPE

### Files read (exact — nothing else)

| File | Role |
|---|---|
| `src/lib/billing/billing.types.ts` | Canonical receiving types (authority) |
| `src/server/billing/persistence.ts` | Canonical persistence primitive signatures (mirrored, not modified) |
| `src/server/billing/webhooks.ts` | Frozen webhook normalization — `NormalizedBillingEvent` contract |
| `src/server/billing/checkout.ts` | Frozen Checkout Host (reference for DI/selfcheck conventions) |
| `billing/CLEANER_BILLING_WEBHOOK_CORE_V1_REPORT.md` | Prior convention reference |
| `billing/CLEANER_BILLING_CHECKOUT_HOST_V1_REPORT.md` | Prior convention reference |
| `billing/CLEANER_BILLING_SERVER_CATALOG_V1_REPORT.md` | Prior convention reference |
| `billing/CLEANER_BILLING_PROVIDER_HOST_V1_REPORT.md` | Prior convention reference |
| `tsconfig.json` | Compiler flags (validation only) |
| `package.json` | `"type": "module"` (validation only) |

> A temporary `tsconfig.application-check.json` was created for a targeted
> type-check and then **deleted**. It is not part of the deliverable.

### Files created (exact — nothing else)

| File | Role |
|---|---|
| `src/server/billing/application.ts` | Canonical Subscription Application Core |
| `src/server/billing/application.selfcheck.ts` | Pure-local selfcheck (no network, no DB) |
| `billing/CLEANER_BILLING_APPLICATION_CORE_V1_REPORT.md` | This report |

### Files modified

**0** — no existing file was changed.

---

## B. IMPLEMENTATION

### Applicability gate

`applyNormalizedEvent(deps, event, context)` applies PAID subscription state
only when the event is fully authoritative. It returns an explicit
non-applied `ApplicationResult` otherwise — never guessing.

### Ownership resolution

Ownership is proven from, in order: (1) a trusted `userId` supplied by the host
context, or (2) an already-associated canonical subscription
(`getSubscriptionByProviderId`). The provider event never invents the Cripqer
user; email/browser/metadata are never consulted.

### Plan resolution

`NormalizedBillingEvent` carries `providerPlanId` (no canonical `planId`). A
`BillingPlanResolver` seam is injected; the module never invents the mapping.
`null` → `PLAN_MAPPING_REQUIRED` (fail-closed default `EMPTY_PLAN_RESOLVER`).
Amount/currency/event name are never used to infer a plan.

### Customer application

When `providerCustomerId` is present and ownership is proven,
`upsertBillingCustomer` is called (scoped to provider + trusted `userId`).

### Subscription application

`upsertNormalizedSubscription` is called with a canonical
`NormalizedSubscriptionInput`. `provider_subscription_id` is always the event's
subscription reference — never `eventId`, checkout id, invoice id, sale id, or
payment id.

---

## C. SECURITY (mandatory)

| Check | Result |
|---|---|
| `requiresAuthoritativeLookup` can write subscription | **NO** (returns `LOOKUP_REQUIRED`, zero writes) |
| provider/browser `userId` authoritative | **NO** |
| amount used to infer plan | **NO** |
| free row possible | **NO** |
| raw payload persisted/returned | **NO** |
| entitlement granted | **NO** |
| provider network calls | **NO** |

---

## D. VALIDATION

- TypeScript: **PASS** (target files). `application.ts` and
  `application.selfcheck.ts` type-check with zero errors under the project's
  strict flags (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, `noUncheckedSideEffectImports`,
  Bundler resolution, ES2022). A targeted check reports only a pre-existing,
  out-of-scope error in the frozen `src/lib/env.ts` (`ImportMetaEnv` vs
  `vite/client` mismatch) — identical to the prior Webhook/Checkout/Catalog/
  Provider reports; unrelated to this change and not modified.
- Selfcheck: **PASS — 74/74 assertions.** Run via
  `node src/server/billing/application.selfcheck.ts`.
- Assertion count: **74**.

Cases covered: active Pro, Business, cancelled (historical), customer-only,
lookup_required (zero writes), missing subscription id (zero unsafe writes),
free (no free row/status), owner (trusted/missing/existing/metadata not
authoritative), plan (canonical/unknown/empty-resolver/amount not used),
identifiers (eventId/invoice/sale/payment/checkout never subscriptionId),
unsupported status, no raw payload, no network, no entitlement.

---

## E. SCOPE EVIDENCE

- Auth modified: **0**
- Persistence modified: **0**
- Webhook Core modified: **0**
- Checkout Host modified: **0**
- Server Catalog modified: **0**
- Provider Host modified: **0**
- Routes modified: **0**
- DB/migrations modified: **0**
- Dependencies modified: **0**
- Provider calls: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**

> The only writes are `src/server/billing/application.ts`,
> `src/server/billing/application.selfcheck.ts`, and this report.
