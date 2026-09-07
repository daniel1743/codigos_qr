/**
 * CRIPQER — PRODUCT ASSET ENTITLEMENT MANIFEST V1 — SELFCHECK (PURE_LOCAL)
 *
 * Verifies the asset manifest's internal consistency and fail-closed behavior
 * with no network, no database, no React, and no Supabase. It does not re-read
 * Power Editor source; it validates the manifest data and helpers in isolation.
 */

import {
  PREMIUM_BLOCKS,
  PREMIUM_LAYOUTS,
  PREMIUM_SECTIONS,
  PREMIUM_TEMPLATES,
  STANDARD_BLOCKS,
  STANDARD_LAYOUTS,
  STANDARD_SECTIONS,
  STANDARD_TEMPLATES,
  getBlockEntitlement,
  getLayoutEntitlement,
  getSectionEntitlement,
  getTemplateEntitlement,
  resolveAssetEntitlement,
} from "./asset-manifest.ts";

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function hasOverlap(a: readonly string[], b: readonly string[]): boolean {
  const set = new Set(a);
  return b.some((v) => set.has(v));
}

export function runAssetManifestSelfcheck() {
  let assertions = 0;
  const check = (condition: boolean, message: string) => {
    assertions += 1;
    if (!condition) throw new Error(`Asset manifest self-check failed: ${message}`);
  };

  /* ---- BLOCKS: 37 total, 23 standard + 14 premium, disjoint, no dup ---- */
  check(STANDARD_BLOCKS.length === 23, `standard blocks must be 23 (got ${STANDARD_BLOCKS.length})`);
  check(PREMIUM_BLOCKS.length === 14, `premium blocks must be 14 (got ${PREMIUM_BLOCKS.length})`);
  check(STANDARD_BLOCKS.length + PREMIUM_BLOCKS.length === 37, "total blocks must be 37");
  check(!hasDuplicates(STANDARD_BLOCKS), "standard blocks must have no duplicates");
  check(!hasDuplicates(PREMIUM_BLOCKS), "premium blocks must have no duplicates");
  check(!hasOverlap(STANDARD_BLOCKS, PREMIUM_BLOCKS), "block sets must be disjoint");
  for (const id of STANDARD_BLOCKS) {
    const e = getBlockEntitlement(id);
    check(e.classification === "STANDARD", `block ${id} must be STANDARD`);
    check(e.requiredCapability === "standard_blocks", `block ${id} must map to standard_blocks`);
  }
  for (const id of PREMIUM_BLOCKS) {
    const e = getBlockEntitlement(id);
    check(e.classification === "PREMIUM", `block ${id} must be PREMIUM`);
    check(e.requiredCapability === "premium_blocks", `block ${id} must map to premium_blocks`);
  }

  /* ---- LAYOUTS: 9 total, 3 standard + 6 premium ---- */
  check(STANDARD_LAYOUTS.length === 3, `standard layouts must be 3 (got ${STANDARD_LAYOUTS.length})`);
  check(PREMIUM_LAYOUTS.length === 6, `premium layouts must be 6 (got ${PREMIUM_LAYOUTS.length})`);
  check(!hasDuplicates(STANDARD_LAYOUTS), "standard layouts must have no duplicates");
  check(!hasDuplicates(PREMIUM_LAYOUTS), "premium layouts must have no duplicates");
  check(!hasOverlap(STANDARD_LAYOUTS, PREMIUM_LAYOUTS), "layout sets must be disjoint");
  for (const id of STANDARD_LAYOUTS) {
    const e = getLayoutEntitlement(id);
    check(e.classification === "STANDARD", `layout ${id} must be STANDARD`);
    check(e.requiredCapability === "basic_layout_selection", `layout ${id} must map to basic_layout_selection`);
  }
  for (const id of PREMIUM_LAYOUTS) {
    const e = getLayoutEntitlement(id);
    check(e.classification === "PREMIUM", `layout ${id} must be PREMIUM`);
    check(e.requiredCapability === "advanced_layout", `layout ${id} must map to advanced_layout`);
  }

  /* ---- SECTIONS: 29 total, 16 standard + 13 premium ---- */
  check(STANDARD_SECTIONS.length === 16, `standard sections must be 16 (got ${STANDARD_SECTIONS.length})`);
  check(PREMIUM_SECTIONS.length === 13, `premium sections must be 13 (got ${PREMIUM_SECTIONS.length})`);
  check(STANDARD_SECTIONS.length + PREMIUM_SECTIONS.length === 29, "total sections must be 29");
  check(!hasDuplicates(STANDARD_SECTIONS), "standard sections must have no duplicates");
  check(!hasDuplicates(PREMIUM_SECTIONS), "premium sections must have no duplicates");
  check(!hasOverlap(STANDARD_SECTIONS, PREMIUM_SECTIONS), "section sets must be disjoint");
  for (const id of STANDARD_SECTIONS) {
    const e = getSectionEntitlement(id);
    check(e.classification === "STANDARD", `section ${id} must be STANDARD`);
    check(e.requiredCapability === "standard_sections", `section ${id} must map to standard_sections`);
  }
  for (const id of PREMIUM_SECTIONS) {
    const e = getSectionEntitlement(id);
    check(e.classification === "PREMIUM", `section ${id} must be PREMIUM`);
    check(e.requiredCapability === "premium_sections", `section ${id} must map to premium_sections`);
  }

  /* ---- mixed-section rule: premium-block-containing presets must be PREMIUM ---- */
  const premiumBlockContainingSections = [
    "hero-creator-full-image", // featuredMedia
    "booking-simple", // booking
    "booking-split", // booking
    "booking-premium-card", // booking
    "reviews-cards", // testimonials
    "reviews-featured", // testimonials
    "reviews-trust-grid", // stats + testimonials
    "product-grid-premium", // productGrid
    "product-bento-showcase", // productGrid
    "media-featured-video", // featuredMedia
    "media-music-spotlight", // music
    "media-bento", // music
    "contact-floating", // floatingActions
  ];
  for (const id of premiumBlockContainingSections) {
    check(
      !(STANDARD_SECTIONS as readonly string[]).includes(id),
      `premium-block-containing section ${id} must not be STANDARD`,
    );
    check(
      (PREMIUM_SECTIONS as readonly string[]).includes(id),
      `premium-block-containing section ${id} must be PREMIUM`,
    );
  }

  /* ---- TEMPLATES: 42 total, 7 standard + 35 premium ---- */
  check(STANDARD_TEMPLATES.length === 7, `standard templates must be 7 (got ${STANDARD_TEMPLATES.length})`);
  check(PREMIUM_TEMPLATES.length === 35, `premium templates must be 35 (got ${PREMIUM_TEMPLATES.length})`);
  check(STANDARD_TEMPLATES.length + PREMIUM_TEMPLATES.length === 42, "total templates must be 42");
  check(!hasDuplicates(STANDARD_TEMPLATES), "standard templates must have no duplicates");
  check(!hasDuplicates(PREMIUM_TEMPLATES), "premium templates must have no duplicates");
  check(!hasOverlap(STANDARD_TEMPLATES, PREMIUM_TEMPLATES), "template sets must be disjoint");
  for (const id of STANDARD_TEMPLATES) {
    const e = getTemplateEntitlement(id);
    check(e.classification === "STANDARD", `template ${id} must be STANDARD`);
    check(e.requiredCapability === "standard_templates", `template ${id} must map to standard_templates`);
  }
  for (const id of PREMIUM_TEMPLATES) {
    const e = getTemplateEntitlement(id);
    check(e.classification === "PREMIUM", `template ${id} must be PREMIUM`);
    check(e.requiredCapability === "premium_templates", `template ${id} must map to premium_templates`);
  }

  /* ---- fail closed: unknown assets are UNKNOWN (not Standard) ---- */
  const unknownCases: Array<{ kind: Parameters<typeof resolveAssetEntitlement>[0]; id: string }> = [
    { kind: "block", id: "not_a_real_block" },
    { kind: "template", id: "not-a-real-template" },
    { kind: "section", id: "not-a-real-section" },
    { kind: "layout", id: "not-a-real-layout" },
  ];
  for (const { kind, id } of unknownCases) {
    const e = resolveAssetEntitlement(kind, id);
    check(e.classification === "UNKNOWN", `unknown ${kind} "${id}" must be UNKNOWN`);
    check(e.requiredCapability === null, `unknown ${kind} "${id}" must have null capability`);
  }
  check(getBlockEntitlement("").classification === "UNKNOWN", "empty block id must fail closed");
  check(getTemplateEntitlement("").classification === "UNKNOWN", "empty template id must fail closed");
  check(getSectionEntitlement("").classification === "UNKNOWN", "empty section id must fail closed");
  check(getLayoutEntitlement("").classification === "UNKNOWN", "empty layout id must fail closed");

  /* ---- generic resolver dispatch ---- */
  check(resolveAssetEntitlement("block", "hero").classification === "STANDARD", "generic block dispatch");
  check(resolveAssetEntitlement("section", "media-bento").classification === "PREMIUM", "generic section dispatch");
  check(resolveAssetEntitlement("template", "creator-premium").classification === "PREMIUM", "generic template dispatch");
  check(resolveAssetEntitlement("layout", "centered").classification === "STANDARD", "generic layout dispatch");

  /* ---- purity: decision shape carries no identity authority ---- */
  const sample = getTemplateEntitlement("creator-premium");
  const identityKeys = ["email", "provider", "browser", "user_id", "session", "tier"] as const;
  for (const key of identityKeys) {
    check(
      !Object.prototype.hasOwnProperty.call(sample, key),
      `manifest decision must not carry ${key}`,
    );
  }
  check(getBlockEntitlement.length === 1, "getBlockEntitlement must be a pure arity-1 function");
  check(resolveAssetEntitlement.length === 2, "resolveAssetEntitlement must be a pure arity-2 function");

  /* ---- determinism ---- */
  check(
    sameJson(getBlockEntitlement("stats"), getBlockEntitlement("stats")),
    "block entitlement must be deterministic",
  );
  check(
    sameJson(getLayoutEntitlement("bento"), getLayoutEntitlement("bento")),
    "layout entitlement must be deterministic",
  );

  return {
    passed: assertions,
    failed: 0,
    blocks: { standard: STANDARD_BLOCKS.length, premium: PREMIUM_BLOCKS.length },
    layouts: { standard: STANDARD_LAYOUTS.length, premium: PREMIUM_LAYOUTS.length },
    sections: { standard: STANDARD_SECTIONS.length, premium: PREMIUM_SECTIONS.length },
    templates: { standard: STANDARD_TEMPLATES.length, premium: PREMIUM_TEMPLATES.length },
  } as const;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  console.log(JSON.stringify(runAssetManifestSelfcheck(), null, 2));
}

