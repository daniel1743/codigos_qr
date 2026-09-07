# CLEANER — CRIPQER BILLING SERVER CATALOG CORE V1 REPORT

Date: 2026-09-06
Agent: Cleaner
Mode: SURGICAL_IMPLEMENTATION_MINIMUM_CONTEXT
Task: CRIPQER BILLING — CANONICAL SERVER BILLING CATALOG V1

---

## A. SCOPE

### Files read (exact — nothing else)

| File | Role |
|---|---|
| `src/lib/billing/billing.types.ts` | Canonical receiving types (plans / providers / intervals) |
| `src/server/billing/checkout.ts` | Checkout Host — `BillingCatalogResolver`, `ResolvedOffer`, `ValidatedCheckoutRequest` seam |
| `billing/CLEANER_BILLING_PORTABLE_V1_1_1_RECONCILIATION_REPORT.md` | Approved portable reconciliation baseline (reference) |
| `billing/CLEANER_BILLING_CHECKOUT_HOST_V1_REPORT.md` | Prior Checkout Host pattern reference (selfcheck/run conventions) |
| `tsconfig.json` | Strict compiler flags (validation only) |
| `package.json` | `"type": "module"` + TypeScript version (validation only) |

Portable ZIP entries (read via `tar -xOf`, **no extraction**, reference only):

| Entry | Purpose |
|---|---|
| `cripqer-billing-v1/billing.catalog.ts` | Portable SHAPES / helpers (placeholder DATA reference-only) |
| `cripqer-billing-v1/billing.providers.ts` | Provider metadata organization |
| `cripqer-billing-v1/billing.types.ts` | Portable type shapes |

### Files created (exact — nothing else)

| File | Role |
|---|---|
| `src/server/billing/catalog.ts` | Canonical Server Billing Catalog Core (server-authoritative) |
| `src/server/billing/catalog.selfcheck.ts` | Pure-local selfcheck (no network, no DB, no provider SDK) |
| `billing/CLEANER_BILLING_SERVER_CATALOG_V1_REPORT.md` | This report |

### Files modified

**0** — no existing file was changed.

> During targeted validation a temporary `tsconfig.catalog-check.json` and a
> `ts_check.txt` output file were created and then **deleted**. They are not
> part of the deliverable.

### Confirmation

No repository-wide search, no recursive `src/` scan, no route inspection, no
entitlements / premium_users inspection, no Engine V2 / Power Editor / Basic
Editor / Analytics / Smart Pages / Onboarding / Navigation inspection, no
Supabase inspection, no node_modules / dist / build / coverage inspection. The
only writes are the two new source files and this report.

---

## B. CATALOG DESIGN

### Offer model

The catalog is a server-authoritative registry of typed offers.

- `CatalogOfferDefinition` — the trusted offer unit: `planId`, `billingInterval`,
  `provider`, `currency`, `amount` (integer minor units), `providerOfferReference`
  (opaque string), `enabled`.
- `CatalogPlanPresentation` — optional display metadata (`displayName`, `order`,
  `shortDescription`, `contactSales`) kept strictly separate from money/provider
  authority; never used to decide a checkout offer.
- `CatalogRegistry` — `offers` + optional `planPresentation`.

### Resolver behavior

`createBillingCatalog(registry)` returns a `ServerBillingCatalog` exposing a
synchronous `resolveOffer(input)` that returns a `ResolvedOffer | null` and
structurally satisfies Checkout Host's `BillingCatalogResolver` seam (guaranteed
by a compile-time type guard). It fails closed (`null`) on:

- unknown plan / free plan
- unknown interval
- unknown provider
- disabled offer
- `amount <= 0` or non-integer
- non-uppercase / empty currency
- empty `providerOfferReference`
- ambiguous (duplicate) offer
- an invalid registry (any validation issue)

### Validation behavior

`validateCatalogOffers(offers)` returns a `CatalogValidationResult` with an
issue list covering: `DUPLICATE_OFFER`, `FREE_OFFER`, `UNSUPPORTED_PLAN`,
`UNSUPPORTED_PROVIDER`, `UNSUPPORTED_INTERVAL`, `INVALID_AMOUNT`,
`INVALID_CURRENCY`, `EMPTY_PROVIDER_REFERENCE`, `MALFORMED_ENABLED_OFFER`.

Amount rules (minor-unit contract, no floating point):
- non-integer → `INVALID_AMOUNT`
- negative → `INVALID_AMOUNT`
- enabled offer with `amount <= 0` → `MALFORMED_ENABLED_OFFER`
- disabled offer may carry `amount === 0` (contact-sales)

Currency rule: uppercase ISO-like code (`/^[A-Z]{3}$/`, e.g. `USD`, `CLP`).

### Default production state

**NO enabled production offers.** `EMPTY_CATALOG_REGISTRY` is empty and
`DEFAULT_BILLING_CATALOG` fails closed on every request until a real,
explicitly-approved registry is injected. No portable placeholder prices and no
`_TEST` provider references are promoted to production.

---

## C. AUTHORITY


---

## D. SECURITY (mandatory)

| Check | Result |
|---|---|
| Browser price authoritative | **NO** |
| Portable placeholder price used | **NO** |
| Test provider IDs promoted to production | **NO** |
| Free checkout offer possible | **NO** |

---

## E. COMPATIBILITY

Checkout Host compatible without modification: **YES**

`ServerBillingCatalog.resolveOffer` returns `ResolvedOffer | null`, containing
every field `startProviderSession` needs (`planId`, `billingInterval`,
`provider`, `currency`, `amount`, `providerOfferReference`). `checkout.ts` was
not modified.

---

## F. VALIDATION

- TypeScript: **PASS** (targeted type-check of `catalog.ts` +
  `catalog.selfcheck.ts` under the project's strict flags: `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, `noUncheckedSideEffectImports`,
  `skipLibCheck`, Bundler resolution, ES2022).
- Selfcheck: **PASS — 51/51 assertions, 12 cases, 0 failed.**
  Run via `node src/server/billing/catalog.selfcheck.ts`.
- Cases covered: empty_registry_fails_closed, valid_offers_resolve,
  client_independence, free_offer_rejected, duplicate_rejected,
  invalid_amount_rejected, invalid_currency_rejected,
  empty_provider_reference_rejected, disabled_offer_does_not_resolve,
  unsupported_rejected, enterprise_contact_sales,
  portable_placeholder_not_used_by_default.

---

## G. SCOPE EVIDENCE

- Existing canonical Billing files modified: **0**
- Webhook Core modified: **0**
- Checkout Host modified: **0**
- Routes modified: **0**
- DB/migrations modified: **0**
- Dependencies modified: **0**
- Provider network calls: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**

> The only writes are `src/server/billing/catalog.ts`,
> `src/server/billing/catalog.selfcheck.ts`, and this report.

| Concern | Authority |
|---|---|
| Price authority | Trusted server-side registry only (`amount` integer minor units) |
| Currency authority | Trusted server-side registry only (uppercase ISO-like) |
| Provider offer reference authority | Trusted server-side registry only (opaque, never a secret, never an amount, never trusted from browser) |
| Plan / interval / provider authority | Canonical `billing.types.ts` enums + catalog registry |
