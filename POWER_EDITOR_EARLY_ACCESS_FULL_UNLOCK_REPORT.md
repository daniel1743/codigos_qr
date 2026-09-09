# POWER_EDITOR EARLY ACCESS FULL UNLOCK (Phase 5C5E)

## FILES_READ
1. `src/lib/product-entitlements/capabilities.ts`
2. `src/lib/product-entitlements/mutation-guard.ts`
3. `src/premium-template-studio/entitlements.tsx`
4. `src/premium-template-studio/state/StudioProvider.tsx`
(Plus targeted symbol searches to confirm selfcheck assertions — no additional
source files opened.)

## FILES_MODIFIED
1. `src/lib/product-entitlements/capabilities.ts` (functional unlock — the central policy authority)
2. `src/lib/product-entitlements/capabilities.selfcheck.ts` (validation updated to reflect policy)
3. `src/lib/product-entitlements/mutation-guard.selfcheck.ts` (validation updated)
4. `src/premium-template-studio/__tests__/pageBackgroundContextual.test.tsx` (6 new entitlement tests)

No changes to entitlements.tsx, StudioProvider.tsx, Inspector.tsx, Billing,
canonical schema, reducer, renderer, or style engine.

## POWER_EDITOR_CAPABILITIES_FOUND
Reachable from the Power Editor guarded dispatch (`mutationIntentForAction` →
`authorizeCanonicalMutation`), the PRO capabilities consulted for current editing
actions are: `advanced_typography`, `advanced_layout`, `manual_responsive`,
`advanced_motion`, `premium_background_effects`, `advanced_card_button_styling`,
`premium_blocks`, `remove_cripqer_branding`, plus `premium_sections` /
`premium_templates` (via the `APPLY_SECTION` / `APPLY_TEMPLATE` intents, which are
NOT StudioActions and are therefore not dispatched through the Power Editor
guarded dispatch).

## CAPABILITIES_OPENED (early access — ALLOW for free)
- `advanced_typography`
- `advanced_layout`
- `manual_responsive`
- `advanced_motion`
- `premium_background_effects`
- `advanced_card_button_styling`
- `premium_blocks`

## CAPABILITIES_LEFT_UNCHANGED (still governed by normal policy)
- `premium_sections` — reachable only via `APPLY_SECTION` (not a StudioAction).
- `premium_templates` — reachable only via `APPLY_TEMPLATE` (not a StudioAction).
- `remove_cripqer_branding` — branding/publishing monetization feature, not a
  Power Editor creative editing capability.

## AMBIGUOUS_CAPABILITIES
`remove_cripqer_branding` is the only genuinely ambiguous one (a Power Editor
setting, but a branding/monetization feature rather than creative editing). It
was left gated and documented, serving as the negative-control capability proving
the unlock is not global.

## EARLY_ACCESS_POLICY_OWNER
`POWER_EDITOR_EARLY_ACCESS_CAPABILITIES` (and private
`POWER_EDITOR_EARLY_ACCESS_SET`) in `capabilities.ts`, consulted FIRST by
`resolveCapabilityAccess`.

## FUTURE_REGATING_POINT
Single obvious re-gating point: remove entries from
`POWER_EDITOR_EARLY_ACCESS_CAPABILITIES` (or delete the set) when monetization
begins, restoring plan-based gating from the untouched `CAPABILITY_POLICY` table.

## PRO_BADGES_REMOVED_OR_HIDDEN
Automatic. `isCapabilityLocked` / `useCapabilityAccess` / `isAssetLocked` all
derive from `resolveCapabilityAccess`; because the 7 editing capabilities now
resolve ALLOW, no PRO badge / padlock / locked state renders for them. No UI
component change was required.

## LOCKED_STATES_REMOVED_OR_HIDDEN
Automatic (same single-source derivation via `resolveCapabilityAccess`).
Informational "Premium" feature labels (not lock affordances) are out of scope.

## PREMIUM_BACKGROUND_RESULT
`premium_background_effects` now resolves ALLOW for free, and
`authorizeCanonicalMutation("free", { kind: "EDIT_PREMIUM_BACKGROUND" })`
returns ALLOW — the guarded dispatch no longer drops `theme.background.*` patches.

## SEMANTIC_INTENTS_CHANGED
None. `theme.background.*` still maps to `EDIT_PREMIUM_BACKGROUND`; capability
names and `authorizeCanonicalMutation` are unchanged.

## MUTATION_GUARD_BYPASSED
No. The guarded dispatch and `authorizeCanonicalMutation` remain in use; only the
capability-policy resolution changed at its single authority.

## BILLING_CHANGES
None.

## CANONICAL_CHANGES
None.

## PERSISTENCE_CHANGES
None.

## TESTS
- New: 6 entitlement tests in `pageBackgroundContextual.test.tsx` (early-access
  ALLOW, EDIT_PREMIUM_BACKGROUND ALLOW, background mutation reaches reducer,
  remove_cripqer_branding still LOCKED/DENY, unknown capability fail-closed).
- Selfchecks: `runProductCapabilitySelfcheck` 151/151, `runMutationGuardSelfcheck`
  78/78.
- Vitest: pageBackgroundContextual (27), heroBackgroundContextual (20),
  heroImageContextual (8) — 55/55 pass.

## RUNTIME
55 tests + 229 selfcheck assertions pass.

## VISUAL
Pending manual gate (OPEN-01 … OPEN-07). Automated tests prove the authorization
is ALLOW; the visible whole-page update requires user runtime confirmation.

## STOP_TRIGGERED
`false`
