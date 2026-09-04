/**
 * POWER EDITOR V2 CONTRACT SELF-CHECK.
 *
 * Pure, dependency-free assertions. Run with:
 *   bun run src/lib/parametric-engine/fixtures/self-check-v2.ts
 */

import { validateTemplate } from "@/premium-template-studio/engine/TemplateValidator";
import { REGISTERED_BLOCK_TYPES } from "@/premium-template-studio/engine/BlockRegistry";
import { getBlockDefinition } from "@/premium-template-studio/constants/blockDefinitions";
import { POWER_EDITOR_CAPABILITIES } from "../power-editor/capabilities-v2";
import { contrastRatio } from "../power-editor/resolvers";
import { normalizeContent } from "../power-editor/content-source";
import { generatePowerEditorCandidates } from "../power-editor/generate-v2";
import { toBioTemplateConfig } from "../power-editor/to-template-config";
import { PLAYGROUND_CASES } from "../power-editor/playground-cases";
import { validatePageRecipe } from "../validator";

const results: { name: string; ok: boolean; detail?: string }[] = [];
function check(name: string, ok: boolean, detail?: string) {
  results.push(detail === undefined ? { name, ok } : { name, ok, detail });
}

const NOW = "2026-01-01T00:00:00.000Z";

for (const testCase of PLAYGROUND_CASES) {
  const candidates = generatePowerEditorCandidates(testCase.intent, {
    content: testCase.content,
    count: 3,
    now: NOW,
  });
  check(`${testCase.id}: generates candidates`, candidates.length > 0);

  const first = candidates[0];
  if (!first) continue;

  /* V1 preserved */
  check(
    `${testCase.id}: embedded PageRecipeV1 still valid`,
    validatePageRecipe(first.recipe.source_recipe).valid,
  );
  check(`${testCase.id}: recipe version is 2`, first.recipe.meta.recipe_version === "2");

  /* renderer contract */
  const validation = validateTemplate(first.config);
  check(`${testCase.id}: config passes renderer validator`, validation.valid, JSON.stringify(validation));

  /* serializable */
  const json = JSON.stringify(first.config);
  check(`${testCase.id}: config is JSON serializable`, typeof json === "string" && json.length > 0);
  check(
    `${testCase.id}: config roundtrips`,
    JSON.stringify(JSON.parse(json)) === json,
  );

  /* determinism */
  const again = generatePowerEditorCandidates(testCase.intent, {
    content: testCase.content,
    count: 3,
    now: NOW,
  });
  check(
    `${testCase.id}: deterministic output`,
    JSON.stringify(again.map((c) => c.config)) === JSON.stringify(candidates.map((c) => c.config)),
  );

  /* diversity */
  const signatures = new Set(
    candidates.map((c) => `${c.recipe.layout.id}|${c.recipe.visual.cards.preset}|${c.recipe.visual.buttons.variant}|${c.recipe.visual.colors.primary}|${c.recipe.visual.background.type}|${c.recipe.visual.typography.headingFont}`),
  );
  check(`${testCase.id}: candidates are visually distinct`, signatures.size >= Math.min(2, candidates.length));

  /* accessibility */
  for (const candidate of candidates) {
    const colors = candidate.recipe.visual.colors;
    check(
      `${candidate.id}: text contrast >= 4.5`,
      contrastRatio(colors.text, colors.background) >= 4.5,
      String(contrastRatio(colors.text, colors.background).toFixed(2)),
    );
    check(
      `${candidate.id}: muted contrast >= 3`,
      contrastRatio(colors.mutedText, colors.surface) >= 3,
    );
  }

  /* no unsupported capability leaks */
  const unsupported = first.recipe.capabilities_used.filter(
    (key) => POWER_EDITOR_CAPABILITIES[key] !== true,
  );
  check(`${testCase.id}: no unsupported capability emitted`, unsupported.length === 0, unsupported.join(","));

  /* no invented content */
  const blockTypes = first.recipe.structure.blocks.map((b) => b.type);
  check(
    `${testCase.id}: gallery only when content exists`,
    !blockTypes.includes("gallery") || Boolean(normalizeContent(testCase.content).gallery),
  );
  check(
    `${testCase.id}: video only when content exists`,
    !blockTypes.includes("video") || Boolean(testCase.content.video),
  );

  /* mobile safety */
  check(
    `${testCase.id}: mobile columns collapse to 1`,
    first.config.layout.responsive.mobile.columns === 1,
  );
  check(
    `${testCase.id}: all blocks visible on mobile`,
    first.config.blocks.every((b) => b.visibility.mobile),
  );

  /* banner honesty */
  check(
    `${testCase.id}: banner only with an asset`,
    !first.recipe.banner.enabled || Boolean(first.recipe.identity.banner),
  );

  /* deterministic ids */
  check(
    `${testCase.id}: block ids are deterministic`,
    first.config.blocks.every((b, i) => b.id === `${b.type}-${i}`),
  );

  /* mapper purity */
  check(
    `${testCase.id}: mapper is pure`,
    JSON.stringify(toBioTemplateConfig(first.recipe)) === JSON.stringify(first.config),
  );
}

/* hostile content is rejected, not rendered */
const hostile = generatePowerEditorCandidates(PLAYGROUND_CASES[0]!.intent, {
  now: NOW,
  count: 1,
  content: {
    links: [
      { label: "bad", url: "javascript:alert(1)" },
      { label: "ok", url: "https://example.com" },
    ],
    gallery: [{ url: "data:image/png;base64,AAA" }],
  },
});
const links = hostile[0]?.recipe.structure.blocks.find((b) => b.type === "links");
check(
  "hostile: javascript: url dropped",
  (links?.content.items ?? []).every((i) => (i.url ?? "").startsWith("https://")),
);
check(
  "hostile: data: image dropped",
  !hostile[0]?.recipe.structure.blocks.some((b) => b.type === "gallery"),
);

/* ---------------- frozen Power Editor V2 contract alignment ---------------- */

const v2 = generatePowerEditorCandidates(PLAYGROUND_CASES[0]!.intent, {
  now: NOW,
  count: 3,
  content: PLAYGROUND_CASES[0]!.content,
});

for (const candidate of v2) {
  const { recipe, config } = candidate;
  check(
    `${candidate.id}: every block type is registered in the frozen renderer`,
    recipe.structure.blocks.every((b) => REGISTERED_BLOCK_TYPES.includes(b.type)),
  );
  check(
    `${candidate.id}: every variant exists in the frozen block definitions`,
    recipe.structure.blocks.every((b) => {
      const def = getBlockDefinition(b.type);
      return !def || def.variants.includes(b.variant);
    }),
  );
  check(`${candidate.id}: theme carries a texture contract`, Boolean(config.theme.texture));
  check(
    `${candidate.id}: motion config is complete`,
    Boolean(config.motion) &&
      typeof config.motion?.duration === "number" &&
      typeof config.motion?.stagger === "number",
  );
  check(
    `${candidate.id}: premium blocks used when content exists`,
    recipe.structure.blocks.some((b) => b.type === "stats") &&
      recipe.structure.blocks.some((b) => b.type === "testimonials") &&
      recipe.structure.blocks.some((b) => b.type === "faq"),
  );
  check(
    `${candidate.id}: floating actions are anchored`,
    recipe.structure.blocks
      .filter((b) => b.type === "floatingActions")
      .every((b) => b.layout.floating?.enabled === true),
  );
}

/* hero block replaces the banner header on cover-led patterns */
const heroCandidates = v2.filter((c) =>
  c.recipe.structure.blocks.some((b) => b.type === "hero"),
);
check(
  "hero block never coexists with an enabled banner",
  heroCandidates.every((c) => c.recipe.banner.enabled === false),
);
check(
  "hero block always renders first",
  heroCandidates.every((c) => c.recipe.structure.blocks[0]?.type === "hero"),
);

/* capabilities never claim more than the frozen renderer offers */
check(
  "capabilities_used are all declared true",
  v2.every((c) =>
    c.recipe.capabilities_used.every(
      (key) => POWER_EDITOR_CAPABILITIES[key as keyof typeof POWER_EDITOR_CAPABILITIES] === true,
    ),
  ),
);


/* ============ FINAL CAPABILITY UTILIZATION MICRO-ROUND (V2) ============ */

import { planBlocks } from "../power-editor/blocks-v2";
import { resolvePowerEditorCapabilities } from "../power-editor/capabilities-v2";
import { resolveFrame } from "../power-editor/resolvers";
import type { RecipeSemanticsV2 } from "../power-editor/types-v2";
import type { CompositionPattern } from "../composition-patterns";
import type { FamilyId } from "../types";

const CAPS = resolvePowerEditorCapabilities();
const BASE_RECIPE = v2[0]!.recipe.source_recipe;
const HERO_OFF = {
  enabled: false,
  name: "",
  profession: "",
  bio: "",
  avatarUrl: null,
  bannerUrl: null,
  verified: false,
};

function semantics(
  family: FamilyId,
  pattern: CompositionPattern,
  over: Partial<RecipeSemanticsV2> = {},
): RecipeSemanticsV2 {
  return {
    family,
    personality: v2[0]!.recipe.semantics.personality,
    primary_goal: v2[0]!.recipe.semantics.primary_goal,
    pattern,
    energy: 50,
    trust: 50,
    media_weight: 50,
    cta_pressure: 50,
    density: "balanced",
    visual_weight: "medium",
    surface_mood: "soft",
    background_mood: "clean",
    media_strategy: "profile-first",
    top_signature: v2[0]!.recipe.semantics.top_signature,
    ...over,
  };
}

const sixLinks = Array.from({ length: 6 }, (_, i) => ({
  label: `Acción ${i + 1}`,
  url: `https://example.com/${i + 1}`,
}));

/* priority 1 — buttonGroup */
const bg = planBlocks(
  BASE_RECIPE,
  semantics("corporate", "compact_action"),
  { links: sixLinks },
  CAPS,
  1,
  HERO_OFF,
);
const bgBlock = bg.find((b) => b.type === "buttonGroup");
check("buttonGroup: planned for compact action pages", Boolean(bgBlock));
check("buttonGroup: 6 buttons in 2 columns (3x2)", bgBlock?.layout.columns === 2 && (bgBlock?.content.items ?? []).length === 6);

const bg2 = planBlocks(BASE_RECIPE, semantics("corporate", "compact_action"), { links: sixLinks.slice(0, 2) }, CAPS, 1, HERO_OFF);
check("buttonGroup: 2 buttons in 2 columns (1x2)", bg2.find((b) => b.type === "buttonGroup")?.layout.columns === 2);

const bg4 = planBlocks(BASE_RECIPE, semantics("corporate", "compact_action"), { links: sixLinks.slice(0, 4) }, CAPS, 1, HERO_OFF);
check("buttonGroup: 4 buttons in 2 columns (2x2)", bg4.find((b) => b.type === "buttonGroup")?.layout.columns === 2);

const threeLinks = sixLinks.slice(0, 3);
const bg3 = planBlocks(BASE_RECIPE, semantics("corporate", "compact_action"), { links: threeLinks }, CAPS, 1, HERO_OFF);
check("buttonGroup: odd count uses a single column", bg3.find((b) => b.type === "buttonGroup")?.layout.columns === 1);

const noBg = planBlocks(BASE_RECIPE, semantics("editorial", "editorial_stack"), { links: sixLinks }, CAPS, 1, HERO_OFF);
check("buttonGroup: not every link list becomes a button group", !noBg.some((b) => b.type === "buttonGroup") && noBg.some((b) => b.type === "links"));

/* priority 2 — 75/25 media link cards */
const mediaLinks = [
  { label: "Branding", url: "https://example.com/a", imageUrl: "https://example.com/a.jpg" },
  { label: "Editorial", url: "https://example.com/b", imageUrl: "https://example.com/b.jpg" },
];
const mediaPlan = planBlocks(
  BASE_RECIPE,
  semantics("creator", "portfolio_first", { media_weight: 70 }),
  { links: mediaLinks },
  CAPS,
  1,
  HERO_OFF,
);
const mediaItems = mediaPlan.find((b) => b.type === "links")?.content.items ?? [];
check("media-card: emitted when content provides images", mediaItems.every((i) => i.presentation === "media-card"));
check("media-card: alternates left/right", mediaItems[0]?.mediaPosition === "left" && mediaItems[1]?.mediaPosition === "right");
check("media-card: multiple media link cards supported", mediaItems.length === 2);

const noImagePlan = planBlocks(
  BASE_RECIPE,
  semantics("creator", "portfolio_first", { media_weight: 70 }),
  { links: [{ label: "Blog", url: "https://example.com/blog" }] },
  CAPS,
  1,
  HERO_OFF,
);
const fallbackItems = noImagePlan.find((b) => b.type === "links")?.content.items ?? [];
check("media-card: falls back when no image exists", fallbackItems.every((i) => i.presentation !== "media-card" && !i.imageUrl));

const corporateMedia = planBlocks(
  BASE_RECIPE,
  semantics("corporate", "trust_first", { media_weight: 70 }),
  { links: mediaLinks },
  CAPS,
  1,
  HERO_OFF,
);
check(
  "media-card: corporate/minimal do not overuse image cards",
  (corporateMedia.find((b) => b.type === "links")?.content.items ?? []).every((i) => i.presentation !== "media-card"),
);

/* priority 3 — frames reach real output */
const luxuryPlan = planBlocks(BASE_RECIPE, semantics("luxury", "service_first"), { badges: [{ label: "10 años" }] }, CAPS, 1, HERO_OFF);
check("frames: luxury CTA receives a luxury frame", luxuryPlan.find((b) => b.type === "cta")?.frame === "luxury");
check("frames: not everything is framed", luxuryPlan.some((b) => b.frame === "none"));
check("frames: minimal family stays unframed", planBlocks(BASE_RECIPE, semantics("minimal", "centered_profile"), {}, CAPS, 1, HERO_OFF).every((b) => b.frame === "none"));
check("frames: creator prefers glow/gradient", ["glow", "gradient"].includes(resolveFrame(semantics("creator", "social_first"), "primary", CAPS)));
check("frames: corporate prefers hairline/none", ["hairline", "none"].includes(resolveFrame(semantics("corporate", "trust_first"), "primary", CAPS)));

/* priority 4 — semantic sticky */
const stickyPlan = planBlocks(
  BASE_RECIPE,
  semantics("corporate", "conversion_first", { cta_pressure: 85 }),
  { bookingUrl: "https://example.com/book" },
  CAPS,
  1,
  HERO_OFF,
);
check("sticky: applied to the high-intent action block", stickyPlan.some((b) => b.layout.sticky?.enabled === true));
check("sticky: at most one sticky block", stickyPlan.filter((b) => b.layout.sticky?.enabled === true).length <= 1);
check(
  "sticky: never used on large content blocks",
  stickyPlan
    .filter((b) => b.layout.sticky?.enabled === true)
    .every((b) => ["cta", "booking", "buttonGroup"].includes(b.type)),
);
check(
  "sticky: not generated on low-pressure pages",
  !planBlocks(BASE_RECIPE, semantics("editorial", "editorial_stack"), { bookingUrl: "https://example.com/book" }, CAPS, 1, HERO_OFF).some(
    (b) => b.layout.sticky?.enabled === true,
  ),
);

const collisionPlan = planBlocks(
  BASE_RECIPE,
  semantics("energetic", "conversion_first", { cta_pressure: 90 }),
  {
    bookingUrl: "https://example.com/book",
    quickActions: [{ label: "WhatsApp", url: "https://wa.me/1" }],
  },
  CAPS,
  1,
  HERO_OFF,
);
check(
  "sticky/floating: never coexist",
  !(collisionPlan.some((b) => b.layout.floating?.enabled === true) && collisionPlan.some((b) => b.layout.sticky?.enabled === true)),
);

/* capability override safety */
const promoted = resolvePowerEditorCapabilities({ arbitrary_css: true, multi_stop_gradient: true });
check("overrides: cannot promote false -> true", promoted.arbitrary_css === false && promoted.multi_stop_gradient === false);
const demoted = resolvePowerEditorCapabilities({ block_buttonGroup: false });
check("overrides: may disable a true capability", demoted.block_buttonGroup === false);
check(
  "overrides: disabling buttonGroup falls back to links",
  !planBlocks(BASE_RECIPE, semantics("corporate", "compact_action"), { links: sixLinks }, demoted, 1, HERO_OFF).some(
    (b) => b.type === "buttonGroup",
  ),
);

/* determinism of the new planning paths */
check(
  "micro-round: planning stays deterministic",
  JSON.stringify(planBlocks(BASE_RECIPE, semantics("corporate", "compact_action"), { links: sixLinks }, CAPS, 1, HERO_OFF)) ===
    JSON.stringify(bg),
);

const passed = results.filter((r) => r.ok).length;
for (const r of results) {
  if (!r.ok) console.error(`FAIL  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
}
console.log(`POWER EDITOR V2 SELF-CHECK: ${passed}/${results.length} passed`);
if (passed !== results.length) process.exit(1);
