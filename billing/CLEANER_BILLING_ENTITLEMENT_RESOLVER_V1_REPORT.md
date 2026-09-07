# CLEANER — CRIPQER BILLING ENTITLEMENT RESOLVER CORE V1 REPORT

Date: 2026-09-06 (system date, confirmed via `Get-Date`)
Agent: Cleaner
Mode: SURGICAL_IMPLEMENTATION_MINIMUM_CONTEXT
Task: CRIPQER BILLING — CANONICAL ENTITLEMENT RESOLVER CORE V1

---

## A. SCOPE

### Files read (exact — nothing else)

| File | Role |
|---|---|
| `src/lib/billing/billing.types.ts` | Canonical receiving types (authority for statuses/plans/records) |
| `src/server/billing/application.ts` | Frozen Application Core (status/plan guard conventions, seams) |
| `src/server/billing/resolution.ts` | Frozen Resolution Core (fail-closed plan mapping posture) |
| `src/server/billing/persistence.ts` | Frozen persistence (confirmed resolver takes a supplied record; no query here) |
| `src/lib/entitlements.ts` | READ-ONLY reference — existing application entitlement API |
| `billing/CLEANER_BILLING_APPLICATION_CORE_V1_REPORT.md` | Prior convention reference |
| `billing/CLEANER_BILLING_RESOLUTION_CORE_V1_REPORT.md` | Prior convention reference |
| `billing/CLEANER_BILLING_FIRST_PURCHASE_LOOKUPS_V1_REPORT.md` | Prior convention reference |
| `tsconfig.json` | Compiler flags (validation only) |
| `package.json` | `"type": "module"` + TypeScript/Node versions (validation only) |

> A temporary `tsconfig.entitlements-check.json` was created for a targeted
> type-check and then **deleted**. It is not part of the deliverable.

### Files created (exact — nothing else)

| File | Role |
|---|---|
| `src/server/billing/entitlements.ts` | Canonical Entitlement Resolver Core V1 |
| `src/server/billing/entitlements.selfcheck.ts` | Pure-local selfcheck (no network, no DB) |
| `billing/CLEANER_BILLING_ENTITLEMENT_RESOLVER_V1_REPORT.md` | This report |

### Files modified

**0** — no existing file was changed.

---

## B. LIFECYCLE RESOLUTION

### Actual canonical statuses inspected

From `src/lib/billing/billing.types.ts`
(`BILLING_SUBSCRIPTION_STATUSES`):

```
"pending" | "active" | "past_due" | "paused" | "cancelled" | "expired"
```

### Which statuses grant paid access

| Status | Grants paid access | Effective tier |
|---|---|---|
| `active` | **YES** | canonical paid plan (pro / business / enterprise) |
| `pending` | NO | free |
| `past_due` | NO | free |
| `paused` | NO | free |
| `cancelled` | NO | free |
| `expired` | NO | free |

Only `"active"` clearly represents currently-active paid access.

### Which statuses resolve free

`pending`, `past_due`, `paused`, `cancelled`, `expired` — plus any
non-canonical/unknown status value, and `null`/`undefined` (no subscription).

### cancelAtPeriodEnd behavior

`cancel_at_period_end === true` on a still-`active` subscription does **NOT**
demote the tier. Paid access is retained until the canonical paid state actually
expires (no premature downgrade). The flag is preserved in the result for
diagnostics.

### past_due behavior

No grace-period policy is invented. `past_due` fails closed to **free** with
reason `PAST_DUE`. Paid access resumes only if the canonical status transitions
back to `active`.

---

## C. RESULT CONTRACT

### Effective tier contract

```
free | pro | business | enterprise
```

`"free"` is derived (absence of a qualifying paid subscription) and is never
persisted into `billing_subscriptions`. It exists only as an
entitlement/effective-tier result.

### Result fields (`EntitlementResolution`)

- `effectiveTier: EffectiveTier`
- `hasPaidAccess: boolean`
- `canonicalPlanId: BillingPlanId | null` (paid plan only when paid access granted)
- `subscriptionStatus: BillingSubscriptionStatus | null`
- `cancelAtPeriodEnd: boolean | null`
- `currentPeriodEnd: string | null`
- `reason: EntitlementReason`

### Reason codes (grounded in actual canonical statuses)

`NO_SUBSCRIPTION`, `ACTIVE_PAID_SUBSCRIPTION`, `PENDING`, `PAST_DUE`, `PAUSED`,
`CANCELLED`, `EXPIRED`, `INVALID_PLAN`, `UNKNOWN_STATUS`.

### Fail-closed semantics

- No subscription → free.
- Unknown / non-canonical status → free (`UNKNOWN_STATUS`).
- Non-qualifying status → free (status-specific reason).
- Invalid / missing plan on an active subscription → free (`INVALID_PLAN`).
- Plan is NEVER inferred from amount, currency, provider, or providerPlanId.
- The resolver is PURE and SYNCHRONOUS: no network, no persistence, no writes,
  no feature grants. The only authority is the supplied canonical subscription
  record.


---

## D. COMPATIBILITY — EXISTING `src/lib/entitlements.ts`

### Current API shape (read-only inspection)

- `type UserPlan = "free" | "premium"`
- `interface UserEntitlements { plan: UserPlan; canUsePremiumTemplates: boolean; canExportHighRes: boolean; canUseAdvancedAnalytics: boolean; }`
- `getUserEntitlements(userId): Promise<UserEntitlements>` — async, hardcoded `"free"`
- `canUsePremiumTemplates(userId?)`, `canApplyPremiumTemplate(userId?)` — client-side UI gates, hardcoded `false`
- `hasPremiumAccessByEmail(email)`, `getPremiumOverrideByEmail(email?)` — development-only email override

### Compatible with new resolver: **NO** (directly)

Differences:
1. **Plan vocabulary** — existing uses `"premium"`; resolver emits
   `free | pro | business | enterprise`. A mapping is required.
2. **Input** — existing takes a `userId` and (in the future) queries a DB; the
   resolver takes a supplied canonical `BillingSubscriptionRecord`.
3. **Execution** — existing is async + client-facing + has a dev email override;
   the resolver is a synchronous, pure, server-side pure function.
4. **Authority** — existing has a development email allowlist override; the
   resolver accepts only canonical subscription state.

### Minimum future bridge required

A later host/service layer (not this phase) must:

1. Fetch the canonical record via the frozen persistence primitive
   `getCanonicalSubscriptionForUser(userId)`.
2. Call `resolveEntitlement(record)`.
3. Map `effectiveTier` → `UserPlan` (`free` → `"free"`; any paid tier →
   `"premium"`, or a richer mapping once the product feature matrix is decided).
4. Populate `UserEntitlements` booleans via the optional
   `EntitlementPolicyAdapter` seam (product policy layer, not Billing).

Neither `src/lib/entitlements.ts` nor the resolver is modified by that bridge.

---

## E. SECURITY (mandatory)

| Check | Result |
|---|---|
| Browser premium flag authoritative | **NO** (not an input; ignored) |
| Provider redirect/return state authoritative | **NO** (not an input) |
| Legacy/manual premium flag as canonical authority | **NO** |
| Email allowlist as production authority | **NO** (not consulted) |
| Unknown state grants paid access | **NO** (fail closed to free) |
| Provider calls | **NO** |
| DB calls / writes | **NO** |
| Product features granted | **NO** (feature matrix intentionally NOT implemented) |

The ONLY authority is the supplied canonical subscription state. Default is
FREE.

---

## F. VALIDATION

- **TypeScript: PASS** — `entitlements.ts` and `entitlements.selfcheck.ts`
  type-check with zero errors under the project's strict flags (`strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, `noUncheckedSideEffectImports`,
  `noImplicitReturns`, `skipLibCheck`, Bundler resolution, ES2022). A targeted
  `tsconfig.entitlements-check.json` (billing surface only) was created, run via
  `npx tsc -p`, then **deleted**.
- **Selfcheck: PASS — 43/43 assertions.** Run via
  `node --experimental-transform-types src/server/billing/entitlements.selfcheck.ts`.
- **Assertion count: 43.**

Cases covered: no_subscription (null + undefined), active_pro / business /
enterprise, cancel_at_period_end (no premature demote), pending, past_due (no
grace period), paused, cancelled, expired, invalid_plan (fail closed),
unknown_status (fail closed), provider-neutral (no provider inference),
currency/amount never determines tier, provider_subscription_id never determines
tier, resolver arity = 1 (no browser flag / return state), synchronous/pure,
deterministic, no DB / provider call.

---

## G. SCOPE EVIDENCE

- Existing Billing files modified: **0**
- `src/lib/entitlements.ts` modified: **0**
- Routes modified: **0**
- DB/migrations modified: **0**
- Dependencies modified: **0**
- Provider calls: **0**
- Files staged: **0**
- Commits created: **0**
- Frozen scope violations: **0**

> The only writes are `src/server/billing/entitlements.ts`,
> `src/server/billing/entitlements.selfcheck.ts`, and this report. A temporary
> `tsconfig.entitlements-check.json` was created for validation and **deleted**.

---

## H. OUTCOME

The Canonical Entitlement Resolver Core V1 resolves a supplied canonical
`BillingSubscriptionRecord` (or its absence) into a deterministic, fail-closed
effective tier — `free | pro | business | enterprise` — with a stable reason
code. It performs zero provider calls, zero persistence, zero writes, zero
routes, and grants zero product features. The final product feature matrix
remains an explicitly deferred product/business decision, exposed only through
an optional, capability-agnostic `EntitlementPolicyAdapter` seam for a later
product policy layer.
