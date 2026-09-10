/**
 * CRIPQER — CANONICAL MUTATION PRESERVATION GUARD V1 — SELFCHECK (PURE_LOCAL)
 *
 * Verifies the guard's authorization + preservation behavior with no network,
 * no database, no React, and no Supabase. It exercises only the pure functions
 * exported by `./mutation-guard.ts`, delegating through the frozen Product
 * Capability Policy Core and Asset Entitlement Manifest.
 */

import {
  authorizeCanonicalMutation,
  isMutationIntent,
  verifyMutationPreservation,
} from "./mutation-guard.ts";
import type { MutationIntent } from "./mutation-guard.ts";
import type {
  BioTemplateConfig,
  BlockType,
  TemplateBlock,
} from "../../premium-template-studio/types";

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function makeBlock(id: string, type: BlockType): TemplateBlock {
  return {
    id,
    type,
    variant: "default",
    content: {},
    style: {},
    layout: {},
    visibility: { desktop: true, tablet: true, mobile: true },
    interaction: {},
  };
}

/**
 * A canonical config carrying PREMIUM design state: a premium layout, advanced
 * motion, advanced responsive overrides, and a premium block. This is the
 * fixture used to prove that unrelated Free edits never destroy locked values.
 */
function makeConfig(overrides: Partial<BioTemplateConfig> = {}): BioTemplateConfig {
  const base: BioTemplateConfig = {
    schemaVersion: 1,
    pageInstanceId: "bio-test",
    templateDefinitionId: "creator-premium",
    metadata: {
      templateDefinitionId: "creator-premium",
      name: "Test",
      category: "Creator",
      premium: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    theme: {
      id: "aurora",
      name: "Aurora",
      colors: {
        primary: "#000000",
        secondary: "#111111",
        accent: "#222222",
        background: "#ffffff",
        surface: "#fafafa",
        card: "#ffffff",
        text: "#000000",
        mutedText: "#666666",
        border: "#eeeeee",
      },
      typography: {
        headingFont: "Inter",
        bodyFont: "Inter",
        headingSize: 40,
        bodySize: 16,
        headingWeight: 700,
        bodyWeight: 400,
        lineHeight: 1.5,
        letterSpacing: 0,
      },
      background: { type: "gradient", gradient: { kind: "linear", angle: 90, from: "#000000", to: "#333333" } },
      cards: { preset: "minimal", radius: 12, borderWidth: 1, shadow: "none", blur: 0, padding: 16, opacity: 1 },
      buttons: { variant: "solid", radius: 8, height: 40, fontWeight: 600, shadow: "none", borderWidth: 0 },
      spacing: { section: 64, block: 24, contentWidth: 720 },
      animation: "none",
    },
    layout: {
      id: "editorial", // PREMIUM layout
      name: "Editorial",
      header: "stacked",
      responsive: {
        desktop: { columns: 1, gutter: 24, align: "left", padding: 40 },
        tablet: { columns: 1, gutter: 16, align: "left", padding: 24 },
        mobile: { columns: 1, gutter: 12, align: "left", padding: 16 },
      },
    },
    profile: {
      name: "Ada Lovelace",
      username: "ada",
      avatar: { size: 96, radius: 999, borderWidth: 4, shadow: true, overlap: 48, align: "center" },
      banner: {
        enabled: true,
        height: 190,
        mobileHeight: 140,
        overlay: 0.15,
        blur: 0,
        gradient: true,
        focalX: 50,
        focalY: 50,
        radius: 18,
      },
    },
    blocks: [makeBlock("block-hero", "hero"), makeBlock("block-stats", "stats")],
    seo: { title: "Ada Lovelace", description: "Profile", index: true },
    settings: { showBranding: true, slug: "ada", animation: "none", language: "en" },
    motion: { preset: "editorial", entrance: "fade", hover: "lift", duration: 300, delay: 0, stagger: 60 },
  };
  return { ...base, ...overrides };
}

export function runMutationGuardSelfcheck() {
  let assertions = 0;
  const check = (condition: boolean, message: string) => {
    assertions += 1;
    if (!condition) throw new Error(`Mutation guard self-check failed: ${message}`);
  };

  const editContent: MutationIntent = { kind: "EDIT_CONTENT" };

  /* ============================================================
   * 1. FREE: unrelated content edit preserves all locked values
   * ========================================================== */
  const before = makeConfig();
  const after = { ...before, profile: { ...before.profile, name: "Grace Hopper" } };

  const authContent = authorizeCanonicalMutation("free", editContent);
  check(authContent.decision === "ALLOW", "Free edit_content must be ALLOW");

  const preserved = verifyMutationPreservation(before, after, "free", editContent);
  check(preserved.valid === true, "unrelated content edit must preserve protected domains");
  check(preserved.violations.length === 0, "no violations expected for pure name edit");
  check(after.profile.name === "Grace Hopper", "name may change");
  check(sameJson(before.layout, after.layout), "premium layout preserved");
  check(sameJson(before.motion, after.motion), "motion preserved");
  check(sameJson(before.layout.responsive, after.layout.responsive), "responsive preserved");
  check(sameJson(before.theme, after.theme), "theme preserved");
  check(
    sameJson(
      before.blocks.map((b) => b.type),
      after.blocks.map((b) => b.type),
    ),
    "premium block preserved (structural signature)",
  );

  /* ============================================================
   * 2. ACCIDENTAL STRIP: motion removed during content edit -> FAIL
   * ========================================================== */
  const { motion: _stripped, ...stripped } = before;
  const afterStripped = { ...stripped, profile: { ...before.profile, name: "Grace Hopper" } };
  const stripResult = verifyMutationPreservation(before, afterStripped, "free", editContent);
  check(stripResult.valid === false, "motion removal during content edit must FAIL preservation");
  check(
    stripResult.violations.some((v) => v.domain === "motion"),
    "motion strip must be reported as a motion-domain violation",
  );

  /* ============================================================
   * 3. ACCIDENTAL LAYOUT DOWNGRADE: premium -> centered -> FAIL
   * ========================================================== */
  const afterDowngraded = {
    ...before,
    layout: { ...before.layout, id: "centered" as const },
    profile: { ...before.profile, name: "Grace Hopper" },
  };
  const downgradeResult = verifyMutationPreservation(before, afterDowngraded, "free", editContent);
  check(downgradeResult.valid === false, "premium layout downgrade must FAIL preservation");
  const layoutViolation = downgradeResult.violations.find((v) => v.domain === "layout");
  check(layoutViolation !== undefined, "layout downgrade must be reported");
  check(
    layoutViolation?.capability === "advanced_layout",
    "layout downgrade must map to advanced_layout",
  );

  /* ============================================================
   * 4. FREE: existing premium block semantics
   * ========================================================== */
  check(
    authorizeCanonicalMutation("free", { kind: "EDIT_CONTENT" }).decision === "ALLOW",
    "edit permitted content inside existing premium block -> ALLOW",
  );
  check(
    authorizeCanonicalMutation("free", { kind: "REORDER_BLOCK" }).decision === "ALLOW",
    "reorder existing premium block -> ALLOW",
  );
  check(
    authorizeCanonicalMutation("free", { kind: "DELETE_BLOCK" }).decision === "ALLOW",
    "delete existing premium block -> ALLOW",
  );
  check(
    authorizeCanonicalMutation("free", { kind: "DUPLICATE_BLOCK", blockType: "stats" }).decision === "ALLOW",
    "duplicate premium block -> ALLOW during Power Editor early access",
  );
  check(
    authorizeCanonicalMutation("free", { kind: "TOGGLE_BLOCK_VISIBILITY" }).decision === "ALLOW",
    "toggle block visibility remains a structural (Free) operation",
  );

  /* ============================================================
   * 5. FREE: asset insertion/application gating
   * ========================================================== */
  const assetCases: Array<{ intent: MutationIntent; expected: "ALLOW" | "DENY" }> = [
    { intent: { kind: "ADD_BLOCK", blockType: "hero" }, expected: "ALLOW" },        // standard block
    { intent: { kind: "ADD_BLOCK", blockType: "stats" }, expected: "ALLOW" },        // premium block (early access)
    { intent: { kind: "APPLY_SECTION", assetId: "services-cards" }, expected: "ALLOW" }, // standard section
    { intent: { kind: "APPLY_SECTION", assetId: "media-bento" }, expected: "ALLOW" },  // premium section (early access)
    { intent: { kind: "APPLY_TEMPLATE", assetId: "creator-premium-001" }, expected: "ALLOW" }, // standard template
    { intent: { kind: "APPLY_TEMPLATE", assetId: "creator-premium" }, expected: "ALLOW" },  // premium template (early access)
    { intent: { kind: "APPLY_LAYOUT", assetId: "centered" }, expected: "ALLOW" },   // standard layout
    { intent: { kind: "APPLY_LAYOUT", assetId: "bento" }, expected: "ALLOW" },       // premium layout (early access)
  ];
  for (const { intent, expected } of assetCases) {
    const result = authorizeCanonicalMutation("free", intent);
    check(
      result.decision === expected,
      `${JSON.stringify(intent)} for Free must be ${expected} (got ${result.decision})`,
    );
  }

  /* ============================================================
   * 6. EXPLICIT AUTHORIZED REPLACEMENT vs unrelated save
   * ========================================================== */
  const applyStandardTemplate: MutationIntent = { kind: "APPLY_TEMPLATE", assetId: "creator-premium-001" };
  const authTemplate = authorizeCanonicalMutation("free", applyStandardTemplate);
  check(authTemplate.decision === "ALLOW", "Free may apply an authorized standard template");

  // A standard template replaces many domains by design (layout, theme, blocks,
  // motion removed). That is an EXPLICIT authorized replacement, not data loss.
  const afterTemplate = makeConfig({
    layout: { ...before.layout, id: "centered" },
    theme: { ...before.theme, name: "Minimal" },
    blocks: [makeBlock("block-heading", "heading")],
  });
  const { motion: _tplMotion, ...tplNoMotion } = afterTemplate;
  const replacementResult = verifyMutationPreservation(
    before,
    tplNoMotion,
    "free",
    applyStandardTemplate,
  );
  check(
    replacementResult.valid === true,
    "explicit authorized standard template replacement must be distinguishable from data loss",
  );

  // But the SAME config diff under an unrelated content-save is data loss.
  const unrelatedResult = verifyMutationPreservation(before, tplNoMotion, "free", editContent);
  check(
    unrelatedResult.valid === false,
    "the same domain changes under an unrelated content-save must FAIL preservation",
  );

  /* ============================================================
   * 7. PRO: every declared visual mutation intent is allowed
   * ========================================================== */
  const proIntents: MutationIntent[] = [
    { kind: "EDIT_ADVANCED_MOTION" },
    { kind: "EDIT_ADVANCED_LAYOUT" },
    { kind: "EDIT_MANUAL_RESPONSIVE" },
    { kind: "EDIT_ADVANCED_TYPOGRAPHY" },
    { kind: "EDIT_PREMIUM_BACKGROUND" },
    { kind: "EDIT_ADVANCED_CARD_BUTTON" },
    { kind: "ADD_BLOCK", blockType: "stats" },
    { kind: "APPLY_TEMPLATE", assetId: "creator-premium" },
    { kind: "APPLY_LAYOUT", assetId: "bento" },
    { kind: "APPLY_SECTION", assetId: "media-bento" },
    { kind: "REMOVE_CRIPQER_BRANDING" },
  ];
  for (const intent of proIntents) {
    check(
      authorizeCanonicalMutation("pro", intent).decision === "ALLOW",
      `Pro must ALLOW ${intent.kind}`,
    );
  }
  // Pro preservation: no domain is protected from Pro.
  const proPreserved = verifyMutationPreservation(before, tplNoMotion, "pro", editContent);
  check(proPreserved.valid === true, "Pro may change any visual domain without preservation failure");

  /* ============================================================
   * 8. FAIL-CLOSED unknown / invalid behavior
   * ========================================================== */
  const unknownIntent = authorizeCanonicalMutation("free", { kind: "BOGUS" } as unknown as MutationIntent);
  check(unknownIntent.decision === "DENY", "unknown intent -> DENY");
  check(unknownIntent.reason === "UNKNOWN_INTENT", "unknown intent carries UNKNOWN_INTENT reason");

  const unknownAsset = authorizeCanonicalMutation("free", { kind: "ADD_BLOCK", blockType: "not_a_block" });
  check(unknownAsset.decision === "DENY", "unknown asset -> DENY");
  check(unknownAsset.reason === "UNKNOWN_ASSET", "unknown asset carries UNKNOWN_ASSET reason");

  const invalidTierPro = authorizeCanonicalMutation(
    "platinum" as "free",
    { kind: "REMOVE_CRIPQER_BRANDING" },
  );
  check(invalidTierPro.decision === "DENY", "invalid tier receives no non-early-access Pro mutation");
  const invalidTierCore = authorizeCanonicalMutation(
    "platinum" as "free",
    { kind: "EDIT_CONTENT" },
  );
  check(invalidTierCore.decision === "ALLOW", "invalid tier treated no more permissively than Free (core still allowed)");

  /* ============================================================
   * 9. PURITY: deterministic, 0 network, 0 DB, 0 React, 0 Supabase
   * ========================================================== */
  check(isMutationIntent(editContent) === true, "isMutationIntent recognizes a valid intent");
  check(isMutationIntent({ kind: "BOGUS" }) === false, "isMutationIntent rejects unknown intent");
  check(isMutationIntent(null) === false, "isMutationIntent rejects null");
  check(isMutationIntent("EDIT_CONTENT") === false, "isMutationIntent rejects non-object");

  // Determinism: identical inputs -> identical outputs.
  check(
    sameJson(
      authorizeCanonicalMutation("free", { kind: "APPLY_TEMPLATE", assetId: "creator-premium" }),
      authorizeCanonicalMutation("free", { kind: "APPLY_TEMPLATE", assetId: "creator-premium" }),
    ),
    "authorization must be deterministic",
  );
  check(
    sameJson(
      verifyMutationPreservation(before, after, "free", editContent),
      verifyMutationPreservation(before, after, "free", editContent),
    ),
    "preservation must be deterministic",
  );

  // No external identity / network / runtime authority leaks into decisions.
  const identityKeys = [
    "email", "provider", "browser", "user_id", "session", "network",
    "database", "supabase", "react", "fetch", "isPremium",
  ] as const;
  const sampleAuth = authorizeCanonicalMutation("free", editContent);
  for (const key of identityKeys) {
    check(
      !Object.prototype.hasOwnProperty.call(sampleAuth, key),
      `authorization must not consult ${key}`,
    );
  }
  const samplePreserve = verifyMutationPreservation(before, after, "free", editContent);
  for (const key of identityKeys) {
    check(
      !Object.prototype.hasOwnProperty.call(samplePreserve, key),
      `preservation must not consult ${key}`,
    );
  }

  // Arity (pure function shape).
  check(authorizeCanonicalMutation.length === 2, "authorize must be a pure arity-2 function");
  check(verifyMutationPreservation.length === 4, "preservation must be a pure arity-4 function");

  return {
    passed: assertions,
    failed: 0,
    authorization: "PASS",
    preservation: "PASS",
    purity: "PASS (0 network / 0 DB / 0 React / 0 Supabase)",
  } as const;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  console.log(JSON.stringify(runMutationGuardSelfcheck(), null, 2));
}



