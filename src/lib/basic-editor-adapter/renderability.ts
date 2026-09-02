import {
  validateRendererRequirements,
  type RenderabilityRequirementV1,
} from "../renderer-capabilities";
import type { OverrideKey, PageRecipeV1 } from "../parametric-engine";
import type {
  BasicEditorAdapterDowngradeV1,
  BasicEditorAdapterInputV1,
  BasicEditorAdapterIssueV1,
  BasicEditorRecipeProjectionV1,
} from "./types";

export interface BasicEditorRenderabilityAnalysisV1 {
  readonly projection: BasicEditorRecipeProjectionV1;
  readonly requirements: readonly RenderabilityRequirementV1[];
  readonly requirementsValidation: ReturnType<typeof validateRendererRequirements>;
  readonly downgrades: readonly BasicEditorAdapterDowngradeV1[];
  readonly warnings: readonly string[];
  readonly errors: readonly BasicEditorAdapterIssueV1[];
  readonly unsupportedCapabilities: readonly string[];
}

const SAFE_PARTIAL_CAPABILITIES = new Set([
  "blocks.socialLinks",
  "links.cardMedia.right",
  "links.cardMedia.platformIcon",
  "avatar.shapes.square",
  "avatar.ring",
  "tokens.buttonRadius.none",
  "tokens.buttonRadius.rounded",
  "tokens.buttonRadius.full",
]);

const SAFE_SELECTOR_DOWNGRADES = new Set([
  "tokens.buttonVariants.solid",
  "tokens.buttonVariants.outline",
  "tokens.buttonVariants.soft",
  "tokens.buttonRadius.none",
  "tokens.buttonRadius.rounded",
  "tokens.buttonRadius.full",
]);

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function backgroundCss(recipe: PageRecipeV1): string {
  const value = recipe.design.background.value;
  if (value.kind === "solid") return value.color;
  if (value.kind === "linear") {
    return `linear-gradient(${value.angle}deg, ${value.from}, ${value.to})`;
  }
  return `radial-gradient(circle at ${value.position}, ${value.from}, ${value.to})`;
}

export function fontNameForToken(
  token: PageRecipeV1["design"]["typography"]["heading_family"],
): string {
  switch (token) {
    case "sans-geometric":
      return "Montserrat";
    case "sans-humanist":
      return "Nunito Sans";
    case "serif-display":
      return "Playfair Display";
    case "serif-text":
      return "Merriweather";
    case "sans-neutral":
    default:
      return "Inter";
  }
}

export function basicDensity(
  density: PageRecipeV1["design"]["geometry"]["density"],
): "compact" | "standard" | "generous" {
  if (density === "compact") return "compact";
  if (density === "spacious") return "generous";
  return "standard";
}

export function basicRadius(
  radius: PageRecipeV1["design"]["button"]["shape"],
): "none" | "rounded" | "full" {
  if (radius === "sharp") return "none";
  if (radius === "pill") return "full";
  return "rounded";
}

function basicAvatarShape(recipe: PageRecipeV1): "circle" | "rounded" | "square" | "none" {
  if (!recipe.structure.hero.show_avatar) return "none";
  if (recipe.design.avatar.shape === "soft-square") return "rounded";
  return recipe.design.avatar.shape;
}

function blockCapability(blockType: string): string | null {
  switch (blockType) {
    case "identity":
      return "blocks.identity";
    case "social_links":
      return "blocks.socialLinks";
    case "link_list":
      return "blocks.links";
    case "footer":
      return "blocks.footer";
    case "media":
      return "media.genericImage";
    case "product":
      return "blocks.products";
    case "service":
      return "blocks.services";
    case "booking_widget":
      return "blocks.bookingWidget";
    case "form":
      return "blocks.contactForm";
    case "social_proof":
      return "blocks.socialProof";
    case "testimonial":
      return "blocks.testimonials";
    case "gallery":
      return "blocks.gallery";
    case "hero":
    case "primary_cta":
    case "professional_card":
      return null;
    default:
      return `blocks.${blockType}`;
  }
}

function isLocked(locks: readonly OverrideKey[] | undefined, key: OverrideKey): boolean {
  return locks?.includes(key) === true;
}

export function inspectRecipeRenderability(
  input: BasicEditorAdapterInputV1,
): BasicEditorRenderabilityAnalysisV1 {
  const { recipe, capabilities } = input;
  const requirements: RenderabilityRequirementV1[] = [];
  const downgrades: BasicEditorAdapterDowngradeV1[] = [];
  const warnings: string[] = [];
  const errors: BasicEditorAdapterIssueV1[] = [];
  const require = (capability: string, required = true) =>
    requirements.push({ capability, required });
  const error = (code: string, path: string, message: string) =>
    errors.push({ code, path, message });
  const downgrade = (code: string, path: string, from: string, to: string, reason: string) =>
    downgrades.push({ code, path, from, to, reason });

  if (capabilities.templateId !== input.templateId) {
    error(
      "capability_template_mismatch",
      "capabilities.templateId",
      `Capabilities for ${capabilities.templateId} cannot validate template ${input.templateId}.`,
    );
  }

  const hero = recipe.structure.hero;
  require(
    `hero.${hero.mode === "banner_avatar" ? "bannerAvatar" : hero.mode === "banner_only" ? "bannerOnly" : "avatarOnly"}`,
  );
  require(`identity.alignment.${hero.identity_alignment}`);

  const expectedFlags =
    hero.mode === "banner_avatar"
      ? { avatar: true, banner: true }
      : hero.mode === "banner_only"
        ? { avatar: false, banner: true }
        : { avatar: true, banner: false };
  if (hero.show_avatar !== expectedFlags.avatar || hero.show_banner !== expectedFlags.banner) {
    error(
      "hero_structure_mismatch",
      "structure.hero",
      `${hero.mode} does not match show_avatar/show_banner.`,
    );
  }
  if (hero.show_avatar && !recipe.identity.avatar) {
    error(
      "missing_avatar_asset",
      "identity.avatar",
      "The recipe requires an avatar but declares no avatar asset.",
    );
  }
  if (hero.show_banner && !recipe.identity.banner) {
    error(
      "missing_banner_asset",
      "identity.banner",
      "The recipe requires a banner but declares no banner asset.",
    );
  }

  if (hero.show_avatar) {
    require(`avatar.shapes.${basicAvatarShape(recipe)}`);
    if (recipe.design.avatar.ring !== "none") require("avatar.ring");
  }
  if (hero.show_professional_badge) require("identity.professionalBadge");
  if (recipe.structure.social_row.enabled) {
    require("blocks.socialLinks");
    if (!input.content.socials?.length) {
      error(
        "missing_social_content",
        "content.socials",
        "The recipe requires a social row but no recognized social destinations were declared.",
      );
    }
  }

  if (
    recipe.blocks.some((block) => block.type === "link_list") &&
    input.content.links.length === 0
  ) {
    error(
      "missing_link_content",
      "content.links",
      "The recipe requires a link list but no secondary links were declared.",
    );
  }

  let linksPresentation = recipe.structure.links.presentation;
  const cardsRequested = linksPresentation !== "buttons";
  if (cardsRequested && capabilities.links.cards.status === "unsupported") {
    if (isLocked(input.lockedOverrides, "links_presentation")) {
      require("links.cards");
      error(
        "locked_cards_unsupported",
        "structure.links.presentation",
        "The locked cards presentation is unsupported by this template and cannot be silently changed.",
      );
    } else {
      downgrade(
        "cards_to_buttons",
        "structure.links.presentation",
        linksPresentation,
        "buttons",
        "The selected template has no professional-card renderer.",
      );
      linksPresentation = "buttons";
    }
  }
  require(linksPresentation === "buttons" ? "links.buttons" : "links.cards");

  let primaryActionPresentation = recipe.structure.primary_action.presentation;
  if (
    primaryActionPresentation === "professional_card" &&
    capabilities.links.cards.status === "unsupported"
  ) {
    downgrade(
      "primary_card_to_button",
      "structure.primary_action.presentation",
      "professional_card",
      "button",
      "The primary destination is preserved through the supported button renderer.",
    );
    primaryActionPresentation = "button";
  }
  require(primaryActionPresentation === "professional_card" ? "links.cards" : "links.buttons");

  if (linksPresentation !== "buttons" || primaryActionPresentation === "professional_card") {
    if (recipe.design.card.style === "elevated") require("tokens.arbitraryShadow");
    if (recipe.design.card.action_style === "text") {
      downgrade(
        "card_action_text_to_chip",
        "design.card.action_style",
        "text",
        "chip",
        "The current professional-card renderer uses its approved chip CTA treatment.",
      );
    }
    if (recipe.design.card.style !== "elevated") {
      warnings.push(
        `design.card.style=${recipe.design.card.style} uses the renderer's approved fixed card surface.`,
      );
    }
    if (recipe.design.card.media_position !== "none") {
      require(`links.cardMedia.${recipe.design.card.media_position}`);
      require("links.cardMedia.focalY");
      require("links.cardMedia.platformIcon");
    } else {
      require("links.cardMedia.none");
    }
  }

  require(
    `tokens.background.${recipe.design.background.type === "solid" ? "solid" : recipe.design.background.type === "linear-gradient" ? "linearGradient" : "radialGradient"}`,
  );
  require("tokens.typography.headingFont");
  require("tokens.typography.bodyFont");
  require("tokens.typography.textWeight");
  require("tokens.density");
  require(`tokens.buttonVariants.${recipe.design.button.style}`);
  require(`tokens.buttonRadius.${basicRadius(recipe.design.button.shape)}`);
  require("tokens.border.solid");

  for (const block of recipe.blocks) {
    const capability = blockCapability(String(block.type));
    if (capability) require(capability);
  }

  const dedupedRequirements = requirements.filter(
    (entry, index, all) =>
      all.findIndex((other) => other.capability === entry.capability) === index,
  );
  const requirementsValidation = validateRendererRequirements(capabilities, dedupedRequirements);

  for (const partial of requirementsValidation.partial) {
    if (!SAFE_PARTIAL_CAPABILITIES.has(partial)) {
      error("partial_capability_not_approved", partial, `${partial} is only partially supported.`);
    }
  }
  for (const unsupported of requirementsValidation.unsupported) {
    if (!SAFE_SELECTOR_DOWNGRADES.has(unsupported)) {
      error("unsupported_capability", unsupported, `${unsupported} is required by the recipe.`);
    }
  }

  const safePartialWarnings = requirementsValidation.warnings.filter((warning) =>
    [...SAFE_PARTIAL_CAPABILITIES].some((path) => warning.startsWith(`${path}:`)),
  );
  warnings.push(...safePartialWarnings);

  if (
    recipe.design.typography.heading_weight === 500 ||
    recipe.design.typography.body_weight === 500
  ) {
    downgrade(
      "font_weight_500_to_600",
      "design.typography",
      "500",
      "600",
      "The Basic renderer's approved weight list does not include 500.",
    );
  }

  const projection: BasicEditorRecipeProjectionV1 = {
    heroMode: hero.mode,
    identityAlignment: hero.identity_alignment,
    linksPresentation,
    primaryActionPresentation,
    background: backgroundCss(recipe),
    headingFont: fontNameForToken(recipe.design.typography.heading_family),
    bodyFont: fontNameForToken(recipe.design.typography.body_family),
    density: basicDensity(recipe.design.geometry.density),
    avatarShape: basicAvatarShape(recipe),
    buttonVariant: recipe.design.button.style,
    buttonRadius: basicRadius(recipe.design.button.shape),
    cardMediaPosition: recipe.design.card.media_position,
    visibleBlockTypes: recipe.blocks.map((block) => String(block.type)),
  };

  return {
    projection,
    requirements: dedupedRequirements,
    requirementsValidation,
    downgrades,
    warnings: unique(warnings),
    errors,
    unsupportedCapabilities: unique([
      ...requirementsValidation.unsupported,
      ...requirementsValidation.partial.filter((path) => !SAFE_PARTIAL_CAPABILITIES.has(path)),
    ]),
  };
}
