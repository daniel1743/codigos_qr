# CLEANER — CRIPQER BILLING WEBHOOK NORMALIZATION CORE V1 REPORT

Date: 2026-05-09
Agent: Cleaner
Mode: SURGICAL_IMPLEMENTATION_MINIMUM_CONTEXT
Task: CRIPQER BILLING — CANONICAL WEBHOOK NORMALIZATION CORE V1

---

## A. SCOPE

### Files read (exact — nothing else)

Portable input (inside `billing/CRIPQER_BILLING_PORTABLE_CORE_V1_1_1.zip` → `cripqer-billing-v1/`):

| Entry | Purpose |
|---|---|
| `billing.types.ts` | Portable domain types (source-of-truth reference) |
| `billing.webhooks.ts` | Approved provider normalization logic (adapted) |

(All ZIP entries were *listed* to identify the two allowed entries; only the two
above were read. `README_INTEGRATION.md` was not needed.)

Canonical host files:

| File | Role |
|---|---|
| `src/lib/billing/billing.types.ts` | Canonical receiving types (authority) |
| `src/server/billing/persistence.ts` | Canonical persistence + idempotency primitives |
| `supabase/migrations/20260903000001_create_canonical_billing_persistence.sql` | Canonical SQL schema |

Audit reference:

| File | Role |
|---|---|
| `billing/CLEANER_BILLING_PORTABLE_V1_1_1_RECONCILIATION_REPORT.md` | Approved audit baseline |

Tooling reads (necessary for validation only, not dependency audit):
`tsconfig.json` and `package.json` (the `"type": "module"` field and `scripts`
only) were consulted to determine how to run the TypeScript check and the
selfcheck. No dependency audit was performed.

### Files created (exact — nothing else)

| File | Role |
|---|---|
| `src/server/billing/webhooks.ts` | Canonical webhook normalization core + idempotency bridge |
| `src/server/billing/webhooks.selfcheck.ts` | Pure-local selfcheck (no network, no DB) |
| `billing/CLEANER_BILLING_WEBHOOK_CORE_V1_REPORT.md` | This report |

### Confirmation

No other repository areas were investigated. No repository-wide search, no
recursive `src/` scan, no route inspection, no Engine V2 / Power Editor / Basic
Editor / Analytics / Smart Pages / Onboarding / Navigation / entitlements /
premium_users inspection, no node_modules audit. The only writes are the three
files listed above.

---

## B. IMPLEMENTATION

### Normalizers implemented

- `safeIso(value)` — never-throw ISO-8601 parser (handles Date, unix
  seconds/milliseconds, ISO strings; returns `null` otherwise).
- `normalizeStripeEvent(event)` — subscription, invoice/payment, and
  `checkout.session.completed` events.
- `intakeMercadoPagoNotification(event)` — thin-notification intake → emits a
  `lookup_required` instruction; never trusts the body as subscription state.
- `normalizeMercadoPagoResource(resource, lookup)` — normalizes the
  authoritative preapproval/payment resource fetched by the host.
- `normalizePayPalEvent(event)` — subscription and sale/payment events.
- `intakePayPalEvent(event)` — emits `lookup_required` for sale events whose
  subscription relationship is unresolved.
- `intakeWebhookEvent(provider, event)` — provider dispatch.
- `normalizeAuthoritativeResource(lookup, resource)` — normalizes a fetched
  authoritative resource (Mercado Pago / PayPal / Stripe).

### Provider behavior

- **Stripe** — subscription events derive `providerSubscriptionId` from the
  subscription object `id`; invoice events derive the subscription reference
  from `subscription` / `subscription_details` / `lines` (never the invoice id);
  when no subscription reference is derivable, `requiresAuthoritativeLookup`
  is `true`.
- **Mercado Pago** — notification bodies are treated as thin (topic + resource
  id) and always produce a `lookup_required` instruction; the authoritative
  resource (not the body) is normalized.
- **PayPal** — subscription events recognize `resource.id`; sale events never
  treat `resource.id` (the sale id) as a subscription id and emit
  `lookup_required` when the relationship is unresolved.

### Authoritative lookup behavior

`WebhookLookupInstruction` exposes the host contract
`{ eventId, provider, resourceType, resourceId, occurredAt }` for future server
provider adapters (Stripe / Mercado Pago / PayPal). `normalizeAuthoritativeResource`
normalizes the fetched resource back into a canonical `NormalizedBillingEvent`.
No provider network call is performed in this phase.

### Idempotency mapping (portable → canonical)

| Portable | Canonical |
|---|---|
| `claim` | `claimBillingEvent` (atomic, provider-scoped RPC) |
| `markProcessed` | `markBillingEventProcessed` |
| `release` | `markBillingEventFailed` (with `error_code: "WEBHOOK_APPLY_FAILED"`) |

`createCanonicalIdempotencyBridge(deps)` is a thin adapter over the *actual*
canonical persistence function signatures (`typeof import("./persistence.ts").*`).
No second event store is introduced; no persistence write occurs in this phase.

---

## C. SECURITY

| Check | Result |
|---|---|
| Invoice ID used as subscription ID | **NO** |
| Sale/payment ID used as subscription ID | **NO** |
| Raw payload persisted | **NO** (raw is transient input only; not in normalized output; canonical `billing_events` has no raw column) |
| "free" subscription row introduced | **NO** (Free = absence of a paid row; no "free" status emitted) |
| Client-authoritative identity introduced | **NO** |
| Provider secrets introduced | **NO** |

---

## D. VALIDATION

### TypeScript

**PASS** (target files). `webhooks.ts` and `webhooks.selfcheck.ts` type-check
with zero errors under the project `tsconfig.json` (strict).

Note: a targeted `tsc --noEmit` over the two new files reports pre-existing,
out-of-scope errors in frozen files pulled in transitively
(`src/lib/env.ts` `ImportMetaEnv` mismatch; `src/server/billing/auth.ts`
`process` global) — these are unrelated to this change and were not modified.

### Selfcheck

**PASS — 35/35 checks.** Run via `node src/server/billing/webhooks.selfcheck.ts`.

Assertions:
1. Stripe subscription: normalizes / provider=stripe / correct subscription id / canonical paid status / billing interval.
2. Stripe invoice: normalizes / uses subscription reference / invoice id NOT used as subscription id.
3. Stripe invoice (no sub): normalizes / no subscription id / requires authoritative lookup.
4. Mercado Pago thin notification → `lookup_required`.
5. PayPal sale: normalizes / sale id NOT used as subscription id / requires authoritative lookup / `lookup_required`.
6. PayPal subscription: normalizes / subscription id recognized / canonical paid status.
7. `safeIso`: invalid string / null / undefined / empty / NaN / object → null; valid ISO + unix seconds → non-null; never throws.
8. Free status: canonical statuses exclude "free"; status maps never emit "free"; status maps emit only canonical statuses.
9. Idempotency bridge mapping: `claim` → `claimBillingEvent`, `markProcessed` → `markBillingEventProcessed`, `release` → `markBillingEventFailed` (+ emits a diagnostic).

---

## E. SCOPE EVIDENCE

- Existing canonical Billing files modified: **0**
- Routes modified: **0**
- Database/migrations modified: **0**
- Dependencies modified: **0**
- Provider network calls: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**

The only writes are the two new code files and this report. `git status`
confirms the two new source files (`webhooks.ts`, `webhooks.selfcheck.ts`) are
the only additions from this task (the pre-existing dirty working tree —
`.gitignore`, `src/routes/internal.power-editor.tsx`, `test-results/*`,
`PROYECTO PARA INTEGRA A QR` submodule — was untouched by this task).


