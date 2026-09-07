/**
 * CRIPQER — PRODUCT CAPABILITY POLICY CORE V1 — SELFCHECK (PURE_LOCAL)
 *
 * Verifies the canonical capability policy with no network, no database, no
 * filesystem runtime calls, and no external identity authority. It exercises
 * only the pure `resolveCapabilityAccess` function and the declarative
 * constants from `./capabilities.ts`.
 */

import {
  ALL_CAPABILITIES,
  CORE_FREE_CAPABILITIES,
  PRO_CAPABILITIES,
  isProductCapability,
  isProductTier,
  resolveCapabilityAccess,
} from "./capabilities.ts";
import type {
  CapabilityAccessDecision,
  ProductCapability,
  ProductTier,
} from "./capabilities.ts";

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function runProductCapabilitySelfcheck() {
  let assertions = 0;
  const check = (condition: boolean, message: string) => {
    assertions += 1;
    if (!condition) throw new Error(`Product capability self-check failed: ${message}`);
  };

  /* ---- tier + capability vocabulary integrity ---- */
  check(CORE_FREE_CAPABILITIES.length === 11, "Free must declare exactly 11 core capabilities");
  check(PRO_CAPABILITIES.length === 10, "Pro must declare exactly 10 advanced capabilities");
  check(
    ALL_CAPABILITIES.length === 21 &&
      ALL_CAPABILITIES.length === CORE_FREE_CAPABILITIES.length + PRO_CAPABILITIES.length,
    "ALL_CAPABILITIES must be the disjoint union of core + pro (21 total)",
  );
  check(
    new Set(ALL_CAPABILITIES).size === ALL_CAPABILITIES.length,
    "capability ids must be unique (no duplicates)",
  );

  /* ---- Free: core capabilities are ALLOW ---- */
  const freeCoreAllowed = [
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

  for (const capability of freeCoreAllowed) {
    const decision = resolveCapabilityAccess("free", capability);
    check(
      decision.state === "ALLOW" && decision.editable === true && decision.visible === true,
      `Free must ALLOW core capability: ${capability}`,
    );
  }

  /* ---- Free: advanced capabilities are LOCKED ---- */
  const freeLocked = [
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

  for (const capability of freeLocked) {
    const decision = resolveCapabilityAccess("free", capability);
    check(
      decision.state === "LOCKED" && decision.editable === false && decision.visible === true,
      `Free must LOCK advanced capability: ${capability}`,
    );
    check(
      decision.reason === "UPGRADE_REQUIRED" && decision.upgradeTarget === "pro",
      `Free LOCKED capability must target upgrade to pro: ${capability}`,
    );
  }

  /* ---- Pro / Business / Enterprise: every declared capability is ALLOW ---- */
  const paidTiers = ["pro", "business", "enterprise"] as const;
  for (const tier of paidTiers) {
    for (const capability of ALL_CAPABILITIES) {
      const decision = resolveCapabilityAccess(tier, capability);
      check(
        decision.state === "ALLOW" && decision.editable === true,
        `${tier} must ALLOW every declared capability: ${capability}`,
      );
    }
  }

  /* ---- Business / Enterprise visual matrix equals Pro ---- */
  for (const capability of ALL_CAPABILITIES) {
    check(
      sameJson(
        resolveCapabilityAccess("business", capability),
        resolveCapabilityAccess("pro", capability),
      ),
      `business must match pro for ${capability}`,
    );
    check(
      sameJson(
        resolveCapabilityAccess("enterprise", capability),
        resolveCapabilityAccess("pro", capability),
      ),
      `enterprise must match pro for ${capability}`,
    );
  }

  /* ---- fail closed: unknown capability ---- */
  const unknownCap = resolveCapabilityAccess(
    "pro",
    "not_a_real_capability" as unknown as ProductCapability,
  );
  check(unknownCap.state === "LOCKED", "unknown capability must fail closed (LOCKED)");
  check(
    unknownCap.reason === "UNKNOWN_CAPABILITY",
    "unknown capability must carry reason UNKNOWN_CAPABILITY",
  );
  check(
    unknownCap.upgradeTarget === null,
    "unknown capability must not advertise an upgrade target",
  );

  /* ---- fail closed: invalid tier must not obtain Pro capability ---- */
  const invalidTierProCap = resolveCapabilityAccess(
    "platinum" as unknown as ProductTier,
    "advanced_motion",
  );
  check(
    invalidTierProCap.state === "LOCKED",
    "invalid tier must not obtain a Pro-only capability",
  );
  check(
    resolveCapabilityAccess("platinum" as unknown as ProductTier, "publishing").state ===
      "ALLOW",
    "invalid tier must be treated no more permissively than Free (core still allowed)",
  );

  /* ---- missing capability fails closed ---- */
  const missingCap = resolveCapabilityAccess("free", "" as unknown as ProductCapability);
  check(missingCap.state === "LOCKED", "missing/empty capability must fail closed");

  /* ---- type guards ---- */
  check(isProductTier("free") && isProductTier("enterprise"), "canonical tiers recognized");
  check(!isProductTier("premium") && !isProductTier("trial"), "non-canonical tiers rejected");
  check(isProductCapability("publishing"), "canonical capability recognized");
  check(!isProductCapability("premium_gradient"), "non-canonical capability rejected");

  /* ---- no legacy isPremium boolean ---- */
  const sampleDecision: CapabilityAccessDecision = resolveCapabilityAccess("free", "publishing");
  check(
    !("isPremium" in sampleDecision),
    "policy must not depend on a legacy isPremium boolean",
  );
  check(
    resolveCapabilityAccess.length === 2,
    "resolver must be a pure function of exactly (tier, capability)",
  );

  /* ---- no external authority (no email/provider/browser identity) ---- */
  const identityKeys = ["email", "provider", "browser", "user_id", "session"] as const;
  for (const key of identityKeys) {
    check(
      !Object.prototype.hasOwnProperty.call(sampleDecision, key),
      `policy must not consult external identity authority (${key})`,
    );
  }

  /* ---- determinism (purity) ---- */
  check(
    sameJson(
      resolveCapabilityAccess("business", "advanced_layout"),
      resolveCapabilityAccess("business", "advanced_layout"),
    ),
    "resolver must be deterministic for identical inputs",
  );

  return {
    passed: assertions,
    failed: 0,
    declaredCapabilities: ALL_CAPABILITIES.length,
    tiers: ["free", "pro", "business", "enterprise"] as const,
  } as const;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  console.log(JSON.stringify(runProductCapabilitySelfcheck(), null, 2));
}
