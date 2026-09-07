# CLEANER — CRIPQER BILLING CHECKOUT HOST CORE V1 REPORT

Date: 2026-05-09
Agent: Cleaner
Mode: SURGICAL_IMPLEMENTATION_MINIMUM_CONTEXT
Task: CRIPQER BILLING — CANONICAL CHECKOUT HOST CORE V1

---

## A. SCOPE

### Files read (exact — nothing else)

Canonical host files (authority for identity, types, and persistence):

| File | Role |
|---|---|
| `src/server/billing/auth.ts` | Server Auth Boundary V1 (`requireBillingUser`) |
| `src/lib/billing/billing.types.ts` | Canonical receiving types (plans/providers/interval/checkout) |
| `src/server/billing/persistence.ts` | Canonical persistence (`createBillingCheckout`, `getBillingCheckoutForUser`, `updateBillingCheckoutStatus`) |

Audit reference:

| File | Role |
|---|---|
| `billing/CLEANER_BILLING_PORTABLE_V1_1_1_RECONCILIATION_REPORT.md` | Approved portable contract reconciliation baseline |
| `billing/CLEANER_BILLING_WEBHOOK_CORE_V1_REPORT.md` | Prior Webhook Core pattern reference (selfcheck/run conventions) |

Tooling reads (validation-only, not dependency audit):

| File | Purpose |
|---|---|
| `tsconfig.json` | Strict compiler flags to reproduce in targeted check |
| `package.json` | `"type": "module"` + TypeScript version (for `node` type-stripping selfcheck) |

> The portable ZIP (`billing/CRIPQER_BILLING_PORTABLE_CORE_V1_1_1.zip`) entries were
> not extracted nor read: the canonical `billing.types.ts` + the approved
> reconciliation report supplied the complete contract needed for this phase.

### Files created (exact — nothing else)

| File | Role |
|---|---|
| `src/server/billing/checkout.ts` | Canonical Checkout Host Core (server-authoritative domain) |
| `src/server/billing/checkout.selfcheck.ts` | Pure-local selfcheck (no network, no DB) |
| `billing/CLEANER_BILLING_CHECKOUT_HOST_V1_REPORT.md` | This report |

### Files modified

**0** — no existing file was changed.

### Confirmation

No repository-wide search, no recursive `src/` scan, no route inspection, no
entitlements / premium_users inspection, no Engine V2 / Power Editor / Basic
Editor / Analytics / Smart Pages / Onboarding / Navigation inspection, no
node_modules / dist / build / coverage inspection. The only writes are the two
new source files and this report.

---

## B. IMPLEMENTATION

### Checkout Host Core (`src/server/billing/checkout.ts`)

Server-authoritative domain, built on a dependency-injection seam so it stays
testable without DB/network and without forking canonical types.

Exported dependency contracts:

- `CheckoutUserSource` — trusted-user source (`requireUser()`); production wiring adapts `requireBillingUser()`.
- `BillingCatalogResolver` — server-authoritative offer resolver (`resolveOffer`); returns `null` to fail closed.
- `CheckoutStore` — mirrors the exact canonical persistence signatures (`createBillingCheckout`, `getBillingCheckoutForUser`, `updateBillingCheckoutStatus`).
- `ProviderSessionAdapter` — future provider-session seam (NOT invoked against a real provider in this phase).
- `CheckoutHostDeps` — composes the above + server-generated return/cancel URLs.

Exported domain functions:

- `parseCheckoutRequest(raw)` — reads ONLY `planId` / `billingInterval` / `provider`; ignores `userId`, `amount`, `currency`, `providerPriceId`, etc.
- `createCheckout(deps, raw)` — require user → validate → resolve offer → create canonical row (status `processing`) → return durable `checkoutId` + descriptor.
- `getCheckoutStatus(deps, checkoutId)` — ownership-scoped status query.
- `handleCheckoutReturn(deps, checkoutId)` — read-only return flow (never activates paid state).
- `startProviderSession(deps, checkoutId, adapter)` — builds server-validated intent, delegates to adapter.
- `markCheckoutPending(deps, checkoutId)` — server-only helper transitioning state via `updateBillingCheckoutStatus`.

State guards: `UI_ONLY_CHECKOUT_STATES = ["idle", "redirecting"]`, `isPersistableCheckoutStatus`, `isUiOnlyCheckoutState`. `idle`/`redirecting` are never persisted nor returned.

Errors: `CheckoutValidationError` (400), `CheckoutNotFoundError` (404), `CheckoutOfferUnavailableError` (422).

---

## C. TRUST MODEL

| Concern | Authority | Notes |
|---|---|---|
| Trusted user source | `requireBillingUser()` (via `CheckoutUserSource`) | Browser-supplied `userId` ignored entirely |
| Price authority | Server catalog resolver | `amount`/`currency`/`providerOfferReference` come ONLY from `resolveOffer`; no placeholder prices imported |
| Plan authority | Canonical `BILLING_PLAN_IDS` + catalog resolver | `free` absent from canonical plan ids → fails closed at validation |
| Checkout ownership | `store.getCheckoutForUser(checkoutId, trustedUserId)` / `updateCheckoutStatus(..., trustedUserId)` | Foreign-user lookup returns not-found |

---

## D. CHECKOUT FLOWS

### Create flow

`request → requireBillingUser() → validate plan/interval/provider → resolve server offer → createBillingCheckout → durable checkoutId + descriptor`

### Get status flow

`authenticated user → checkoutId → getBillingCheckoutForUser(checkoutId, trustedUserId) → row exists + ownership confirmed → normalized snapshot`

### Provider session boundary

`startProviderSession` re-resolves the server offer from the persisted row and passes ONLY server-validated data (`checkoutId`, server offer, trusted `userId`, server return/cancel URLs) to the injected adapter. No provider network call is performed.

### Return security

`handleCheckoutReturn` is a read-only status query. Query parameters (`?success=true`) are never read, never trusted, and never mutate paid state. Paid-state activation is reserved for a future verified webhook / authoritative provider lookup.

---

## E. SECURITY (mandatory)

| Check | Result |
|---|---|
| client userId authoritative | **NO** |
| client amount authoritative | **NO** |
| free paid checkout possible | **NO** |
| return URL grants paid access | **NO** |
| provider call performed | **NO** |
| entitlement granted | **NO** |

---

## F. VALIDATION

### TypeScript

**PASS** — `checkout.ts` and `checkout.selfcheck.ts` type-check with zero errors
under the project's strict flags (`strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`,
`noUncheckedSideEffectImports`, `skipLibCheck`, Bundler resolution, ES2022).

### Selfcheck

**PASS — 49/49 assertions.** Run via `node src/server/billing/checkout.selfcheck.ts`.

Coverage (mapped to required cases):

- trusted_user (identity controls owner)
- forged_user (client `userId` ignored)
- valid_checkout: Pro monthly Stripe, Business yearly Mercado Pago, Pro yearly PayPal
- free rejected (no row created)
- invalid_plan / invalid_interval / invalid_provider / non-string plan rejected
- offer unavailable (valid plan but no catalog entry) fails closed
- client_price (amount/currency/priceId not authoritative)
- durable_id (canonical `checkoutId` returned)
- ownership (USER_A cannot fetch USER_B checkout)
- return_flow (`success` query cannot activate paid state; persisted status unchanged)
- UI_states (`idle`/`redirecting` not persistable, never persisted)
- provider_session (adapter receives only server-validated offer + trusted user)
- markCheckoutPending (canonical `pending` transition)

---

## G. SCOPE EVIDENCE

- Existing canonical Billing files modified: **0**
- Webhook Core modified: **0**
- Routes modified: **0**
- DB/migrations modified: **0**
- Dependencies modified: **0**
- Provider network calls: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**

> The only writes are `src/server/billing/checkout.ts`,
> `src/server/billing/checkout.selfcheck.ts`, and this report.
