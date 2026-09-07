# CLEANER — CRIPQER BILLING PROVIDER HOST BOUNDARY V1 REPORT

Date: 2026-09-06
Agent: Cleaner
Mode: SURGICAL_IMPLEMENTATION_MINIMUM_CONTEXT
Task: CRIPQER BILLING — PROVIDER HOST BOUNDARY V1

---

## A. SCOPE

### Files read (exact — nothing else)

| File | Role |
|---|---|
| `src/lib/billing/billing.types.ts` | Canonical types (`BillingProvider`, statuses, intervals) |
| `src/server/billing/checkout.ts` | `ProviderSessionAdapter` / `ProviderSessionIntent` / `ProviderSessionResult` / `ResolvedOffer` seam |
| `src/server/billing/webhooks.ts` | `WebhookVerifier` / `ProviderResourceFetcher` / `WebhookLookupInstruction` / `ProviderResourceType` seam |
| `src/server/billing/catalog.ts` | Server catalog (`ResolvedOffer` authority, prior phase) |
| `billing/CLEANER_BILLING_PORTABLE_V1_1_1_RECONCILIATION_REPORT.md` | Approved portable baseline |
| `billing/CLEANER_BILLING_WEBHOOK_CORE_V1_REPORT.md` | Webhook Core conventions (incl. known transitive ts errors) |
| `billing/CLEANER_BILLING_CHECKOUT_HOST_V1_REPORT.md` | Checkout Host conventions |
| `billing/CLEANER_BILLING_SERVER_CATALOG_V1_REPORT.md` | Server Catalog conventions |
| `tsconfig.json` | Compiler flags (validation only) |
| `package.json` | `"type": "module"` (validation only) |

Portable ZIP entries (read via `tar -xOf`, **no extraction**, reference only):

| Entry | Purpose |
|---|---|
| `cripqer-billing-v1/billing.providers.ts` | Provider abstraction reference |
| `cripqer-billing-v1/billing.webhooks.ts` | Webhook semantics reference |
| `cripqer-billing-v1/billing.server-contract.ts` | Server boundary contract reference |
| `cripqer-billing-v1/billing.types.ts` | Portable type shapes reference |

### Files created (exact — nothing else)

| File | Role |
|---|---|
| `src/server/billing/providers.ts` | Canonical Provider Host Boundary (contract + registry) |
| `src/server/billing/providers.selfcheck.ts` | Pure-local selfcheck (no network, no DB, no SDK) |
| `billing/CLEANER_BILLING_PROVIDER_HOST_V1_REPORT.md` | This report |

### Files modified

**0** — no existing file was changed.

> During targeted validation a temporary `tsconfig.providers-check.json` was
> created and then **deleted**. It is not part of the deliverable.

### Confirmation

No repository-wide search, no recursive `src/` scan, no route inspection, no
entitlements / premium_users inspection, no Engine V2 / Power Editor / Basic
Editor / Analytics / Smart Pages / Onboarding / Navigation inspection, no
Supabase inspection, no node_modules / dist / build / coverage inspection. The
only writes are the two new source files and this report.

---

## B. BOUNDARY

### ProviderAdapter contract

`ProviderAdapter` is the single common contract future Stripe / Mercado Pago /
PayPal adapters must implement:

- `provider: BillingProvider` — the canonical provider served.
- `createSession(intent)` — provider checkout/session creation (inherited from
  `ProviderSessionAdapter`); receives the canonical `checkoutId`, trusted
  `userId`, server-resolved `offer`, and server-generated `returnUrl`/`cancelUrl`;
  returns `providerCheckoutId` + `redirectUrl`.
- `getCheckoutStatus(providerCheckoutId)` → `ProviderCheckoutStatus`
  (state + `providerSubscriptionId` + `requiresAuthoritativeLookup`).
- `getSubscription(providerSubscriptionId)` → `ProviderSubscriptionSnapshot | null`.
- `changePlan({ providerSubscriptionId, targetOffer })` — no second
  subscription, no cancel-then-recreate, no proration policy chosen.
- `cancel({ providerSubscriptionId, atPeriodEnd? })` / `reactivate({ providerSubscriptionId })`.
- `verifier: WebhookVerifier` — raw-webhook signature verification.
- `fetcher: ProviderResourceFetcher` — authoritative resource fetch.

### Provider registry

`createProviderRegistry(adapters)` → `ProviderRegistry.getAdapter(provider)`
returns the configured adapter or `null` (fail closed). Default production state
is `EMPTY_PROVIDER_REGISTRY` with **no configured adapters**. No automatic
fallback between providers.

### Checkout compatibility

`ProviderAdapter extends ProviderSessionAdapter` (compile-time guarded), so any
adapter is directly usable as the Checkout Host's provider-session seam.
`checkout.ts` was not modified.

### Webhook compatibility

`verifier`/`fetcher` use the frozen `WebhookVerifier`/`ProviderResourceFetcher`
contracts verbatim; `webhookLookupFetchInput(lookup)` bridges a
`WebhookLookupInstruction` to the fetcher's `(resourceType, resourceId)` input.
`webhooks.ts` was not modified.

---

## C. AUTHORITY

| Concern | Authority |
|---|---|
| Money authority | Server Catalog `ResolvedOffer` only (never browser) |
| Identity authority | Trusted `userId` (never browser-derived) |
| Provider-state authority | Provider adapter authoritative lookup (never the return URL) |

---

## D. SECURITY (mandatory)

| Check | Result |
|---|---|
| Real provider call made | **NO** |
| Provider secret introduced | **NO** |
| Browser price authoritative | **NO** |
| Automatic provider fallback | **NO** |
| Return URL grants paid state | **NO** |

---

## E. VALIDATION

- TypeScript: **PASS** — `providers.ts` + `providers.selfcheck.ts` type-check
  with zero errors under the project's strict flags. (A targeted `tsc --noEmit`
  reports only pre-existing, out-of-scope errors in frozen files pulled in
  transitively — `src/lib/env.ts` `ImportMetaEnv` mismatch and
  `src/server/billing/auth.ts` `process` global — identical to the prior Webhook
  Core report; none reference the new files and none were modified.)
- Selfcheck: **PASS — 52/52 assertions, 11 cases, 0 failed.**
  Run via `node src/server/billing/providers.selfcheck.ts`.
- Cases covered: registry_empty_fails_closed, registry_resolution, no_fallback,
  checkout_compatibility, money_security, webhook_compatibility,
  identifier_integrity, unconfigured_fails_closed, plan_change_contract,
  management_contracts, no_network.

---

## F. SCOPE EVIDENCE

- Auth modified: **0**
- Persistence modified: **0**
- Webhook Core modified: **0**
- Checkout Host modified: **0**
- Server Catalog modified: **0**
- Routes modified: **0**
- DB/migrations modified: **0**
- Dependencies modified: **0**
- Environment modified: **0**
- Provider network calls: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**

> The only writes are `src/server/billing/providers.ts`,
> `src/server/billing/providers.selfcheck.ts`, and this report.

