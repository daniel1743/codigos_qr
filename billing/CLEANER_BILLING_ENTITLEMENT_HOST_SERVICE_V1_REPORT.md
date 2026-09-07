# CLEANER — CRIPQER BILLING ENTITLEMENT HOST SERVICE V1 REPORT

Date: 2026-09-06 (system date, confirmed via `Get-Date`)
Agent: Cleaner
Mode: SURGICAL_IMPLEMENTATION_MINIMUM_CONTEXT
Task: CRIPQER BILLING — CANONICAL ENTITLEMENT HOST SERVICE V1

---

## A. SCOPE

### Files read (exact — nothing else)

| File | Role |
|---|---|
| `src/server/billing/auth.ts` | Frozen Auth Boundary (`requireBillingUser().userId` trusted id) |
| `src/lib/billing/billing.types.ts` | Canonical receiving types (`BillingSubscriptionRecord`) |
| `src/server/billing/persistence.ts` | Frozen persistence (`getCanonicalSubscriptionForUser`) |
| `src/server/billing/entitlements.ts` | Frozen Entitlement Resolver Core V1 (`resolveEntitlement`) |
| `src/lib/entitlements.ts` | READ-ONLY legacy reference (documented, not modified) |
| `billing/CLEANER_BILLING_ENTITLEMENT_RESOLVER_V1_REPORT.md` | Prior convention reference |
| `billing/CLEANER_BILLING_FIRST_PURCHASE_LOOKUPS_V1_REPORT.md` | Prior convention reference |
| `tsconfig.json` | Compiler flags (validation only) |
| `package.json` | `"type": "module"` + TypeScript/Node versions (validation only) |

> A temporary `tsconfig.entitlement-service-check.json` was created for a
> targeted type-check and then **deleted**. It is not part of the deliverable.

### Files created (exact — nothing else)

| File | Role |
|---|---|
| `src/server/billing/entitlement-service.ts` | Canonical Entitlement Host Service V1 |
| `src/server/billing/entitlement-service.selfcheck.ts` | Pure-local mocked selfcheck (no network, no DB) |
| `billing/CLEANER_BILLING_ENTITLEMENT_HOST_SERVICE_V1_REPORT.md` | This report |

### Files modified

**0** — no existing file was changed.

---

## B. HOST SERVICE

### Canonical subscription primitive used

`getCanonicalSubscriptionForUser(userId, client?)` from the frozen
`src/server/billing/persistence.ts`. The service exposes a minimal read-only
`EntitlementSubscriptionStore` seam mirroring this signature (no duplicate
`BillingSubscriptionRecord` type, no second query). The real frozen function is
structurally assignable to the seam (its optional `client?` trailing parameter
satisfies the seam's single-parameter shape).

### Trusted user input

A trusted server-side canonical userId. The host may later derive it from the
frozen Auth Boundary's `requireBillingUser().userId`. The service fails closed
to free for a missing/blank id WITHOUT querying the store.

### Resolver used

`resolveEntitlement(subscription)` from the frozen
`src/server/billing/entitlements.ts`. The service performs exactly one read and
delegates ALL lifecycle/plan logic — no duplicate active/past_due/cancelled
rules, no plan validation, no grace-period policy.

### Effective tier output

`free | pro | business | enterprise`, returned as the canonical
`EntitlementResolution`.

Flow: `trusted userId → getCanonicalSubscriptionForUser → resolveEntitlement →
EntitlementResolution`.

---

## C. COMPATIBILITY

| Boundary | Compatible without modification? |
|---|---|
| Auth Boundary (`auth.ts`) | **YES** — `requireBillingUser().userId` supplies the trusted userId |
| Persistence (`persistence.ts`) | **YES** — `getCanonicalSubscriptionForUser` is the lookup primitive |
| Entitlement Resolver (`entitlements.ts`) | **YES** — reused unchanged, no logic duplicated |

None of the three frozen modules were modified.

---

## D. LEGACY ENTITLEMENTS

- `src/lib/entitlements.ts` modified: **NO**
- Legacy premium used as canonical Billing authority: **NO**

### Minimum future bridge / migration

A later phase (not this one) may migrate the product entitlement API from the
legacy `getUserEntitlements(userId)` / `canUsePremiumTemplates()` surface to the
canonical service without touching either module:

1. A host resolves the trusted userId via `requireBillingUser().userId`.
2. Call `resolveUserEntitlement(store, trustedUserId)` to get the
   `EntitlementResolution`.
3. Map `effectiveTier` → the legacy `UserPlan` vocabulary (`free` → `"free"`;
   paid tiers → `"premium"`, or richer once the product feature matrix is
   decided) and populate `UserEntitlements` booleans via the optional
   `EntitlementPolicyAdapter` seam.

The development email override in the legacy module is **not removed** and is
**not** made canonical Billing authority; product access behavior is unchanged
in this phase.


---

## E. SECURITY (mandatory)

| Check | Result |
|---|---|
| Browser userId authoritative | **NO** |
| Email authoritative | **NO** |
| Provider redirect authoritative | **NO** |
| Legacy dev-email override canonical authority | **NO** |
| Fail closed to free | **YES** (no subscription / blank id / non-qualifying status → free) |
| Provider calls | **NO** |
| DB writes / migrations | **NO** |
| Product features granted | **NO** (feature matrix intentionally NOT implemented) |

The only authority is the canonical subscription state, resolved through the
frozen resolver. Default is FREE.

---

## F. VALIDATION

- **TypeScript: PASS** — `entitlement-service.ts` and
  `entitlement-service.selfcheck.ts` type-check with zero errors under the
  project's strict flags. A targeted `tsconfig.entitlement-service-check.json`
  was created, run via `npx tsc -p`, then **deleted**.
- **Selfcheck: PASS — 21/21 assertions.** Run via
  `node --experimental-transform-types src/server/billing/entitlement-service.selfcheck.ts`.
- **Assertion count: 21.**

Cases covered: no_subscription, active pro/business/enterprise, pending,
past_due, cancelled, cancel_at_period_end, trusted_identity (store queried with
trusted id), browser_identity (no email/browser authority), no_duplicate
resolution (delegates to frozen resolver), no_legacy_authority (dev-email not
used), no_writes, no_network, blank trusted id fails closed.

---

## G. SCOPE EVIDENCE

- Existing Billing modules modified: **0**
- `src/lib/entitlements.ts` modified: **0**
- Routes modified: **0**
- DB/migrations modified: **0**
- Dependencies modified: **0**
- Provider calls: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**

> The only writes are `src/server/billing/entitlement-service.ts`,
> `src/server/billing/entitlement-service.selfcheck.ts`, and this report. A
> temporary `tsconfig.entitlement-service-check.json` was created for validation
> and **deleted**.

---

## H. OUTCOME

The Canonical Entitlement Host Service V1 resolves a trusted server-side userId
into a canonical `EntitlementResolution` by fetching the canonical subscription
through the existing frozen persistence primitive and delegating entirely to the
frozen `resolveEntitlement`. It performs one read, zero writes, zero provider
calls, zero routes, and implements no product feature matrix. The product policy
layer and the legacy-to-canonical bridge remain explicitly deferred.
