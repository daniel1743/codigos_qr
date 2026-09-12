/**
 * CRIPQER — CANONICAL MUTATION PRESERVATION GUARD V1
 *
 * A pure guard enforcing one architectural invariant:
 *
 *     ENTITLEMENTS CONTROL MUTATION — THEY DO NOT CONTROL:
 *       rendering, ownership, storage preservation, or canonical validity.
 *
 * Two responsibilities, strictly separated:
 *
 *   1. AUTHORIZATION  — `authorizeCanonicalMutation(tier, intent)`
 *      Decides whether a tier may *intentionally* perform a mutation, by
 *      delegating to the Product Capability Policy Core (field-scoped and
 *      structural capabilities) and the Product Asset Entitlement Manifest
 *      (asset insertion/application).
 *
 *   2. PRESERVATION   — `verifyMutationPreservation(before, after, tier, intent)`
 *      Detects whether an otherwise-allowed mutation unexpectedly altered
 *      canonical data OUTSIDE the domain the authorized intent owns. This is
 *      the guard against accidental deletion, reset, downgrade, normalization
 *      or overwriting of locked advanced values.
 *
 * Core principle: a capability being LOCKED must never by itself cause its
 * already-stored canonical values to be deleted, reset, downgraded or
 * normalized away. LOCKED means "no authority to intentionally mutate"; it
 * does NOT mean "strip/remove/convert existing canonical data".
 *
 * This module performs NO network calls, NO database calls, NO filesystem
 * runtime calls, and has NO React / Supabase / browser dependency. It is a pure
 * synchronous function of its inputs. It is NOT wired into the Power Editor UI,
 * does not add lock icons, and does not modify Billing, routes, canonical
 * persistence, or the BioTemplateConfig schema.
 *
 * BOUNDARY: imports only the *pure* capability policy and asset manifest plus
 * BioTemplateConfig *types* (erased at compile time). No server/Billing, no
 * reducer, no UI.
 */

import type {
  ProductCapability,
  ProductTier,
} from "./capabilities.ts";
import {
  isProductTier,
  resolveCapabilityAccess,
} from "./capabilities.ts";
import {
  getBlockEntitlement,
  getLayoutEntitlement,
  getSectionEntitlement,
  getTemplateEntitlement,
} from "./asset-manifest.ts";
import type { AssetEntitlement } from "./asset-manifest.ts";
import type { BioTemplateConfig } from "../../premium-template-studio/types";

/* ============================================================================
 * 1. MUTATION INTENT CONTRACT
 * ========================================================================== */

/**
 * A mutation intent describes WHAT THE USER MEANT TO CHANGE, never a bare final
 * config snapshot. This lets the guard reason about intent rather than infer
 * product authority from arbitrary final content.
 */
export type MutationIntent =
  /* field-scoped */
  | { readonly kind: "EDIT_CONTENT" }
  | { readonly kind: "EDIT_BASIC_STYLE" }
  | { readonly kind: "EDIT_AVATAR_BANNER" }
  | { readonly kind: "EDIT_MEDIA" }
  | { readonly kind: "EDIT_ADVANCED_TYPOGRAPHY" }
  | { readonly kind: "EDIT_ADVANCED_LAYOUT" }
  | { readonly kind: "EDIT_MANUAL_RESPONSIVE" }
  | { readonly kind: "EDIT_ADVANCED_MOTION" }
  | { readonly kind: "EDIT_PREMIUM_BACKGROUND" }
  | { readonly kind: "EDIT_ADVANCED_CARD_BUTTON" }
  /* structural */
  | { readonly kind: "ADD_BLOCK"; readonly blockType: string }
  | { readonly kind: "DUPLICATE_BLOCK"; readonly blockType: string }
  | { readonly kind: "DELETE_BLOCK" }
  | { readonly kind: "REORDER_BLOCK" }
  | { readonly kind: "TOGGLE_BLOCK_VISIBILITY" }
  /* asset application */
  | { readonly kind: "APPLY_LAYOUT"; readonly assetId: string }
  | { readonly kind: "APPLY_SECTION"; readonly assetId: string }
  | { readonly kind: "APPLY_TEMPLATE"; readonly assetId: string }
  /* branding */
  | { readonly kind: "REMOVE_CRIPQER_BRANDING" }
  /* persistence */
  | { readonly kind: "SAVE_UNRELATED" }
  | { readonly kind: "PUBLISH_UNRELATED" };

const INTENT_KINDS: ReadonlySet<string> = new Set<string>([
  "EDIT_CONTENT",
  "EDIT_BASIC_STYLE",
  "EDIT_AVATAR_BANNER",
  "EDIT_MEDIA",
  "EDIT_ADVANCED_TYPOGRAPHY",
  "EDIT_ADVANCED_LAYOUT",
  "EDIT_MANUAL_RESPONSIVE",
  "EDIT_ADVANCED_MOTION",
  "EDIT_PREMIUM_BACKGROUND",
  "EDIT_ADVANCED_CARD_BUTTON",
  "ADD_BLOCK",
  "DUPLICATE_BLOCK",
  "DELETE_BLOCK",
  "REORDER_BLOCK",
  "TOGGLE_BLOCK_VISIBILITY",
  "APPLY_LAYOUT",
  "APPLY_SECTION",
  "APPLY_TEMPLATE",
  "REMOVE_CRIPQER_BRANDING",
  "SAVE_UNRELATED",
  "PUBLISH_UNRELATED",
]);

export function isMutationIntent(value: unknown): value is MutationIntent {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as { kind?: unknown }).kind;
  return typeof kind === "string" && INTENT_KINDS.has(kind);
}

/* ============================================================================
 * 2. MUTATION AUTHORIZATION
 * ========================================================================== */

export type MutationDecision = "ALLOW" | "DENY";

export type MutationDenyReason =
  | "UPGRADE_REQUIRED"
  | "UNKNOWN_CAPABILITY"
  | "UNKNOWN_ASSET"
  | "UNKNOWN_INTENT";

export interface MutationAuthorization {
  readonly decision: MutationDecision;
  readonly intent: MutationIntent;
  /** The capability that was consulted (or null for unknown intent/asset). */
  readonly capability: ProductCapability | null;
  readonly reason: MutationDenyReason | null;
}

function allow(
  intent: MutationIntent,
  capability: ProductCapability | null,
): MutationAuthorization {
  return { decision: "ALLOW", intent, capability, reason: null };
}

function deny(
  intent: MutationIntent,
  capability: ProductCapability | null,
  reason: MutationDenyReason,
): MutationAuthorization {
  return { decision: "DENY", intent, capability, reason };
}

/** Resolve a field-scoped / structural capability against the policy core. */
function decideByCapability(
  tier: ProductTier,
  intent: MutationIntent,
  capability: ProductCapability,
): MutationAuthorization {
  const decision = resolveCapabilityAccess(tier, capability);
  if (decision.state === "ALLOW") return allow(intent, capability);
  return deny(
    intent,
    capability,
    decision.reason === "UNKNOWN_CAPABILITY" ? "UNKNOWN_CAPABILITY" : "UPGRADE_REQUIRED",
  );
}

/** Resolve an asset insertion/application against the asset manifest. */
function decideByAsset(
  tier: ProductTier,
  intent: MutationIntent,
  entitlement: AssetEntitlement,
): MutationAuthorization {
  if (entitlement.classification === "UNKNOWN") {
    return deny(intent, null, "UNKNOWN_ASSET");
  }
  const capability = entitlement.requiredCapability;
  if (!capability) return deny(intent, null, "UNKNOWN_ASSET");
  const decision = resolveCapabilityAccess(tier, capability);
  if (decision.state === "ALLOW") return allow(intent, capability);
  return deny(intent, capability, "UPGRADE_REQUIRED");
}

/**
 * Authorize a canonical mutation intent for a tier.
 *
 * PURE and SYNCHRONOUS. Fail-closed:
 *   - Unknown intent        -> DENY (UNKNOWN_INTENT).
 *   - Unknown asset         -> DENY (UNKNOWN_ASSET).
 *   - Unknown capability    -> DENY (UNKNOWN_CAPABILITY).
 *   - Invalid tier          -> treated no more permissively than Free.
 *
 * @param tier   Canonical effective tier (free | pro | business | enterprise).
 * @param intent The mutation the user intends to perform.
 */
export function authorizeCanonicalMutation(
  tier: ProductTier,
  intent: MutationIntent,
): MutationAuthorization {
  // Fail closed: an unknown/invalid tier is treated no more permissively than
  // Free, so it can never obtain a Pro mutation.
  const effectiveTier: ProductTier = isProductTier(tier) ? tier : "free";

  if (!isMutationIntent(intent)) {
    return deny(intent, null, "UNKNOWN_INTENT");
  }

  switch (intent.kind) {
    case "EDIT_CONTENT":
      return decideByCapability(effectiveTier, intent, "edit_content");
    case "EDIT_BASIC_STYLE":
      return decideByCapability(effectiveTier, intent, "edit_basic_style");
    case "EDIT_AVATAR_BANNER":
      return decideByCapability(effectiveTier, intent, "avatar_banner");
    case "EDIT_MEDIA":
      return decideByCapability(effectiveTier, intent, "media_assets");
    case "EDIT_ADVANCED_TYPOGRAPHY":
      return decideByCapability(effectiveTier, intent, "advanced_typography");
    case "EDIT_ADVANCED_LAYOUT":
      return decideByCapability(effectiveTier, intent, "advanced_layout");
    case "EDIT_MANUAL_RESPONSIVE":
      return decideByCapability(effectiveTier, intent, "manual_responsive");
    case "EDIT_ADVANCED_MOTION":
      return decideByCapability(effectiveTier, intent, "advanced_motion");
    case "EDIT_PREMIUM_BACKGROUND":
      return decideByCapability(effectiveTier, intent, "premium_background_effects");
    case "EDIT_ADVANCED_CARD_BUTTON":
      return decideByCapability(effectiveTier, intent, "advanced_card_button_styling");

    case "ADD_BLOCK":
      return decideByAsset(effectiveTier, intent, getBlockEntitlement(intent.blockType));
    case "DUPLICATE_BLOCK":
      return decideByAsset(effectiveTier, intent, getBlockEntitlement(intent.blockType));
    case "DELETE_BLOCK":
      return decideByCapability(effectiveTier, intent, "block_structure");
    case "REORDER_BLOCK":
      return decideByCapability(effectiveTier, intent, "block_structure");
    case "TOGGLE_BLOCK_VISIBILITY":
      return decideByCapability(effectiveTier, intent, "block_structure");

    case "APPLY_LAYOUT":
      return decideByAsset(effectiveTier, intent, getLayoutEntitlement(intent.assetId));
    case "APPLY_SECTION":
      return decideByAsset(effectiveTier, intent, getSectionEntitlement(intent.assetId));
    case "APPLY_TEMPLATE":
      return decideByAsset(effectiveTier, intent, getTemplateEntitlement(intent.assetId));

    case "REMOVE_CRIPQER_BRANDING":
      return decideByCapability(effectiveTier, intent, "remove_cripqer_branding");

    case "SAVE_UNRELATED":
      return decideByCapability(effectiveTier, intent, "publishing");
    case "PUBLISH_UNRELATED":
      return decideByCapability(effectiveTier, intent, "publishing");

    default:
      return deny(intent, null, "UNKNOWN_INTENT");
  }
}

/**
 * The public renderer delegates branding removal to the same canonical
 * entitlement decision that authorizes the editor's settings toggle.
 */
export function canRemoveCripqerBranding(tier: ProductTier | undefined): boolean {
  return (
    authorizeCanonicalMutation(tier ?? "free", { kind: "REMOVE_CRIPQER_BRANDING" }).decision ===
    "ALLOW"
  );
}

/* ============================================================================
 * 3. PRESERVATION CHECK
 * ========================================================================== */

/** Top-level canonical domains whose preservation the guard reasons about. */
export type PreservationDomain =
  | "layout"
  | "motion"
  | "theme"
  | "blocks"
  | "profile"
  | "settings"
  | "seo";

/** A single protected-domain change detected during an unrelated mutation. */
export interface PreservationViolation {
  readonly domain: PreservationDomain;
  /** Best-effort affected capability, or null when a domain spans several. */
  readonly capability: ProductCapability | null;
  readonly detail: string;
}

export type PreservationFailureReason =
  | "PROTECTED_DOMAIN_CHANGED"
  | "UNKNOWN_INTENT";

export interface PreservationResult {
  readonly valid: boolean;
  readonly reason: PreservationFailureReason | null;
  readonly violations: PreservationViolation[];
}

const ALL_DOMAINS: readonly PreservationDomain[] = [
  "layout",
  "motion",
  "theme",
  "blocks",
  "profile",
  "settings",
  "seo",
];

const EMPTY_DOMAINS: ReadonlySet<PreservationDomain> = new Set();

/**
 * Domains an intent legitimately OWNS (may change). Everything else must remain
 * byte-for-byte identical or the mutation is treated as accidental data loss.
 *
 * NOTE: `blocks` is a STRUCTURAL signature (id + type + order). Editing CONTENT
 * inside an existing block does not change that signature, so content edits are
 * never mistaken for premium-asset insertion/removal/conversion.
 */
const OWNED_DOMAINS: Readonly<Record<string, ReadonlySet<PreservationDomain>>> = {
  EDIT_CONTENT: new Set(["profile"]),
  EDIT_BASIC_STYLE: new Set(["theme"]),
  EDIT_AVATAR_BANNER: new Set(["profile"]),
  EDIT_MEDIA: new Set(["profile"]),
  EDIT_ADVANCED_TYPOGRAPHY: new Set(["theme"]),
  EDIT_ADVANCED_LAYOUT: new Set(["layout"]),
  EDIT_MANUAL_RESPONSIVE: new Set(["layout"]),
  EDIT_ADVANCED_MOTION: new Set(["motion"]),
  EDIT_PREMIUM_BACKGROUND: new Set(["theme"]),
  EDIT_ADVANCED_CARD_BUTTON: new Set(["theme"]),
  ADD_BLOCK: new Set(["blocks"]),
  DUPLICATE_BLOCK: new Set(["blocks"]),
  DELETE_BLOCK: new Set(["blocks"]),
  REORDER_BLOCK: new Set(["blocks"]),
  TOGGLE_BLOCK_VISIBILITY: new Set(["blocks"]),
  APPLY_LAYOUT: new Set(["layout"]),
  APPLY_SECTION: new Set(["blocks"]),
  // A template application is an explicit, authorized full replacement: it owns
  // every design/config domain that template application normally owns.
  APPLY_TEMPLATE: new Set(["layout", "theme", "profile", "blocks", "motion", "settings", "seo"]),
  REMOVE_CRIPQER_BRANDING: new Set(["settings"]),
  SAVE_UNRELATED: new Set(),
  PUBLISH_UNRELATED: new Set(),
};

/** Structural signature of the block list: id + type + order only. */
function blockStructure(config: BioTemplateConfig): { id: string; type: string }[] {
  return (config.blocks ?? []).map((b) => ({ id: b.id, type: b.type }));
}

function extractDomain(config: BioTemplateConfig, domain: PreservationDomain): unknown {
  switch (domain) {
    case "layout":
      return config.layout ?? null;
    case "motion":
      return config.motion ?? null;
    case "theme":
      return config.theme ?? null;
    case "blocks":
      return blockStructure(config);
    case "profile":
      return config.profile ?? null;
    case "settings":
      return config.settings ?? null;
    case "seo":
      return config.seo ?? null;
  }
}

/** Order-insensitive deep equality over plain JSON-compatible values. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr && bArr) {
    const la = a as unknown[];
    const lb = b as unknown[];
    if (la.length !== lb.length) return false;
    for (let i = 0; i < la.length; i += 1) {
      if (!deepEqual(la[i], lb[i])) return false;
    }
    return true;
  }
  const oa = a as Record<string, unknown>;
  const ob = b as Record<string, unknown>;
  const keysA = Object.keys(oa);
  const keysB = Object.keys(ob);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(ob, key)) return false;
    if (!deepEqual(oa[key], ob[key])) return false;
  }
  return true;
}

/** Map a changed domain to the most specific affected capability. */
function capabilityForDomain(
  domain: PreservationDomain,
  beforeVal: unknown,
  afterVal: unknown,
): ProductCapability | null {
  switch (domain) {
    case "layout": {
      const b = beforeVal as BioTemplateConfig["layout"] | null;
      const a = afterVal as BioTemplateConfig["layout"] | null;
      if ((b?.id ?? null) !== (a?.id ?? null)) return "advanced_layout";
      return "manual_responsive";
    }
    case "motion":
      return "advanced_motion";
    case "theme": {
      const b = beforeVal as BioTemplateConfig["theme"] | null;
      const a = afterVal as BioTemplateConfig["theme"] | null;
      if (!deepEqual(b?.typography ?? null, a?.typography ?? null)) return "advanced_typography";
      if (!deepEqual(b?.background ?? null, a?.background ?? null)) return "premium_background_effects";
      if (!deepEqual(b?.cards ?? null, a?.cards ?? null)) return "advanced_card_button_styling";
      if (!deepEqual(b?.buttons ?? null, a?.buttons ?? null)) return "advanced_card_button_styling";
      return "premium_background_effects";
    }
    case "blocks":
      return "premium_blocks";
    case "profile":
      return "edit_content";
    case "settings":
      return "remove_cripqer_branding";
    case "seo":
      return "edit_content";
  }
}

/**
 * Verify that an (otherwise allowed) mutation did not unexpectedly alter
 * canonical data OUTSIDE the domain the authorized intent owns.
 *
 * FAIL-CLOSED: any protected-domain change is reported as a violation rather
 * than silently rewriting arbitrary canonical data.
 *
 * PURE and SYNCHRONOUS. Does not mutate its inputs.
 *
 * @param before  Canonical config before the mutation.
 * @param after   Canonical config after the mutation.
 * @param tier    Canonical effective tier.
 * @param intent  The mutation the user intended to perform.
 */
export function verifyMutationPreservation(
  before: BioTemplateConfig,
  after: BioTemplateConfig,
  tier: ProductTier,
  intent: MutationIntent,
): PreservationResult {
  const effectiveTier: ProductTier = isProductTier(tier) ? tier : "free";

  if (!isMutationIntent(intent)) {
    return { valid: false, reason: "UNKNOWN_INTENT", violations: [] };
  }

  // Paid tiers are authorized to mutate every declared visual domain, so no
  // domain is "protected" from them.
  const isPaid =
    effectiveTier === "pro" || effectiveTier === "business" || effectiveTier === "enterprise";

  const owned = isPaid ? new Set(ALL_DOMAINS) : (OWNED_DOMAINS[intent.kind] ?? EMPTY_DOMAINS);

  const violations: PreservationViolation[] = [];
  for (const domain of ALL_DOMAINS) {
    if (owned.has(domain)) continue;
    const beforeVal = extractDomain(before, domain);
    const afterVal = extractDomain(after, domain);
    if (!deepEqual(beforeVal, afterVal)) {
      violations.push({
        domain,
        capability: capabilityForDomain(domain, beforeVal, afterVal),
        detail: `Protected domain "${domain}" changed during an unrelated mutation.`,
      });
    }
  }

  if (violations.length > 0) {
    return { valid: false, reason: "PROTECTED_DOMAIN_CHANGED", violations };
  }
  return { valid: true, reason: null, violations: [] };
}



