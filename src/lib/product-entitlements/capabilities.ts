/**
 * CRIPQER — PRODUCT CAPABILITY POLICY CORE V1
 *
 * The canonical, pure, declarative product-access policy. It receives:
 *
 *     effectiveTier   (free | pro | business | enterprise)
 *     capability      (a canonical ProductCapability id)
 *
 * and returns the authoritative product-access decision (ALLOW | LOCKED).
 *
 * Responsibilities (strict separation):
 *   - Billing determines WHAT TIER the user owns.
 *   - THIS policy determines WHAT THAT TIER MAY DO.
 *
 * This module performs NO network calls, NO database calls, NO filesystem
 * runtime calls, and has NO React / server-only dependency. It is a pure,
 * synchronous function of (tier, capability). It does not grant features; it
 * only describes whether a tier may *mutate* a given capability.
 *
 * Key principles encoded here:
 *   - The Power Editor is public to ALL tiers (editor access is not gated here).
 *   - Free is genuinely usable: it receives the full core editing/publishing set.
 *   - Pro unlocks advanced visual control.
 *   - Business and Enterprise receive the SAME complete visual capability set
 *     as Pro (no higher-tier visual effects).
 *   - LOCKED means the future UI should SHOW the capability but prevent MUTATION.
 *     LOCKED does NOT mean remove stored values, hide rendered effects, downgrade
 *     config, or replace config with Free defaults.
 *   - Fail-closed: unknown capabilities are LOCKED; unknown/invalid tiers are
 *     treated no more permissively than Free.
 *
 * BOUNDARY: This module does NOT import `src/server/billing/entitlements.ts`.
 * Importing server-only Billing code into a client-compatible product policy
 * would create server/client coupling. Instead, the canonical tier vocabulary
 * (`free | pro | business | enterprise`) is declared locally here, byte-for-byte
 * identical to the `EffectiveTier` union in the frozen Billing resolver.
 *
 * This task does NOT classify the 37 individual block types, nor individual
 * templates/layouts/sections, nor introduce numeric limits. The `standard_*`
 * and `premium_*` capability ids exist as typed placeholders whose per-item
 * classification is a later manifest task.
 */

/* ============================================================================
 * 1. PRODUCT TIER (canonical vocabulary, declared locally to avoid server coupling)
 * ========================================================================== */

/** Canonical product tiers. Identical vocabulary to Billing's `EffectiveTier`. */
export const PRODUCT_TIERS = ["free", "pro", "business", "enterprise"] as const;

export type ProductTier = (typeof PRODUCT_TIERS)[number];

/* ============================================================================
 * 2. CANONICAL CAPABILITY IDS
 * ========================================================================== */

/**
 * Core capabilities available to Free (and every higher tier).
 * Free must be genuinely usable, attractive and publishable.
 */
export const CORE_FREE_CAPABILITIES = [
  "edit_content",
  "edit_basic_style",
  "avatar_banner",
  "media_assets",
  "basic_layout_selection",
  "basic_card_button_styling",
  "block_structure",
  "standard_blocks",
  "standard_sections",
  "standard_templates",
  "publishing",
] as const;

/**
 * Pro capabilities (advanced visual control). Business and Enterprise inherit
 * the complete Pro visual set — there are NO Business/Enterprise-only visual
 * effects in this policy.
 */
export const PRO_CAPABILITIES = [
  "advanced_typography",
  "advanced_layout",
  "manual_responsive",
  "advanced_motion",
  "premium_background_effects",
  "advanced_card_button_styling",
  "premium_blocks",
  "premium_sections",
  "premium_templates",
  "remove_cripqer_branding",
] as const;

/** Every capability declared by this V1 policy, in canonical order. */
export const ALL_CAPABILITIES = [
  ...CORE_FREE_CAPABILITIES,
  ...PRO_CAPABILITIES,
] as const;

export type ProductCapability = (typeof ALL_CAPABILITIES)[number];

export type CoreFreeCapability = (typeof CORE_FREE_CAPABILITIES)[number];
export type ProCapability = (typeof PRO_CAPABILITIES)[number];

/**
 * EARLY ACCESS — POWER EDITOR EDITING UNLOCK (pre-monetization).
 *
 * During the current early-access / development stage the Power Editor's
 * editing capabilities are intentionally open to ALL tiers so testers can
 * exercise the complete editor and surface real bugs. A visible editing
 * control must never silently DENY its canonical mutation.
 *
 * This set is consulted FIRST by `resolveCapabilityAccess`, so these
 * capabilities resolve ALLOW regardless of tier. The immutable
 * `CAPABILITY_POLICY` table below remains the single source of truth for
 * future plan-based gating.
 *
 * WHEN MONETIZATION BEGINS: remove entries from this set (or delete the set)
 * to restore normal plan-based gating from `CAPABILITY_POLICY` — this is the
 * single obvious re-gating point.
 *
 * NOTE: `remove_cripqer_branding` is intentionally EXCLUDED — it is a
 * branding/publishing monetization feature, not a Power Editor creative
 * editing capability. `premium_sections` and `premium_templates` are also
 * EXCLUDED because they are only reachable via the `APPLY_SECTION` /
 * `APPLY_TEMPLATE` intents, which are not dispatched through the Power
 * Editor's guarded dispatch (StudioAction boundary).
 */
export const POWER_EDITOR_EARLY_ACCESS_CAPABILITIES = [
  "advanced_typography",
  "advanced_layout",
  "manual_responsive",
  "advanced_motion",
  "premium_background_effects",
  "advanced_card_button_styling",
  "premium_blocks",
] as const satisfies readonly ProCapability[];

/* ============================================================================
 * 3. IMMUTABLE DECLARATIVE POLICY TABLE
 * ========================================================================== */

const PRODUCT_TIER_SET: ReadonlySet<string> = new Set<string>(PRODUCT_TIERS);
const CAPABILITY_SET: ReadonlySet<string> = new Set<string>(ALL_CAPABILITIES);

/**
 * Immutable, declarative capability → tier allow table.
 *
 * free       → core editing/publishing only.
 * pro        → every declared capability.
 * business   → every declared capability (same visual matrix as Pro).
 * enterprise → every declared capability (same visual matrix as Pro).
 */
const CAPABILITY_POLICY: Readonly<
  Record<ProductTier, ReadonlySet<ProductCapability>>
> = {
  free: new Set<ProductCapability>(CORE_FREE_CAPABILITIES),
  pro: new Set<ProductCapability>(ALL_CAPABILITIES),
  business: new Set<ProductCapability>(ALL_CAPABILITIES),
  enterprise: new Set<ProductCapability>(ALL_CAPABILITIES),
};

/** Early-access Power Editor editing capabilities (see constant above). */
const POWER_EDITOR_EARLY_ACCESS_SET: ReadonlySet<ProductCapability> = new Set<ProductCapability>(
  POWER_EDITOR_EARLY_ACCESS_CAPABILITIES,
);

/* ============================================================================
 * 4. DECISION CONTRACT
 * ========================================================================== */

export type CapabilityAccessState = "ALLOW" | "LOCKED";

/** Reasons a capability may be LOCKED. */
export type CapabilityLockReason = "UPGRADE_REQUIRED" | "UNKNOWN_CAPABILITY";

/** The tier a user must upgrade to in order to unlock a LOCKED capability. */
export type UpgradeTarget = "pro" | null;

/** ALLOW: the capability is visible and mutable. */
export interface CapabilityAllowDecision {
  readonly state: "ALLOW";
  readonly visible: true;
  readonly editable: true;
  readonly reason: null;
  readonly upgradeTarget: null;
}

/**
 * LOCKED: the capability is visible but NOT mutable.
 * LOCKED does NOT mean remove stored values, hide rendered effects, downgrade
 * config, or replace config with Free defaults — it only blocks MUTATION.
 */
export interface CapabilityLockedDecision {
  readonly state: "LOCKED";
  readonly visible: true;
  readonly editable: false;
  readonly reason: CapabilityLockReason;
  readonly upgradeTarget: UpgradeTarget;
}

export type CapabilityAccessDecision =
  | CapabilityAllowDecision
  | CapabilityLockedDecision;

/* ============================================================================
 * 5. TYPE GUARDS
 * ========================================================================== */

export function isProductTier(value: unknown): value is ProductTier {
  return typeof value === "string" && PRODUCT_TIER_SET.has(value);
}

export function isProductCapability(value: unknown): value is ProductCapability {
  return typeof value === "string" && CAPABILITY_SET.has(value);
}

/* ============================================================================
 * 6. PURE RESOLVER
 * ========================================================================== */

/**
 * Resolve the authoritative product-access decision for a tier + capability.
 *
 * PURE and SYNCHRONOUS. Fail-closed:
 *   - Unknown capability        → LOCKED (reason UNKNOWN_CAPABILITY).
 *   - Unknown / invalid tier    → treated no more permissively than Free
 *                                 (never grants a Pro capability).
 *
 * @param tier       Canonical effective tier (free | pro | business | enterprise).
 * @param capability Canonical capability id.
 */
export function resolveCapabilityAccess(
  tier: ProductTier,
  capability: ProductCapability,
): CapabilityAccessDecision {
  // EARLY ACCESS: Power Editor editing capabilities are temporarily open to
  // ALL tiers during pre-monetization. See POWER_EDITOR_EARLY_ACCESS_CAPABILITIES
  // for the canonical re-gating point.
  if (POWER_EDITOR_EARLY_ACCESS_SET.has(capability)) {
    return {
      state: "ALLOW",
      visible: true,
      editable: true,
      reason: null,
      upgradeTarget: null,
    };
  }

  // Fail closed: an unknown/invalid runtime tier is treated no more
  // permissively than Free.
  const effectiveTier: ProductTier = isProductTier(tier) ? tier : "free";

  const allowed = CAPABILITY_POLICY[effectiveTier];

  // Fail closed: an unknown capability is never granted by name inference.
  if (!allowed.has(capability)) {
    const known = isProductCapability(capability);
    return {
      state: "LOCKED",
      visible: true,
      editable: false,
      reason: known ? "UPGRADE_REQUIRED" : "UNKNOWN_CAPABILITY",
      upgradeTarget: known ? "pro" : null,
    };
  }

  return {
    state: "ALLOW",
    visible: true,
    editable: true,
    reason: null,
    upgradeTarget: null,
  };
}
