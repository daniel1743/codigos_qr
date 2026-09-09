# POWER_EDITOR_PHASE5C5D — EARLY ACCESS ENTITLEMENT ALIGNMENT + PAGE BACKGROUND UNLOCK

## FILES_READ
1. `src/premium-template-studio/entitlements.tsx` (imports + `intentForConfigPath` + `mutationIntentForAction`)
2. `src/premium-template-studio/state/StudioProvider.tsx` (guarded dispatch)
3. `src/premium-template-studio/components/inspector/Inspector.tsx` (Page Background controls, read-only)

(NOT read, per STOP discipline: `src/lib/product-entitlements/capabilities.ts` and
`src/lib/product-entitlements/mutation-guard.ts` — evidence gathered only via
narrow symbol search.)

## FILES_MODIFIED
None (STOP before edit).

## CURRENT_ENTITLEMENT_MODEL
- `entitlements.tsx` `mutationIntentForAction` → `intentForConfigPath("theme.background.*")`
  → `EDIT_PREMIUM_BACKGROUND` (semantic classification, unchanged).
- `mutation-guard.ts` `authorizeCanonicalMutation(tier, EDIT_PREMIUM_BACKGROUND)`
  → `decideByCapability(tier, "premium_background_effects")`.
- `capabilities.ts` `resolveCapabilityAccess(tier, capability)` reads an immutable
  `CAPABILITY_POLICY` table (`tier → ReadonlySet<capability>`) and DENYs any
  capability not present in that tier's set.

## ROOT_POLICY_CAUSE
`premium_background_effects` is not present in `CAPABILITY_POLICY["free"]`, so
`resolveCapabilityAccess("free", "premium_background_effects")` returns a non-ALLOW
decision, `authorizeCanonicalMutation` returns `DENY`, and the guarded dispatch in
`StudioProvider` exits before `rawDispatch`. The semantic classification
(`EDIT_PREMIUM_BACKGROUND`) is correct; the *capability policy* is what blocks the
free tier during this early-access stage.

## EARLY_ACCESS_POLICY_IMPLEMENTED
`false` — STOP before applying (see STOP section).

## PREMIUM_BACKGROUND_INTENT_PRESERVED
`N/A` — no change made; the intent would remain `EDIT_PREMIUM_BACKGROUND` under the
correct fix.

## FREE_EARLY_ACCESS_RESULT
`DENY` (unchanged) — the page background mutation remains blocked until the
capability policy is adjusted.

## UNRELATED_PREMIUM_CAPABILITIES_CHANGED
None.

## BILLING_CHANGES
None.

## CANONICAL_CHANGES
None.

## PERSISTENCE_CHANGES
None.

## CAMERA_CHANGES
None.

## TESTS
None added (STOP). A future phase should add guarded-dispatch coverage proving
`patch("theme.background.type", "solid")` reaches the reducer under the
early-access policy.

## LINT
Not run (no files modified).

## RUNTIME
FAIL — page background still does not visibly mutate (root cause unchanged).

## VISUAL
FAIL — no visible page change.

## STOP_TRIGGERED
`true`

## FUTURE_ENTITLEMENT_AUDIT_PENDING
`true` — broader "Power Editor Early-Access Entitlement Alignment Audit" remains
out of scope for 5C5D.

---

## ON_STOP_REPORT
STOP_REASON: The authorization authority (`CAPABILITY_POLICY`) lives in
`src/lib/product-entitlements/capabilities.ts`, a 4th source file outside the
authorized read scope (3 files) and write scope (entitlements.tsx + StudioProvider.tsx).
No clean in-scope fix exists: reclassifying `theme.background` as basic and
hardcoding an exception in `StudioProvider` are both explicitly prohibited.

CURRENT_POLICY_OWNER: `src/lib/product-entitlements/capabilities.ts`
(`CAPABILITY_POLICY` table, consumed by `resolveCapabilityAccess`).

EXACT_FILE_REQUIRED: `src/lib/product-entitlements/capabilities.ts`

EXACT_SYMBOL: `CAPABILITY_POLICY` (the `tier → ReadonlySet<ProductCapability>`
table; add `premium_background_effects` to the free/early-access tier set).

WHY_REQUIRED: `resolveCapabilityAccess("free", "premium_background_effects")`
must resolve to `ALLOW` so `authorizeCanonicalMutation` stops returning `DENY`
for `EDIT_PREMIUM_BACKGROUND` during early access, while keeping the semantic
`theme.background → EDIT_PREMIUM_BACKGROUND` classification intact for future
monetization.

MINIMAL_EXPANSION: Add `premium_background_effects` to the free tier's capability
set in `CAPABILITY_POLICY` (single entry, no schema/Billing/persistence changes).
A future monetization pass can remove it from the free set to re-gate.

FILES_READ: 3 (see above)

FILES_MODIFIED: 0
