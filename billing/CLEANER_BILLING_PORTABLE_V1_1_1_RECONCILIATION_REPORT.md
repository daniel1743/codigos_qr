# CLEANER — CRIPQER BILLING PORTABLE CORE V1.1.1 RECONCILIATION REPORT

Date: 2026-05-09
Agent: Cleaner
Mode: STRICT_READ_ONLY_MINIMUM_CONTEXT
Purpose: Compare the Billing Portable Core V1.1.1 (root `billing/` ZIP) against the frozen canonical Cripqer Billing receiving foundation. Report-only; no integration performed.

---

## A. SCOPE

### Files inspected (exact, nothing else)

Portable input (inside `billing/CRIPQER_BILLING_PORTABLE_CORE_V1_1_1.zip` → `cripqer-billing-v1/`):

| File | Length (bytes) |
|---|---|
| `billing.types.ts` | 4,852 |
| `billing.catalog.ts` | 6,524 |
| `billing.providers.ts` | 5,248 |
| `billing.server-contract.ts` | 10,543 |
| `billing.webhooks.ts` | 26,110 |
| `PricingPlans.tsx` | 4,882 |
| `BillingCheckout.tsx` | 14,825 |
| `BillingAccount.tsx` | 8,255 |
| `billing.css` | 7,579 |
| `README_INTEGRATION.md` | 16,428 |

Canonical host files:

| File | Role |
|---|---|
| `src/server/billing/auth.ts` | Server Auth Boundary V1 |
| `src/lib/billing/billing.types.ts` | Canonical receiving types |
| `src/server/billing/persistence.ts` | Canonical persistence |
| `src/server/billing/persistence.selfcheck.ts` | Persistence selfcheck |
| `supabase/migrations/20260903000001_create_canonical_billing_persistence.sql` | Canonical SQL schema |

### Confirmation

No other repository areas were inspected. No repository-wide search, no `src/` scan, no node_modules, no routes, no entitlements, no migrations outside the named file. The only reads were the ZIP and the five named canonical files (read via streamed ZIP entry access — nothing was extracted to the filesystem).

---

## B. PORTABLE IDENTITY

- **Exact package path:** `billing/CRIPQER_BILLING_PORTABLE_CORE_V1_1_1.zip`
- **Zip layout:** single folder `cripqer-billing-v1/` (10 files), no nested duplicates.
- **Version evidence:**
  - Archive filename: `CRIPQER_BILLING_PORTABLE_CORE_V1_1_1`.
  - `README_INTEGRATION.md` title: "CRIPQER BILLING V1.1 — Integration Contract".
  - `billing.catalog.ts` header: "CRIPQER BILLING V1"; `version: "1.1.0-placeholder"` (catalog data version, explicitly placeholder).
  - `billing.webhooks.ts` header: "CRIPQER BILLING V1.1 — webhook normalization contract".
  - `BillingCheckout.tsx` / `BillingAccount.tsx` headers: "CRIPQER BILLING V1.1".
- **Duplicate copies inside `billing/`:** none (single ZIP, single folder). No second version present. Reconciliation proceeds.

---

## C. CONTRACT MAPPING (Portable → Canonical)

### Plans

| Portable | Canonical | Mapping |
|---|---|---|
| `PlanId = "free" \| "pro" \| "business" \| "enterprise"` | `BILLING_PLAN_IDS = ["pro","business","enterprise"]` (no "free") | **CONFLICT (plan enum)** — portable adds `"free"`; canonical encodes Free as absence of a paid row. Host must map portable `planId === "free"` → no `billing_subscriptions` row. |
| `FuturePlanId = "agency"` | (absent) | **KEEP** (portable-only; host may ignore/reserve). |

### Providers

| Portable | Canonical | Mapping |
|---|---|---|
| `ProviderId = "stripe" \| "mercado_pago" \| "paypal"` | `BILLING_PROVIDERS = ["stripe","mercado_pago","paypal"]` | **KEEP** — identical value sets, differing only in type name. |

### Interval

| Portable | Canonical | Mapping |
|---|---|---|
| `BillingInterval = "monthly" \| "yearly"` | `BillingInterval = "monthly" \| "yearly"` | **KEEP** — identical. |

### Subscription

| Portable field (camelCase) | Canonical field (snake_case) | Mapping |
|---|---|---|
| `subscriptionId` | `id` | **ADAPT** (rename) |
| `userId` | `user_id` | **ADAPT** (rename; authority = server, see §F) |
| `planId` | `plan_id` | **ADAPT** + **CONFLICT** (portable allows `"free"`; canonical CHECK forbids it) |
| `provider` (`ProviderId \| null`) | `provider` (NOT NULL) | **ADAPT** (portable `null` = free/absent → no row in canonical) |
| `providerCustomerId` | `provider_customer_id` | **ADAPT** (rename) |
| `providerSubscriptionId` | `provider_subscription_id` | **ADAPT** (rename) |
| `billingInterval` | `billing_interval` | **ADAPT** (rename; canonical nullable, portable non-null — host fills it) |
| `currency` | `currency` | **ADAPT** (rename; `CurrencyCode` string) |
| `status` | `status` | **CONFLICT (status enum)** — portable adds `"free"` sentinel; canonical statuses are paid-only |
| `currentPeriodStart/End` | `current_period_start/end` | **ADAPT** (rename) |
| `cancelAtPeriodEnd` | `cancel_at_period_end` | **ADAPT** (rename) |
| `paymentMethodLabel` | `payment_method_label` | **ADAPT** (rename) |
| `createdAt/updatedAt` | `created_at/updated_at` | **ADAPT** (rename) |

### Checkout

| Portable | Canonical | Mapping |
|---|---|---|
| `CheckoutSession.checkoutId` (server-generated poll id) | `billing_checkouts.id` | **HOST_MAP** — portable `checkoutId` = canonical durable checkout id |
| provider-created checkout id (implicit) | `billing_checkouts.provider_checkout_id` | **HOST_MAP** — store provider id on the row |
| `CheckoutState` = `idle\|processing\|redirecting\|pending\|success\|failed\|cancelled` (UI lifecycle) | `BILLING_CHECKOUT_STATUSES` = `processing\|pending\|success\|failed\|cancelled\|expired` (persisted) | **HOST_MAP** — `idle`/`redirecting` are client-only; persist the subset that maps |
| user ownership | `user_id` (FK) + `getBillingCheckoutForUser` | **KEEP** — portable defers userId to host session (§F) |

### Events

| Portable | Canonical | Mapping |
|---|---|---|
| `NormalizedBillingEvent.eventId` | `billing_events.event_id` | **ADAPT** (rename) |
| `provider` | `provider` | **KEEP** |
| `type` (`BillingEventType` 9 values) | (no type column) | **ADAPT** — portable semantic type drives the `apply()` callback, not the stored row |
| `raw` | (not stored; canonical avoids raw payload) | **DO_NOT_IMPORT raw into canonical** — canonical stores only `error_code`/`diagnostic_reference`; keep `raw` in the host `apply()` scope only |
| idempotency `IdempotencyStore.claim` | `claimBillingEvent` RPC | **HOST_MAP** (exact semantic match, §G) |

---

## D. DECISION MATRIX

| Portable file | Portable purpose | Canonical host equivalent | Status | Action | Risk |
|---|---|---|---|---|---|
| `billing.types.ts` | Normalized domain types | `src/lib/billing/billing.types.ts` (partial overlap) | **CONFLICT** (plan/status enums + naming) | **ADAPT** — adopt portable as the richer UI/server contract; keep canonical `billing_*` tables as the single persistence truth; add an adapter layer so the two type systems do not drift | Duplicate `PlanId`/`SubscriptionStatus`; "free" sentinel mismatch |
| `billing.catalog.ts` | Plan/pricing source of truth (placeholder data) | none | **DO_NOT_IMPORT (data)** | **ADAPT** — keep the `BillingCatalog` shape/helpers; REPLACE placeholder data wholesale with a server-authoritative Cripqer catalog | Placeholder prices / `_TEST` provider IDs becoming production pricing |
| `billing.providers.ts` | Provider metadata + generic `ProviderAdapter` | none | **KEEP** | **KEEP** — pure abstraction; secrets already excluded; adapters route through host server | None (browser-safe by design) |
| `billing.server-contract.ts` | Server endpoint DTOs + HTTP/mock client | `auth.ts` (identity), `persistence.ts` (storage) | **HOST_MAP** | **HOST_MAP** — endpoints (`/api/billing/*`) do not exist yet; implement over canonical auth + persistence; mock client is demo-only | Endpoints must enforce `SERVER_TRUST_RULES` |
| `billing.webhooks.ts` | Server-only event normalization + idempotency + authoritative lookup | `persistence.ts` (`claimBillingEvent`, processed/failed), `billing_events` table | **HOST_MAP** | **HOST_MAP** — implement `WebhookVerifier`, `IdempotencyStore`, `ProviderResourceFetcher`, `apply()` as host adapters over canonical primitives | Must not create a second event store |
| `PricingPlans.tsx` | Pricing cards (pure presentation) | none | **HOST_MAP** | **HOST_MAP** — reusable; wire `onSelectPlan` to host routing; feed `currentPlan` from host | None (reads catalog only) |
| `BillingCheckout.tsx` | Checkout flow (no card input) | none | **HOST_MAP** | **HOST_MAP** — reusable; inject host `BillingServerClient`; active-subscription changePlan guard is correct | None |
| `BillingAccount.tsx` | Account / cancel / reactivate UI | none | **HOST_MAP** | **HOST_MAP** — reusable; reads normalized subscription via server | None |
| `billing.css` | Scoped `.cq-billing` styles | none | **KEEP** | **KEEP** — scoped, no global reset/framework | None |

---

## E. PROVIDER ANALYSIS

All three portable provider paths satisfy the expected security contracts:

| Provider | Contract check | Verdict | Evidence |
|---|---|---|---|
| **Stripe** | Invoice ID not treated as subscription ID | ✅ PASS | `stripeSubscriptionRefFromInvoice()` extracts `subscription` / `subscription_details.subscription` / `lines.data.0.subscription`; `providerSubscriptionId` is NEVER the invoice `id`. `requiresAuthoritativeLookup: subscriptionId === null`. |
| **Stripe** | Authoritative subscription lookup | ✅ PASS | Subscription-object events (`customer.subscription.*`) carry `requiresAuthoritativeLookup: false`; invoice/checkout events set it true when the ref is missing → host fetches via `ProviderResourceFetcher`. |
| **Mercado Pago** | Thin notification, authoritative lookup required | ✅ PASS | `intakeMercadoPagoNotification()` reads only `type/topic` + resource id; never trusts status/plan/currency from the body. `normalizeMercadoPagoResource()` resolves the preapproval; `requiresAuthoritativeLookup: preapprovalId === null \|\| !isPreapproval`. |
| **PayPal** | Sale/payment ID not treated as subscription ID | ✅ PASS | Sale events resolve `billing_agreement_id` / `supplementary_data.related_ids.subscription_id`; `resource.id` (sale id) is explicitly excluded; `requiresAuthoritativeLookup` set when unresolved. |

**Classification:** provider adapters/normalizers = **KEEP / HOST_MAP** (host must supply `WebhookVerifier` secrets and `ProviderResourceFetcher` credentials; the portable layer is credential-free by design). No provider SDKs are imported; client dependencies are documented but unused in the default hosted-redirect flow.

---

## F. CHECKOUT RECONCILIATION

| Portable concept | Canonical target | Mapping |
|---|---|---|
| `checkoutId` (server-generated) | `billing_checkouts.id` (UUID) | **HOST_MAP** — host `createCheckout` endpoint creates the canonical row and returns its `id` as `checkoutId` |
| provider-created checkout reference | `billing_checkouts.provider_checkout_id` (nullable, unique per provider) | **HOST_MAP** — populate after the provider session is created |
| `user` ownership | `user_id` FK + `getBillingCheckoutForUser(checkoutId, userId)` | **KEEP** — portable `HostUser` is display-only; `SERVER_TRUST_RULES` require re-deriving userId from session. Canonical `requireBillingUser()` satisfies this exactly |
| `getCheckoutStatus(checkoutId)` | `getBillingCheckoutForUser` + `updateBillingCheckoutStatus` | **HOST_MAP** — endpoint resolves the row (scoped to session user), then confirms provider state authoritatively |
| Return flow | (no canonical return route yet) | **HOST_MAP** — host must add return handling; **rule enforced**: browser/provider return NEVER becomes subscription authority; only a verified webhook / authoritative lookup does |

**Verdict:** portable checkout ownership model aligns with canonical; no conflict. The host must implement the `createCheckout` / `getCheckoutStatus` endpoints using canonical persistence — this is the missing P3 layer, not a type conflict.

---

## G. WEBHOOK RECONCILIATION

**Critical question answered: YES.** The portable webhook normalizer can use the canonical `claimBillingEvent()` / processed / failed persistence model **without creating a second event store**, because portable `billing.webhooks.ts` performs no persistence of its own — it delegates all storage to host-supplied interfaces.

Mapping of the portable `IdempotencyStore` interface to canonical primitives:

| Portable `IdempotencyStore` | Canonical primitive | Notes |
|---|---|---|
| `claim(provider, eventId)` | `claimBillingEvent(provider, eventId)` (RPC) | Both provider-scoped and **atomic**; canonical `claim_billing_event` uses `INSERT ... ON CONFLICT DO UPDATE` returning true only for new/re-claimed-failed events — matches portable "claim → true = own, false = already claimed" exactly |
| `markProcessed(provider, eventId)` | `markBillingEventProcessed(provider, eventId)` | 1:1 |
| `release(provider, eventId)` (on `apply()` throw) | `markBillingEventFailed(provider, eventId, diagnostic)` | Portable `release` = "allow provider retry"; canonical `markBillingEventFailed` sets `status = 'failed'` and the RPC re-claims failed events on redelivery — **HOST_MAP** `release` → `markFailed` (do NOT delete the row) |

Mapping of `apply(event)` → canonical persistence:
- `apply` is the host-owned write: normalize `NormalizedBillingEvent` → `upsertNormalizedSubscription` (or `getSubscriptionByProviderId` + update) for subscription state; `upsertBillingCustomer` for the customer relationship.
- **`raw` payload is NOT persisted** — canonical `billing_events` has no raw column (only `error_code`/`diagnostic_reference`). Keep `raw` in the `apply()` scope only (optional audit log elsewhere, never in the canonical table).

Status-map gap: portable maps Stripe `unpaid→past_due`, `incomplete→pending`, MP `authorized→active`, PayPal `APPROVED→pending`, etc. All land within canonical `BillingSubscriptionStatus` (except the `"free"` sentinel, which only appears in the no-subscription mock/entitlement path, not from webhooks). **No enum conflict in the webhook path.**

---

## H. UI COMPONENTS

| Component | Reusable? | Host-owned boundaries | Notes |
|---|---|---|---|
| `PricingPlans.tsx` | ✅ YES (KEEP structure) | `onSelectPlan`/`onSelectFree`/`onContactSales` routing; `currentPlan`/`currentInterval` from host | Pure presentation; reads catalog only; no provider logic, no network |
| `BillingCheckout.tsx` | ✅ YES (KEEP structure) | inject `server: BillingServerClient`; `user` (display-only); `activeSubscription` from host; return handling | No card inputs; success signal = `getCheckoutStatus` only; active sub → `changePlan` guard is correct |
| `BillingAccount.tsx` | ✅ YES (KEEP structure) | `server`; cancel/reactivate/changePlan callbacks route to host server | Reads normalized subscription; never deletes content |
| `billing.css` | ✅ YES (KEEP) | none | Scoped `.cq-billing`; no global reset/framework |

**Business logic embedded in UI:** none material — all provider/checkout logic is behind the `BillingServerClient` interface. **Provider coupling:** none in UI (metadata only). **Hardcoded plans/pricing:** none in UI (all from catalog). **Demo assumptions:** only `createMockBillingClient` (server-contract) and the placeholder catalog data. **Verdict:** UI is reusable as-is once the host injects a real `BillingServerClient` and a production catalog.

---

## I. CONFLICTS / DUPLICATE CONTRACTS

1. **`PlanId` enum conflict (HIGH).** Portable includes `"free"`; canonical deliberately excludes it (Free = absence of paid row). Future integration must define a single host-side mapping (`"free"` → no `billing_subscriptions` row). Do NOT add `"free"` to the canonical `plan_id` CHECK.
2. **`SubscriptionStatus` enum conflict (MEDIUM).** Portable adds a `"free"` sentinel used only for the no-subscription/entitlement path; canonical `status` is paid-only. Map `"free"` → null-subscription, never to a stored `billing_subscriptions.status`.
3. **Naming convention divergence (MEDIUM).** Portable uses camelCase domain fields; canonical uses snake_case SQL-aligned fields. Requires an adapter layer; do NOT fork two sets of subscription/checkout/event records.
4. **`CheckoutState` vs `BillingCheckoutStatus` (LOW-MEDIUM).** Portable has UI-only states `idle`/`redirecting`; canonical persists `processing/pending/success/failed/cancelled/expired`. `idle`/`redirecting` must never be persisted.
5. **`Subscription.provider` nullability (LOW).** Portable allows `provider: ProviderId | null` (free); canonical `provider` is NOT NULL. Map null → absence.
6. **`raw` event payload (LOW).** Portable carries `raw` for audit; canonical schema has no raw column (by design). Keep `raw` out of canonical storage.
7. **Duplicate type families (MEDIUM, inherent).** `billing.types.ts` (portable) and `src/lib/billing/billing.types.ts` (canonical) overlap on provider/interval/subscription/checkout concepts with incompatible naming and one enum difference. **Do not reconcile during this audit** — document for the P2 reconciliation phase.

**Do-not-import rule check (all PASS — portable is safe to import):** no second DB persistence layer; no client-authoritative paid status; no client-authoritative userId (server re-derives); no raw card storage; no browser service-role; no return-URL-granting; no provider-specific persistence; no fake Free subscription rows (free plan has `checkoutEnabled:false`); no hardcoded production secrets (provider IDs are `_TEST` placeholders; only env var *names* documented).

---

## J. NEXT IMPLEMENTATION SEQUENCE (report-only, NOT executed)

- **Phase 0 — Isolated portable import:** copy `cripqer-billing-v1/` into a `src/`-adjacent vendor area verbatim; keep the ZIP as the source of truth; add nothing else.
- **Phase 1 — Contract reconciliation:** build a single adapter layer mapping portable `billing.types` ↔ canonical `src/lib/billing/billing.types.ts` + `persistence.ts` (resolve §I conflicts 1–7; eliminate "free" from persisted enums).
- **Phase 2 — Server checkout host:** implement `POST /api/billing/checkout`, `GET /api/billing/checkout/:checkoutId` over `createBillingCheckout` / `getBillingCheckoutForUser` + `requireBillingUser`.
- **Phase 3 — Provider adapters (sandbox):** implement `WebhookVerifier` + `ProviderResourceFetcher` per provider in a non-production sandbox only.
- **Phase 4 — Webhook host integration:** implement `IdempotencyStore` as an adapter over `claimBillingEvent`/`markBillingEventProcessed`/`markBillingEventFailed`; wire `apply()` → canonical persistence.
- **Phase 5 — Entitlement bridge:** map canonical subscription → portable `EntitlementSnapshot` (replace the current placeholder `entitlements.ts`).
- **Phase 6 — Billing UI:** mount `PricingPlans`/`BillingCheckout`/`BillingAccount` with a real `createHttpBillingClient` + production catalog.
- **Phase 7 — Production activation:** production catalog + provider credentials + webhook signature secrets; cut over from legacy `premium_users`.

---

## K. SCOPE EVIDENCE

- Repository code files modified: **0**
- Database files modified: **0**
- Routes modified: **0**
- Dependencies modified: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**
- Final Markdown report created: **YES** (this file only)

> The only write performed is this report, at the mandated path `billing/CLEANER_BILLING_PORTABLE_V1_1_1_RECONCILIATION_REPORT.md`. The portable ZIP and all canonical files were read without extraction or modification.

