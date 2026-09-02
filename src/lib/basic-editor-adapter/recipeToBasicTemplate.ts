import { buildConfig } from "../basic-templates/config";
import { getTemplate, getTemplates } from "../basic-templates/catalog";
import { getRendererCapabilities } from "../renderer-capabilities";
import { validatePageRecipe, type PageRecipeV1 } from "../parametric-engine";
import type {
  BasicTemplateContent,
  ButtonStyleConfig,
  CardCtaLabel,
  FontPairConfig,
  LinkItem,
  PaletteConfig,
  SocialPlatform,
  TemplateDefinition,
} from "@/types/basic-templates";
import { basicRadius, fontNameForToken, inspectRecipeRenderability } from "./renderability";
import type {
  BasicEditorAdapterContentV1,
  BasicEditorAdapterDowngradeV1,
  BasicEditorCtaProjectionV1,
  BasicEditorAdapterInputV1,
  BasicEditorAdapterResultV1,
  BasicEditorTemplateEvaluationV1,
} from "./types";
import { mediaDiagnosticsForConfig, validateProjectedContrast } from "./qualityGuards";

const SOCIAL_PLATFORMS = new Set<SocialPlatform>([
  "instagram",
  "twitter",
  "facebook",
  "linkedin",
  "youtube",
  "tiktok",
  "whatsapp",
  "website",
  "email",
]);

const LOW_INFORMATION_CTA_LABELS = new Set([
  "más información",
  "visitar",
  "ver más",
  "abrir",
  "continuar",
  "conocer más",
]);

function ctaClassification(label: string): "high_information" | "low_information" {
  return LOW_INFORMATION_CTA_LABELS.has(label.trim().toLocaleLowerCase())
    ? "low_information"
    : "high_information";
}

const FAMILY_TEMPLATE_ORDER: Record<PageRecipeV1["meta"]["family"], readonly string[]> = {
  editorial: [
    "beauty-curve",
    "beauty-catalog",
    "sage",
    "luxury-fusion",
    "silver",
    "eudora",
    "amanda",
    "adriana",
    "executive-straight",
  ],
  luxury: [
    "luxury-fusion",
    "silver",
    "beauty-curve",
    "beauty-catalog",
    "eudora",
    "adriana",
    "amanda",
    "sage",
    "executive-straight",
  ],
  corporate: [
    "executive-straight",
    "beauty-catalog",
    "beauty-curve",
    "luxury-fusion",
    "silver",
    "eudora",
    "adriana",
    "amanda",
    "sage",
  ],
  minimal: [
    "adriana",
    "eudora",
    "silver",
    "sage",
    "beauty-curve",
    "luxury-fusion",
    "amanda",
    "beauty-catalog",
    "executive-straight",
  ],
  creator: [
    "amanda",
    "sage",
    "beauty-curve",
    "beauty-catalog",
    "eudora",
    "adriana",
    "silver",
    "luxury-fusion",
    "executive-straight",
  ],
  energetic: [
    "beauty-catalog",
    "amanda",
    "eudora",
    "beauty-curve",
    "sage",
    "adriana",
    "silver",
    "luxury-fusion",
    "executive-straight",
  ],
};

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function fontStack(name: string): string {
  return `${name}, system-ui, sans-serif`;
}

function weightToken(weight: 400 | 500 | 600 | 700): "normal" | "semibold" | "bold" {
  if (weight === 400) return "normal";
  if (weight === 700) return "bold";
  return "semibold";
}

function headingSize(scale: "sm" | "md" | "lg"): "md" | "lg" | "xl" {
  if (scale === "sm") return "md";
  if (scale === "lg") return "xl";
  return "lg";
}

function bodySize(scale: "sm" | "md" | "lg"): "sm" | "md" | "lg" {
  return scale;
}

function styleRadius(style: ButtonStyleConfig): "none" | "rounded" | "full" {
  if (style.shape === "sharp") return "none";
  if (style.shape === "pill") return "full";
  return "rounded";
}

function selectButtonStyle(
  template: TemplateDefinition,
  recipe: PageRecipeV1,
): { style: ButtonStyleConfig; downgrades: BasicEditorAdapterDowngradeV1[] } {
  const variant = recipe.design.button.style;
  const radius = basicRadius(recipe.design.button.shape);
  const styles = template.customization.buttonStyles;
  const exact = styles.find((style) => style.variant === variant && styleRadius(style) === radius);
  if (exact) return { style: exact, downgrades: [] };

  const sameVariant = styles.find((style) => style.variant === variant);
  const selected = sameVariant ?? styles[0];
  if (!selected) throw new Error(`Template ${template.id} has no approved button styles.`);
  const downgrades: BasicEditorAdapterDowngradeV1[] = [];
  if (selected.variant !== variant) {
    downgrades.push({
      code: "button_variant_fallback",
      path: "design.button.style",
      from: variant,
      to: selected.variant,
      reason: `Template ${template.id} does not expose the requested approved variant.`,
    });
  }
  if (styleRadius(selected) !== radius) {
    downgrades.push({
      code: "button_radius_fallback",
      path: "design.button.shape",
      from: radius,
      to: styleRadius(selected),
      reason: `Template ${template.id} normalizes this radius to an approved shape.`,
    });
  }
  return { style: selected, downgrades };
}

function normalizedPlatform(platform: string | undefined): string | undefined {
  const value = platform?.trim().toLowerCase();
  if (!value) return undefined;
  return value === "x" ? "twitter" : value;
}

function socialPlatform(platform: string | undefined): SocialPlatform | null {
  const value = normalizedPlatform(platform);
  return value && SOCIAL_PLATFORMS.has(value as SocialPlatform) ? (value as SocialPlatform) : null;
}

function renderedActionUrl(type: string, destination: string): string {
  const value = destination.trim();
  if (type === "whatsapp") {
    return `https://wa.me/${value.replace(/[^0-9]/g, "")}`;
  }
  if (type === "email" && !value.startsWith("mailto:")) return `mailto:${value}`;
  if (type === "instagram" && !/^https?:\/\//i.test(value)) {
    return `https://instagram.com/${value.replace(/^@/, "")}`;
  }
  return value;
}

function cardLink(
  link: BasicEditorAdapterInputV1["content"]["links"][number],
  recipe: PageRecipeV1,
  presentation: "button" | "card",
  allowDeclaredCardCta = false,
): LinkItem {
  const platform = normalizedPlatform(link.platform);
  if (presentation === "button") {
    return {
      id: link.id,
      label: link.label,
      url: link.url,
      enabled: true,
      ...(platform ? { platform } : {}),
      presentation: "button",
    };
  }

  const hasImage = Boolean(link.imageUrl?.trim());
  const mediaPosition = recipe.design.card.media_position === "bottom" ? "bottom" : "right";
  const normalized = platform?.toLowerCase();
  const genericPlatformFallback = !hasImage && (!normalized || normalized === "website");
  const mediaMode =
    recipe.design.card.media_position === "none" ? "none" : hasImage ? "image" : "platform_icon";
  return {
    id: link.id,
    label: link.label,
    url: link.url,
    enabled: true,
    ...(platform ? { platform } : {}),
    presentation: "card",
    card: {
      title: link.label.slice(0, 40),
      description: link.description?.trim().slice(0, 120) || "",
      ctaLabel:
        (allowDeclaredCardCta ? link.cardCtaLabel : undefined) ??
        (recipe.structure.primary_action.cta_label as CardCtaLabel),
      mediaMode: genericPlatformFallback ? "none" : mediaMode,
      mediaPosition,
      focalY: Math.min(100, Math.max(0, Math.round(recipe.design.card.image_focal_y))),
      imageUrl: hasImage ? link.imageUrl!.trim() : "",
      cornerStyle: recipe.design.geometry.radius === "sharp" ? "square" : "soft",
    },
  };
}

function contactFromLinks(links: readonly LinkItem[]) {
  const byPlatform = (platform: string) =>
    links.find((link) => link.platform === platform)?.url ?? "";
  const withoutPrefix = (value: string, prefix: string) =>
    value.startsWith(prefix) ? value.slice(prefix.length) : value;
  return {
    phone: withoutPrefix(byPlatform("phone"), "tel:"),
    email: withoutPrefix(byPlatform("email"), "mailto:"),
    whatsapp: withoutPrefix(byPlatform("whatsapp"), "https://wa.me/"),
  };
}

function buildContent(
  input: BasicEditorAdapterInputV1,
  projection: ReturnType<typeof inspectRecipeRenderability>["projection"],
  ctaProjection: BasicEditorCtaProjectionV1,
): BasicTemplateContent {
  const { recipe } = input;
  const primaryPresentation =
    projection.primaryActionPresentation === "professional_card" ? "card" : "button";
  const primaryLink: LinkItem = cardLink(
    {
      id: "engine-primary-action",
      label: ctaProjection.renderedLabel,
      url: renderedActionUrl(
        recipe.conversion.primary_cta.type,
        recipe.conversion.primary_cta.destination,
      ),
      platform: recipe.conversion.primary_cta.type,
      description: input.content.primaryAction?.description?.trim() || recipe.identity.profession,
      ...(input.content.primaryAction?.cardCtaLabel
        ? { cardCtaLabel: input.content.primaryAction.cardCtaLabel }
        : {}),
    },
    recipe,
    primaryPresentation,
    ctaProjection.contextualizationApplied,
  );

  let remainingCards = Math.max(
    0,
    recipe.structure.links.max_primary_cards - (primaryPresentation === "card" ? 1 : 0),
  );
  const secondary = input.content.links.map((link) => {
    const shouldCard = projection.linksPresentation !== "buttons" && remainingCards > 0;
    if (shouldCard && remainingCards > 0) remainingCards -= 1;
    return cardLink(
      link,
      recipe,
      shouldCard ? "card" : "button",
      ctaProjection.contextualizationApplied,
    );
  });
  const links = [primaryLink, ...secondary];
  const cards = links
    .filter((link) => link.presentation === "card" && link.card)
    .map((link) => ({
      id: link.id,
      imageUrl: link.card?.imageUrl || "",
      title: link.card?.title || link.label,
      description: link.card?.description || "",
      ctaLabel: link.card?.ctaLabel || recipe.structure.primary_action.cta_label,
      ctaUrl: link.url,
      enabled: link.enabled,
      ...(link.platform ? { platform: link.platform } : {}),
      ...(link.card?.mediaMode ? { mediaMode: link.card.mediaMode } : {}),
      ...(link.card?.mediaPosition ? { mediaPosition: link.card.mediaPosition } : {}),
      ...(link.card?.focalY === undefined ? {} : { focalY: link.card.focalY }),
      ...(link.card?.cornerStyle ? { cornerStyle: link.card.cornerStyle } : {}),
    }));
  const declaredSocials = input.content.socials ?? [];
  const socials = recipe.structure.social_row.enabled
    ? declaredSocials.map((social) => ({ ...social, enabled: true }))
    : [];

  return {
    profile: {
      avatarUrl: recipe.structure.hero.show_avatar ? recipe.identity.avatar || "" : "",
      heroUrl: recipe.structure.hero.show_banner ? recipe.identity.banner || "" : "",
      name: recipe.identity.name,
      subtitle: recipe.structure.hero.show_profession ? recipe.identity.profession : "",
      bio: recipe.structure.hero.show_bio ? recipe.identity.bio : "",
      footerEnabled: recipe.structure.footer.enabled,
      footerText: input.content.footerText?.trim() || "",
      ringEnabled: recipe.design.avatar.ring !== "none",
      ringColor:
        recipe.design.avatar.ring === "accent"
          ? recipe.design.palette.accent
          : recipe.design.palette.border,
      ringThickness: recipe.design.avatar.ring === "accent" ? "medium" : "thin",
      avatarShape: projection.avatarShape,
      professionalBadge: recipe.structure.hero.show_professional_badge,
      titleColor: recipe.design.palette.text,
      bioColor: recipe.design.palette.text_muted,
      titleFontFamily: fontNameForToken(recipe.design.typography.heading_family),
      bioFontFamily: fontNameForToken(recipe.design.typography.body_family),
      titleSize: headingSize(recipe.design.typography.heading_scale),
      titleWeight: weightToken(recipe.design.typography.heading_weight),
      titleAlign: recipe.structure.hero.identity_alignment,
      bioSize: bodySize(recipe.design.typography.body_scale),
      bioWeight: weightToken(recipe.design.typography.body_weight),
      bioAlign: recipe.structure.hero.identity_alignment,
    },
    links,
    cards,
    socials,
    contact: contactFromLinks(links),
  };
}

export function resolvePrimaryCtaProjection(
  recipe: PageRecipeV1,
  content: BasicEditorAdapterContentV1,
): BasicEditorCtaProjectionV1 {
  const originalLabel = recipe.conversion.primary_cta.label;
  const contextualLabel = content.primaryAction?.label.trim() || "";
  const classification = ctaClassification(originalLabel);
  const fixturePreferredLabel = contextualLabel || null;
  if (content.primaryAction?.locked) {
    return {
      originalLabel,
      fixturePreferredLabel,
      renderedLabel: originalLabel,
      classification,
      contextualizationApplied: false,
      reason: "cta_locked",
    };
  }
  if (classification === "high_information") {
    return {
      originalLabel,
      fixturePreferredLabel,
      renderedLabel: originalLabel,
      classification,
      contextualizationApplied: false,
      reason: "engine_label_specific",
    };
  }
  if (!contextualLabel) {
    return {
      originalLabel,
      fixturePreferredLabel,
      renderedLabel: originalLabel,
      classification,
      contextualizationApplied: false,
      reason: "no_contextual_label",
    };
  }
  return {
    originalLabel,
    fixturePreferredLabel,
    renderedLabel: contextualLabel,
    classification,
    contextualizationApplied: true,
    reason: "low_information_engine_label_contextualized",
  };
}

export function adaptRecipeToBasicTemplate(
  input: BasicEditorAdapterInputV1,
): BasicEditorAdapterResultV1 {
  let validation: ReturnType<typeof validatePageRecipe>;
  try {
    validation = validatePageRecipe(input.recipe);
  } catch (caught) {
    validation = {
      valid: false,
      issues: [
        {
          path: "recipe",
          code: "validation_error",
          message: caught instanceof Error ? caught.message : "Recipe validation failed.",
        },
      ],
    };
  }
  if (!validation.valid) {
    const rawBlocks = (input.recipe as unknown as { blocks?: unknown })?.blocks;
    const unsupportedCapabilities = Array.isArray(rawBlocks)
      ? unique(
          rawBlocks.flatMap((block) => {
            const type = (block as { type?: unknown })?.type;
            if (type === "product") return ["blocks.products"];
            if (type === "gallery") return ["blocks.gallery"];
            if (type === "service") return ["blocks.services"];
            if (type === "booking_widget") return ["blocks.bookingWidget"];
            if (type === "form") return ["blocks.contactForm"];
            if (type === "social_proof") return ["blocks.socialProof"];
            if (type === "testimonial") return ["blocks.testimonials"];
            return [];
          }),
        )
      : [];
    return {
      status: "incompatible",
      renderable: false,
      templateId: input.templateId,
      projection: null,
      requirementsValidation: {
        renderable: false,
        unsupported: unsupportedCapabilities,
        partial: [],
        warnings: [],
      },
      downgrades: [],
      warnings: [],
      errors: validation.issues.map((issue) => ({
        code: `invalid_recipe_${issue.code}`,
        path: issue.path,
        message: issue.message,
      })),
      unsupportedCapabilities,
      ctaProjection: null,
      mediaDiagnostics: [],
      contrast: null,
    };
  }

  const analysis = inspectRecipeRenderability(input);
  const ctaProjection = resolvePrimaryCtaProjection(input.recipe, input.content);
  const base = {
    templateId: input.templateId,
    projection: analysis.projection,
    requirementsValidation: analysis.requirementsValidation,
    warnings: analysis.warnings,
    errors: analysis.errors,
    unsupportedCapabilities: analysis.unsupportedCapabilities,
    ctaProjection,
    mediaDiagnostics: [],
    contrast: null,
  } as const;

  if (analysis.errors.length > 0) {
    return {
      ...base,
      status: "incompatible",
      renderable: false,
      downgrades: analysis.downgrades,
    };
  }

  let template: TemplateDefinition;
  try {
    template = getTemplate(input.templateId);
  } catch (caught) {
    return {
      ...base,
      status: "incompatible",
      renderable: false,
      downgrades: analysis.downgrades,
      errors: [
        ...analysis.errors,
        {
          code: "unknown_template",
          path: "templateId",
          message:
            caught instanceof Error ? caught.message : `Unknown template ${input.templateId}.`,
        },
      ],
      unsupportedCapabilities: unique([...analysis.unsupportedCapabilities, "templateId"]),
    };
  }

  const button = selectButtonStyle(template, input.recipe);
  const downgrades = [...analysis.downgrades, ...button.downgrades];
  const headingName = fontNameForToken(input.recipe.design.typography.heading_family);
  const bodyName = fontNameForToken(input.recipe.design.typography.body_family);
  const fontPair: FontPairConfig = {
    id: `engine-${headingName}-${bodyName}`.toLowerCase().replace(/\s+/g, "-"),
    name: `${headingName} / ${bodyName}`,
    heading: fontStack(headingName),
    body: fontStack(bodyName),
  };
  const palette: PaletteConfig = {
    id: `engine-${input.recipe.meta.family}`,
    name: `Engine · ${input.recipe.meta.family}`,
    background: analysis.projection.background,
    surface: input.recipe.design.palette.surface,
    text: input.recipe.design.palette.text,
    textMuted: input.recipe.design.palette.text_muted,
    accent: input.recipe.design.palette.accent,
    accentText: input.recipe.design.palette.accent_contrast,
  };
  const content = buildContent(input, analysis.projection, ctaProjection);
  const borderThickness =
    input.recipe.design.geometry.border_style === "none"
      ? "none"
      : input.recipe.design.geometry.border_style === "defined"
        ? "medium"
        : "thin";
  const config = buildConfig(template, content, {
    palette,
    fontPair,
    buttonStyle: button.style,
    profileCustomization: {
      button_border_thickness: borderThickness,
      button_border_color: input.recipe.design.palette.border,
      button_text_size: input.recipe.design.typography.body_scale,
      button_text_weight: weightToken(input.recipe.design.typography.heading_weight),
      button_content_align: input.recipe.design.button.alignment,
      button_icon_position: input.recipe.design.button.icon_position,
      theme_spacing: analysis.projection.density,
      banner_fusion_strength: 60,
    },
  });
  const contrast = validateProjectedContrast(config);

  return {
    ...base,
    status: downgrades.length > 0 ? "compatible_with_downgrade" : "compatible",
    renderable: true,
    downgrades,
    config,
    mediaDiagnostics: mediaDiagnosticsForConfig(config),
    contrast,
  };
}

export function evaluateRecipeTemplates(
  recipe: PageRecipeV1,
  content: BasicEditorAdapterInputV1["content"],
  options: Pick<BasicEditorAdapterInputV1, "runtimeContext" | "lockedOverrides"> = {},
): BasicEditorTemplateEvaluationV1[] {
  return getTemplates().map((template) => {
    const capabilities = getRendererCapabilities(template.id, options.runtimeContext);
    return {
      templateId: template.id,
      templateName: template.name,
      result: adaptRecipeToBasicTemplate({
        recipe,
        content,
        templateId: template.id,
        capabilities,
        ...options,
      }),
    };
  });
}

export function selectBestTemplateForRecipe(
  evaluations: readonly BasicEditorTemplateEvaluationV1[],
  family: PageRecipeV1["meta"]["family"],
): BasicEditorTemplateEvaluationV1 | null {
  const order = FAMILY_TEMPLATE_ORDER[family];
  return (
    [...evaluations]
      .filter((evaluation) => evaluation.result.renderable)
      .sort((left, right) => {
        const exact =
          Number(left.result.status !== "compatible") -
          Number(right.result.status !== "compatible");
        if (exact !== 0) return exact;
        return order.indexOf(left.templateId) - order.indexOf(right.templateId);
      })[0] ?? null
  );
}
