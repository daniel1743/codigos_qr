# CLEANER — CRIPQER BILLING FIRST-PURCHASE OWNERSHIP LOOKUPS V1 REPORT

Date: 2026-09-06 (system date, confirmed via `Get-Date`)
Agent: Cleaner
Mode: SURGICAL_CANONICAL_PERSISTENCE_EXTENSION
Task: CRIPQER BILLING — FIRST-PURCHASE OWNERSHIP LOOKUPS V1

---

## A. SCHEMA VERIFICATION

| Check | Result |
|---|---|
| Customer reverse lookup supported by existing schema | **YES** |
| Checkout reverse lookup supported by existing schema | **YES** |
| Migration required | **NO** |

Evidence (`supabase/migrations/20260903000001_create_canonical_billing_persistence.sql`):

- `billing_customers` has `provider`, `provider_customer_id` (NOT NULL), `user_id`,
  and `CONSTRAINT billing_customers_provider_customer_unique UNIQUE (provider, provider_customer_id)`.
- `billing_checkouts` has `provider`, `provider_checkout_id` (nullable), `user_id`,
  and `billing_checkouts_provider_checkout_unique UNIQUE (provider, provider_checkout_id) WHERE provider_checkout_id IS NOT NULL`.

Both reverse lookups are therefore safely keyable by `(provider, provider_*_id)`
with a unique row guarantee. No SQL modification was required and none was made.

---

## B. IMPLEMENTATION

### Exact new exports (added to `src/server/billing/persistence.ts`)

1. `getBillingCustomerByProviderCustomerId(provider, providerCustomerId, client?)`
2. `getBillingCheckoutByProviderCheckoutId(provider, providerCheckoutId, client?)`

### Exact queries introduced

| Function | Table | Filters | Result |
|---|---|---|---|
| `getBillingCustomerByProviderCustomerId` | `billing_customers` | `.eq("provider", provider)` + `.eq("provider_customer_id", requireTrustedId(...))` | `.maybeSingle()` → `BillingCustomerRecord \| null` |
| `getBillingCheckoutByProviderCheckoutId` | `billing_checkouts` | `.eq("provider", provider)` + `.eq("provider_checkout_id", requireTrustedId(...))` | `.maybeSingle()` → `BillingCheckoutRecord \| null` |

Both reuse the existing `resolveClient`, `requireTrustedId`, and `throwIfError`
helpers — identical conventions to the frozen `getSubscriptionByProviderId`.

### Existing persistence behavior changed: **NO**

No existing function signature, query, or semantics were altered. The only
change is two additive exports. No mass formatting, no refactor, no renames.

---

## C. OWNERSHIP

| Check | Result |
|---|---|
| `providerCustomerId` can resolve canonical user | **YES** |
| `providerCheckoutId` can resolve canonical user | **YES** |
| Provider scoped | **YES** (every lookup is keyed on `(provider, id)`) |
| Resolution Core seams now satisfiable | **YES** |

Resolution Core V1 (`resolution.ts`) already declares the two OPTIONAL seam
members with exactly these signatures:

```ts
getBillingCustomerByProviderCustomerId?(provider, providerCustomerId): Promise<BillingCustomerRecord | null>
getBillingCheckoutByProviderCheckoutId?(provider, providerCheckoutId): Promise<BillingCheckoutRecord | null>
```

The two new persistence exports are structurally identical (modulo the
conventional optional `client?` trailing parameter, which is assignable), so the
`CANONICAL_CUSTOMER` and `CANONICAL_CHECKOUT` ownership paths are now wireable.
`resolution.ts` was NOT modified.

---

## D. SECURITY

| Check | Result |
|---|---|
| Email used for ownership | **NO** |
| Browser userId authoritative | **NO** |
| Provider metadata userId authoritative | **NO** |
| Fallback guessing introduced | **NO** |

Both functions use the privileged server-only `BillingPersistenceClient`
(service-role) and require a non-empty provider identifier via
`requireTrustedId` (throws on empty, matching existing persistence convention).
Lookup is strictly `provider` + canonical `provider_*_id`, never email, display
name, amount, or first-row-wins. Provider scoping prevents cross-provider ID
conflation (Mercado Pago / PayPal / Stripe).

---

## E. VALIDATION

- **TypeScript: PASS** — `persistence.ts` and `persistence.selfcheck.ts` produce
  zero errors. A temporary targeted `tsconfig.persistence-check.json` (billing
  surface only) was created, run via `npx tsc -p`, then **deleted**. The only
  reported errors are pre-existing and out-of-scope in frozen/unchanged files:
  `src/lib/env.ts` (`ImportMetaEnv` vs `vite/client`) and `process`-globals in
  `src/server/billing/auth.ts` and `src/server/billing/resolution.selfcheck.ts`
  (the project `tsconfig` limits `types` to `["vite/client"]`). None touch the
  modified surface.
- **Persistence selfcheck: PASS — 23/23.** Run via Node 24 native TypeScript:
  `node --experimental-strip-types --input-type=module -e "import('./src/server/billing/persistence.selfcheck.ts').then(...)"`.
- **Old assertion count: 7**
- **New assertion count: 16**
- **Total assertion count: 23**

New cases covered: customer reverse lookup (Mercado Pago → USER_A, PayPal →
USER_B, unknown → null, provider mismatch → null), checkout reverse lookup
(Mercado Pago → USER_A, PayPal → USER_B, unknown → null, provider mismatch →
null), ownership preservation of canonical `user_id`, and provider-scoped
isolation for same-looking IDs across providers. All 7 pre-existing assertions
continue to pass.

---

## F. SCOPE

- Auth modified: **0**
- Canonical Billing types modified: **0**
- Webhook Core modified: **0**
- Checkout Host modified: **0**
- Server Catalog modified: **0**
- Provider Host modified: **0**
- Application Core modified: **0**
- Resolution Core modified: **0**
- Routes modified: **0**
- DB/migrations modified: **0**
- Dependencies modified: **0**
- Provider calls: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**

Files written (exact — nothing else):

- `src/server/billing/persistence.ts` (two additive exports only)
- `src/server/billing/persistence.selfcheck.ts` (selfcheck extension only)
- `billing/CLEANER_BILLING_FIRST_PURCHASE_LOOKUPS_V1_REPORT.md` (this report)

A temporary `tsconfig.persistence-check.json` was created for validation and
**deleted**; it is not part of the deliverable.

---

## G. OUTCOME

The first-purchase ownership blocker is **RESOLVED at the persistence API
level**. Trusted server Billing code can now recover the canonical Cripqer user
owner of a first-ever provider subscription via:

```
providerCustomerId → billing_customers   → user_id   (getBillingCustomerByProviderCustomerId)
providerCheckoutId  → billing_checkouts  → user_id   (getBillingCheckoutByProviderCheckoutId)
```

No schema change, no provider integration, no browser authority, no guessing.
Persistence returns to FROZEN status.
