/**
 * ENGINE RESOLUTION LAYER (Level 1 -> Level 2)
 *
 * Semantic design decisions (luxury, spacious, high visual weight, strong CTA
 * pressure...) are translated into concrete Power Editor properties.
 *
 * Rules:
 *  - Deterministic: same recipe + same semantics => same resolved output.
 *  - Never emits a value the Power Editor cannot render.
 *  - Never emits a combination that breaks contrast or readability.
 */

import type {
  AnimationPreset,
  DecorativeFramePreset,
  MotionConfig,
  ThemeTexture,
  ThemeBackground,
  ThemeButtons,
  ThemeCards,
  ThemeColors,
  ThemeSpacing,
  ThemeTypography,
} from "@/premium-template-studio/types";
import type { DesignProfile, FamilyId, FontToken, PageRecipeV1 } from "../types";
import type { BusinessArchetype } from "../business-signals";
import type { PowerEditorCapabilities } from "./capabilities-v2";
import type {
  BackgroundMood,
  RecipeAvatarV2,
  RecipeBannerV2,
  RecipeLayoutV2,
  RecipeSemanticsV2,
  SurfaceMood,
} from "./types-v2";
import type { CompositionPattern } from "../composition-patterns";
import type { MediaStrategyV2 } from "./media-strategy-v2";

/* ----------------------------------------------------- archetype class */

/**
 * Coarse commercial class used to vary visual treatment across businesses.
 * Different archetypes must look meaningfully different, not just wear a
 * different accent color — this class is the semantic lever for that.
 */
type ArchetypeClass = "service" | "retail" | "portfolio" | "generic";

const SERVICE_ARCHETYPES: ReadonlySet<BusinessArchetype> = new Set<BusinessArchetype>([
  "home_service",
  "appointment_service",
  "professional_service",
  "hospitality",
  "food_service",
  "wellness",
  "education",
  "local_business",
  "digital_service",
]);

const RETAIL_ARCHETYPES: ReadonlySet<BusinessArchetype> = new Set<BusinessArchetype>([
  "retail",
  "custom_craft",
]);

const PORTFOLIO_ARCHETYPES: ReadonlySet<BusinessArchetype> = new Set<BusinessArchetype>([
  "portfolio_service",
  "events",
  "real_estate",
]);

function archetypeClass(archetype: BusinessArchetype): ArchetypeClass {
  if (SERVICE_ARCHETYPES.has(archetype)) return "service";
  if (RETAIL_ARCHETYPES.has(archetype)) return "retail";
  if (PORTFOLIO_ARCHETYPES.has(archetype)) return "portfolio";
  return "generic";
}

/* ------------------------------------------------------------- colors */

function toRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full.slice(0, 6) || "000000", 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Guarantees a readable foreground over `background`. */
export function ensureReadable(foreground: string, background: string, minimum = 4.5): string {
  if (contrastRatio(foreground, background) >= minimum) return foreground;
  const onDark = "#ffffff";
  const onLight = "#0b0b0c";
  return contrastRatio(onDark, background) >= contrastRatio(onLight, background) ? onDark : onLight;
}

export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.35;
}

export function resolveColors(recipe: PageRecipeV1): ThemeColors {
  const p = recipe.design.palette;
  const background = p.background;
  const text = ensureReadable(p.text, background, 4.5);
  const surface = p.surface;
  // The canonical theme has one primary and one accent token, while the
  // profile hero uses both as gradient endpoints. Some family palettes
  // intentionally reuse the accent for both tokens, which renders a flat
  // hero. Use the palette's existing readable text color as a deterministic
  // companion; no new color or random derivation is introduced.
  const accentKey = p.accent.toLowerCase();
  const heroAccent =
    [p.text, p.text_muted, p.surface, p.background].find(
      (candidate) =>
        candidate.toLowerCase() !== accentKey && contrastRatio(candidate, p.accent) >= 1.5,
    ) ??
    [p.text, p.text_muted, p.surface, p.background].find(
      (candidate) => candidate.toLowerCase() !== accentKey,
    ) ??
    p.accent;
  return {
    primary: p.accent,
    secondary: ensureReadable(p.text_muted, background, 3),
    accent: heroAccent,
    background,
    surface,
    card: surface,
    text,
    mutedText: ensureReadable(p.text_muted, surface, 3),
    border: p.border,
  };
}

/* --------------------------------------------------------- semantics */

export function resolveVisualWeight(profile: DesignProfile): RecipeSemanticsV2["visual_weight"] {
  const weight = profile.visual_energy * 0.5 + profile.media_weight * 0.5;
  if (weight >= 62) return "high";
  if (weight >= 38) return "medium";
  return "light";
}

export function resolveSurfaceMood(
  family: FamilyId,
  profile: DesignProfile,
  cardStyle: PageRecipeV1["design"]["card"]["style"],
): SurfaceMood {
  if (family === "luxury") return "luxury";
  if (family === "minimal") return "minimal";
  if (family === "editorial") return cardStyle === "elevated" ? "soft" : "flat";
  if (family === "energetic") return profile.visual_energy >= 60 ? "glass" : "elevated";
  if (family === "creator") return profile.media_weight >= 55 ? "glass" : "soft";
  return cardStyle === "elevated" ? "elevated" : "soft"; // corporate
}

export function resolveBackgroundMood(
  family: FamilyId,
  profile: DesignProfile,
  background: PageRecipeV1["design"]["background"],
): BackgroundMood {
  if (family === "luxury") return "premium-dark";
  if (family === "editorial") return "paper";
  if (family === "minimal") return "clean";
  if (family === "energetic") return profile.visual_energy >= 55 ? "vivid" : "tinted";
  if (family === "creator") return background.type === "solid" ? "textured" : "tinted";
  return background.type === "solid" ? "clean" : "tinted"; // corporate
}

/* -------------------------------------------------------- typography */

/**
 * The host application does not load a web-font provider. Keep the Engine's
 * semantic tokens, but resolve them to browser/system families that can be
 * rendered without a new dependency or a network font request.
 */
const FONT_STACKS: Record<FontToken, string> = {
  "sans-geometric": 'Arial, "Helvetica Neue", sans-serif',
  "sans-neutral": 'system-ui, -apple-system, "Segoe UI", sans-serif',
  "sans-humanist": '"Trebuchet MS", "Segoe UI", sans-serif',
  "serif-display": 'Georgia, "Times New Roman", serif',
  "serif-text": '"Times New Roman", Times, serif',
};

const HEADING_BASE: Record<"sm" | "md" | "lg", number> = { sm: 30, md: 36, lg: 44 };
const BODY_BASE: Record<"sm" | "md" | "lg", number> = { sm: 14, md: 15, lg: 16 };

const FAMILY_TRACKING: Record<FamilyId, number> = {
  editorial: -0.02,
  luxury: 0.02,
  corporate: -0.02,
  minimal: 0,
  creator: -0.03,
  energetic: -0.03,
};

export function resolveTypography(
  recipe: PageRecipeV1,
  semantics: Pick<RecipeSemanticsV2, "family" | "density" | "visual_weight" | "archetype">,
): ThemeTypography {
  const t = recipe.design.typography;
  const bump = semantics.visual_weight === "high" ? 4 : semantics.visual_weight === "light" ? -2 : 0;
  // A visible hero hierarchy: retail and portfolio lean editorial, services
  // stay a touch smaller and calmer so the CTA hierarchy reads first.
  const cls = archetypeClass(semantics.archetype);
  const heroBump = cls === "portfolio" ? 8 : cls === "retail" ? 6 : cls === "service" ? 4 : 0;
  const lineHeight =
    semantics.density === "compact" ? 1.45 : semantics.density === "spacious" ? 1.62 : 1.55;
  return {
    headingFont: FONT_STACKS[t.heading_family],
    bodyFont: FONT_STACKS[t.body_family],
    headingSize: Math.max(30, HEADING_BASE[t.heading_scale] + bump + heroBump),
    bodySize: BODY_BASE[t.body_scale],
    headingWeight: t.heading_weight,
    bodyWeight: t.body_weight,
    lineHeight,
    letterSpacing: FAMILY_TRACKING[semantics.family],
  };
}

/** Empty or whitespace-only media values must never open a media shell. */
export function hasUsableAsset(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/* -------------------------------------------------------- background */

const PATTERN_BY_FAMILY: Record<FamilyId, NonNullable<ThemeBackground["pattern"]>> = {
  editorial: "dots",
  luxury: "rings",
  corporate: "grid",
  minimal: "dots",
  creator: "dots",
  energetic: "rings",
};

export function resolveBackground(
  recipe: PageRecipeV1,
  colors: ThemeColors,
  semantics: Pick<
    RecipeSemanticsV2,
    "family" | "background_mood" | "visual_weight" | "media_strategy" | "archetype"
  >,
  capabilities: PowerEditorCapabilities,
): ThemeBackground {
  const source = recipe.design.background;

  // Image backgrounds are a deliberate V2 strategy, using only the supplied
  // profile banner. The frozen renderer already supports this contract.
  if (
    semantics.media_strategy === "immersive-background" &&
    hasUsableAsset(recipe.identity.banner) &&
    capabilities.background_image
  ) {
    return {
      type: "image",
      color: colors.background,
      imageUrl: recipe.identity.banner,
      overlay: 0.48,
      blur: 2,
    };
  }

  if (semantics.background_mood === "textured" && capabilities.background_pattern_dots) {
    return {
      type: "pattern",
      color: colors.background,
      pattern: PATTERN_BY_FAMILY[semantics.family],
    };
  }

  if (source.value.kind === "radial" && capabilities.background_radial_gradient) {
    return {
      type: "gradient",
      color: colors.background,
      gradient: {
        kind: "radial",
        angle: 0,
        from: source.value.from,
        to: source.value.to,
      },
    };
  }

  if (source.value.kind === "linear" && capabilities.background_linear_gradient) {
    return {
      type: "gradient",
      color: colors.background,
      gradient: {
        kind: "linear",
        angle: source.value.angle,
        from: source.value.from,
        to: source.value.to,
      },
    };
  }

  // Premium dark / vivid moods earn a gradient even from a solid V1 background.
  if (
    (semantics.background_mood === "premium-dark" || semantics.background_mood === "vivid") &&
    semantics.visual_weight !== "light" &&
    capabilities.background_radial_gradient
  ) {
    return {
      type: "gradient",
      color: colors.background,
      gradient: {
        kind: "radial",
        angle: 0,
        from: colors.surface,
        to: colors.background,
      },
    };
  }

  // Archetype-aware depth: every commercial class gets a subtle directional
  // gradient instead of a flat white sheet. This is the "not a plain page"
  // guarantee, while keeping readable contrast (surface -> background stays
  // within the approved palette).
  if (semantics.archetype !== "generic" && capabilities.background_linear_gradient) {
    const cls = archetypeClass(semantics.archetype);
    const angle = cls === "portfolio" ? 165 : cls === "retail" ? 180 : 155;
    return {
      type: "gradient",
      color: colors.background,
      gradient: {
        kind: "linear",
        angle,
        from: colors.surface,
        to: colors.background,
      },
    };
  }

  return { type: "solid", color: colors.background };
}

/* ------------------------------------------------------------- cards */

const RADIUS_TOKEN: Record<PageRecipeV1["design"]["geometry"]["radius"], number> = {
  sharp: 2,
  soft: 10,
  rounded: 20,
  pill: 28,
};

export function resolveCards(
  recipe: PageRecipeV1,
  semantics: Pick<
    RecipeSemanticsV2,
    "surface_mood" | "density" | "visual_weight" | "family" | "archetype"
  >,
  capabilities: PowerEditorCapabilities,
): ThemeCards {
  const geometry = recipe.design.geometry;
  let preset: ThemeCards["preset"] = semantics.surface_mood;
  if (preset === "glass" && !capabilities.card_preset_glass) preset = "elevated";
  if (preset === "luxury" && !capabilities.card_preset_luxury) preset = "flat";

  // Archetype-aware card material: services present trustworthy, elevated
  // cards; retail emphasizes media with soft cards; portfolio keeps cards
  // minimal/low-chrome so the images themselves lead.
  const cls = archetypeClass(semantics.archetype);
  if (cls === "service" && preset !== "luxury" && preset !== "glass") preset = "elevated";
  else if (cls === "retail" && preset !== "luxury" && preset !== "glass") preset = "soft";
  else if (cls === "portfolio") preset = "minimal";

  const radius = semantics.family === "luxury" ? 2 : RADIUS_TOKEN[geometry.radius];
  const borderWidth = geometry.border_style === "none" ? 0 : 1;
  const padding = semantics.density === "compact" ? 16 : semantics.density === "spacious" ? 24 : 20;

  let shadow: ThemeCards["shadow"] = "none";
  if (preset === "soft") shadow = "sm";
  if (preset === "elevated") shadow = semantics.visual_weight === "high" ? "lg" : "md";
  if (preset === "glass") shadow = "md";
  if (preset === "elevated" && semantics.family === "energetic" && capabilities.card_shadow_glow) {
    shadow = "glow";
  }

  return {
    preset,
    radius,
    borderWidth,
    shadow,
    blur: preset === "glass" ? (semantics.visual_weight === "high" ? 18 : 14) : 0,
    padding,
    opacity: preset === "glass" ? 0.55 : 1,
  };
}

/* ----------------------------------------------------------- buttons */

export function resolveButtons(
  recipe: PageRecipeV1,
  semantics: Pick<
    RecipeSemanticsV2,
    | "family"
    | "primary_goal"
    | "cta_pressure"
    | "density"
    | "visual_weight"
    | "surface_mood"
    | "archetype"
  >,
  capabilities: PowerEditorCapabilities,
): ThemeButtons {
  const button = recipe.design.button;
  const strong = semantics.cta_pressure >= 62;
  const soft = semantics.cta_pressure < 38;
  const directGoal = ["whatsapp", "booking", "sell", "leads"].includes(semantics.primary_goal);

  let variant: ThemeButtons["variant"];
  if (button.style === "outline") variant = "outline";
  else if (button.style === "soft") variant = "soft";
  else variant = "solid";

  // Archetype-aware CTA character: booking/services want a confident solid,
  // retail wants a commercial gradient, portfolio keeps chrome low with an
  // outline so the work stays the hero.
  const cls = archetypeClass(semantics.archetype);

  // Button treatment is a semantic decision, not just a palette decision.
  // Every branch stays inside the frozen ThemeButtons vocabulary.
  if (semantics.family === "luxury") variant = strong ? "outline" : "soft";
  else if (cls === "portfolio" && !directGoal && capabilities.button_outline) {
    variant = "outline";
  } else if (cls === "retail" && strong && capabilities.button_gradient) {
    variant = "gradient";
  } else if (cls === "service" && strong && capabilities.button_solid) {
    variant = "solid";
  } else if (semantics.family === "creator") {
    if (semantics.surface_mood === "glass" && capabilities.button_glass && !directGoal) {
      variant = "glass";
    } else if (!directGoal || soft) {
      variant = "soft";
    }
  } else if (semantics.family === "corporate" && directGoal && strong) variant = "solid";
  else if (semantics.family === "editorial" && soft) variant = "ghost";
  else if (semantics.family === "minimal" && soft) variant = "ghost";
  else if (semantics.family === "energetic" && strong && capabilities.button_gradient)
    variant = "gradient";
  else if (semantics.surface_mood === "glass" && capabilities.button_glass && !strong)
    variant = "glass";

  const variantCapability = `button_${variant}` as keyof PowerEditorCapabilities;
  if (!capabilities[variantCapability]) variant = "solid";

  const radius = semantics.family === "luxury" ? 2 : RADIUS_TOKEN[button.shape];
  const height =
    (semantics.density === "compact" ? 46 : semantics.density === "spacious" ? 54 : 50) +
    (strong ? 4 : 0);

  let shadow: ThemeButtons["shadow"] = "none";
  if (variant === "solid" || variant === "gradient") shadow = strong ? "md" : "sm";
  if (variant === "gradient" && semantics.visual_weight === "high" && capabilities.button_shadow) {
    shadow = "glow";
  }

  return {
    variant,
    radius: button.shape === "pill" ? 999 : radius,
    height,
    fontWeight: strong ? 650 : soft ? 500 : 570,
    shadow,
    borderWidth: variant === "outline" || variant === "glass" ? 1 : 0,
  };
}

/* ----------------------------------------------------------- spacing */

export function resolveSpacing(
  semantics: Pick<RecipeSemanticsV2, "density" | "family" | "archetype">,
  layoutId: RecipeLayoutV2["id"],
): ThemeSpacing {
  const section = semantics.density === "compact" ? 24 : semantics.density === "spacious" ? 40 : 32;
  const block = semantics.density === "compact" ? 12 : semantics.density === "spacious" ? 18 : 14;
  const cls = archetypeClass(semantics.archetype);
  const contentWidth =
    layoutId === "full-width"
      ? 680
      : layoutId === "portfolio" || layoutId === "bento"
      ? 720
      : cls === "retail" || cls === "portfolio"
        ? 680
        : semantics.family === "luxury" || semantics.family === "editorial"
          ? 600
          : 640;
  return { section, block, contentWidth };
}

/* ---------------------------------------------------------- animation */

export function resolveAnimation(semantics: Pick<RecipeSemanticsV2, "family" | "energy">): AnimationPreset {
  if (semantics.family === "minimal") return "fade";
  if (semantics.family === "luxury") return "soft-rise";
  if (semantics.family === "energetic") return semantics.energy >= 60 ? "scale" : "slide";
  if (semantics.family === "editorial") return "fade";
  return "soft-rise";
}

/* ------------------------------------------------------------- layout */

const PATTERN_LAYOUT: Record<CompositionPattern, RecipeLayoutV2["id"]> = {
  centered_profile: "centered",
  editorial_stack: "editorial",
  visual_cover: "full-width",
  conversion_first: "compact",
  portfolio_first: "portfolio",
  service_first: "split",
  trust_first: "executive",
  social_first: "profile-card",
  compact_action: "compact",
  media_story: "bento",
};

const HEADER_BY_LAYOUT: Record<RecipeLayoutV2["id"], RecipeLayoutV2["header"]> = {
  centered: "overlap",
  editorial: "stacked",
  bento: "hero",
  split: "inline",
  compact: "inline",
  "full-width": "hero",
  "profile-card": "overlap",
  portfolio: "stacked",
  executive: "stacked",
};

const COLUMNS: Partial<Record<RecipeLayoutV2["id"], [number, number]>> = {
  bento: [2, 2],
  split: [2, 1],
  portfolio: [2, 2],
};

export function resolveLayout(
  pattern: CompositionPattern,
  hasBanner: boolean,
  mediaStrategy: MediaStrategyV2 = "profile-first",
): RecipeLayoutV2 {
  let id = PATTERN_LAYOUT[pattern];
  // The same pattern can have a different top composition when its media
  // strategy changes. These are existing layout/header modes only.
  if (hasBanner && mediaStrategy === "immersive-background") id = "full-width";
  else if (hasBanner && mediaStrategy === "profile-first") {
    id = pattern === "social_first" ? "profile-card" : "centered";
  } else if (hasBanner && mediaStrategy === "gallery-first" && pattern === "media_story") {
    id = "bento";
  } else if (hasBanner && mediaStrategy === "video-first" && pattern === "media_story") {
    id = "bento";
  }
  // Never promise a banner-led layout when there is no banner asset.
  if (!hasBanner && (id === "full-width" || id === "bento")) id = "centered";
  const cols = COLUMNS[id] ?? [1, 1];
  return {
    id,
    header: HEADER_BY_LAYOUT[id],
    columns_desktop: cols[0],
    columns_tablet: cols[1],
  };
}

/* ------------------------------------------------------ avatar/banner */

export function resolveAvatar(
  recipe: PageRecipeV1,
  semantics: Pick<RecipeSemanticsV2, "family" | "visual_weight">,
  layout: RecipeLayoutV2,
): RecipeAvatarV2 {
  const shape = recipe.design.avatar.shape;
  const radius = shape === "circle" ? 999 : shape === "soft-square" ? 18 : 4;
  const align = recipe.design.avatar.alignment === "left" ? "left" : "center";
  const size = semantics.visual_weight === "high" ? 104 : semantics.family === "minimal" ? 84 : 96;
  return {
    size,
    radius,
    borderWidth: recipe.design.avatar.ring === "none" ? 0 : recipe.design.avatar.ring === "accent" ? 3 : 4,
    shadow: semantics.family !== "minimal" && semantics.family !== "editorial",
    overlap: layout.header === "overlap" ? Math.round(size / 2) : 0,
    align,
  };
}

export function resolveBanner(
  recipe: PageRecipeV1,
  semantics: Pick<RecipeSemanticsV2, "family" | "visual_weight" | "media_weight" | "archetype">,
): RecipeBannerV2 {
  const hasAsset = hasUsableAsset(recipe.identity.banner);
  const cls = archetypeClass(semantics.archetype);
  // A hero surface is warranted when there is a real banner OR a commercial
  // archetype that would otherwise open on a bare text header. The frozen
  // renderer draws a primary->accent gradient when no imageUrl is present, so
  // this is a gradient-led hero — never a fabricated photograph.
  const gradientHero = !hasAsset && cls !== "generic" && recipe.structure.hero.enabled;
  const enabled = (recipe.structure.hero.show_banner && hasAsset) || gradientHero;

  const tall = semantics.media_weight >= 55 || semantics.visual_weight === "high";
  const height = hasAsset
    ? tall
      ? 230
      : 180
    : cls === "portfolio"
      ? 260
      : cls === "retail"
        ? 240
        : 220;
  const rawFocalY = recipe.design.card.image_focal_y ?? 50;
  const focalY = Math.max(0, Math.min(100, rawFocalY <= 1 ? rawFocalY * 100 : rawFocalY));
  return {
    enabled,
    height,
    mobileHeight: Math.round(height * 0.72),
    overlay: semantics.family === "luxury" ? 0.4 : semantics.family === "energetic" ? 0.25 : 0.15,
    blur: semantics.family === "luxury" ? 2 : 0,
    gradient: true,
    focalX: 50,
    focalY: Math.round(focalY),
    radius: semantics.family === "luxury" ? 2 : recipe.design.geometry.radius === "sharp" ? 4 : 18,
  };
}

/* ------------------------------------------------------------ texture */

/**
 * V2: the frozen renderer ships CSS-only textures (grain | paper | linen |
 * mesh | frost). Texture is a semantic decision: it reinforces the family
 * material, it is never decoration for its own sake.
 */
export function resolveTexture(
  semantics: Pick<
    RecipeSemanticsV2,
    "family" | "background_mood" | "surface_mood" | "visual_weight"
  >,
  capabilities: PowerEditorCapabilities,
): ThemeTexture {
  const none: ThemeTexture = { preset: "none", opacity: 0 };
  if (!capabilities.texture_grain) return none;

  switch (semantics.family) {
    case "editorial":
      return capabilities.texture_paper
        ? { preset: "paper", opacity: semantics.visual_weight === "high" ? 0.1 : 0.07, scale: 28 }
        : none;
    case "luxury":
      return capabilities.texture_linen
        ? { preset: "linen", opacity: 0.08, scale: 22 }
        : none;
    case "creator":
      return capabilities.texture_grain
        ? { preset: "grain", opacity: semantics.visual_weight === "high" ? 0.12 : 0.08, scale: 18 }
        : none;
    case "energetic":
      return semantics.background_mood === "vivid" && capabilities.texture_mesh
        ? { preset: "mesh", opacity: 0.14, scale: 32 }
        : none;
    case "corporate":
      return semantics.surface_mood === "glass" && capabilities.texture_frost
        ? { preset: "frost", opacity: 0.1, scale: 26 }
        : none;
    default:
      return none; // minimal stays material-free on purpose
  }
}

/* ------------------------------------------------------------- frames */

/** V2: BlockStyle.frame. Reserved for emphasis blocks only. */
export function resolveFrame(
  semantics: Pick<RecipeSemanticsV2, "family" | "visual_weight" | "surface_mood">,
  emphasis: "primary" | "secondary",
  capabilities: PowerEditorCapabilities,
): DecorativeFramePreset {
  if (emphasis !== "primary") return "none";
  if (semantics.family === "luxury" && capabilities.frame_luxury) return "luxury";
  if (semantics.family === "editorial" && capabilities.frame_hairline) return "hairline";
  if (semantics.family === "minimal") return "none";
  if (semantics.family === "creator")
    return capabilities.frame_glow ? "glow" : capabilities.frame_gradient ? "gradient" : "none";
  if (semantics.family === "energetic" && semantics.visual_weight === "high" && capabilities.frame_glow)
    return "glow";
  if (semantics.surface_mood === "glass" && capabilities.frame_inset) return "inset";
  return capabilities.frame_hairline ? "hairline" : "none";
}

/* ------------------------------------------------------------- motion */

const MOTION_PRESET_BY_FAMILY: Record<FamilyId, MotionConfig["preset"]> = {
  editorial: "editorial",
  luxury: "soft",
  corporate: "minimal",
  minimal: "minimal",
  creator: "creator",
  energetic: "creator",
};

/** V2: the full MotionConfig contract, not just a single AnimationPreset. */
export function resolveMotion(
  semantics: Pick<RecipeSemanticsV2, "family" | "energy" | "density" | "visual_weight">,
  capabilities: PowerEditorCapabilities,
): MotionConfig {
  if (!capabilities.motion_presets) {
    return { preset: "none", entrance: "none", hover: "none", duration: 0, delay: 0, stagger: 0 };
  }

  const preset = MOTION_PRESET_BY_FAMILY[semantics.family];
  const entrance: MotionConfig["entrance"] =
    semantics.family === "minimal"
      ? "fade"
      : semantics.family === "luxury"
        ? "soft-rise"
        : semantics.energy >= 60
          ? "scale-in"
          : "slide-up";

  const hover: MotionConfig["hover"] =
    semantics.family === "minimal"
      ? "none"
      : semantics.family === "luxury"
        ? "border-emphasis"
        : semantics.visual_weight === "high"
          ? "lift"
          : "soft-scale";

  const duration = semantics.energy >= 60 ? 340 : semantics.family === "luxury" ? 620 : 480;
  const stagger = semantics.density === "compact" ? 40 : semantics.density === "spacious" ? 90 : 65;

  return {
    preset,
    entrance: capabilities.motion_entrance ? entrance : "none",
    hover: capabilities.motion_hover ? hover : "none",
    duration,
    delay: 0,
    stagger,
  };
}
