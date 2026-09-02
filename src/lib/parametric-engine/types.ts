/**
 * CRIPQER PARAMETRIC DESIGN ENGINE V1 — contracts.
 *
 * Pure data types. No JSX, no CSS strings, no browser APIs.
 */

/* ------------------------------------------------------------------ input */

export const PRIMARY_GOALS = [
  "whatsapp",
  "booking",
  "sell",
  "leads",
  "portfolio",
  "social",
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export const VISUAL_PERSONALITIES = [
  "elegant",
  "minimal",
  "modern",
  "professional",
  "energetic",
  "premium",
] as const;
export type VisualPersonality = (typeof VISUAL_PERSONALITIES)[number];

export const PRIMARY_ACTION_TYPES = [
  "whatsapp",
  "booking",
  "website",
  "instagram",
  "email",
] as const;
export type PrimaryActionType = (typeof PRIMARY_ACTION_TYPES)[number];

/** Mirror of the onboarding output contract (structurally compatible). */
export interface OnboardingIntentV1 {
  business_type: string;
  business_other: string | null;
  primary_goal: PrimaryGoal;
  visual_personality: VisualPersonality;
  identity: {
    name: string;
    profession: string;
    bio: string;
    avatar_preview: string | null;
    /** Optional cover/banner asset. Never invented by the engine. */
    banner_preview?: string | null;
  };
  /** Optional declared asset availability. Absent => not available. */
  assets?: { card_media?: boolean };
  primary_action: { type: PrimaryActionType; value: string };
  meta: { version: "1"; completed_at: string };
}

/* ------------------------------------------------------- normalized model */

export const BUSINESS_CATEGORIES = [
  "beauty",
  "professional",
  "creator",
  "food",
  "fitness",
  "local",
  "freelancer",
  "other",
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

/**
 * Asset presence is composition input only. It is intentionally separate
 * from the serialized asset URLs: a temporary blob avatar counts as present
 * while never entering PageRecipeV1.
 */
export interface AssetPresence {
  has_avatar: boolean;
  has_banner: boolean;
  has_card_media: boolean;
}

export interface NormalizedIntent {
  business_category: BusinessCategory;
  business_label: string | null;
  primary_goal: PrimaryGoal;
  visual_personality: VisualPersonality;
  identity: {
    name: string;
    profession: string;
    bio: string;
    avatar: string | null;
    banner: string | null;
  };
  assets: AssetPresence;
  primary_action: { type: PrimaryActionType; value: string };
  source_version: "1";
}

/* ------------------------------------------------------------- families */

export const FAMILY_IDS = [
  "editorial",
  "luxury",
  "corporate",
  "minimal",
  "creator",
  "energetic",
] as const;
export type FamilyId = (typeof FAMILY_IDS)[number];

/* ------------------------------------------------------- design profile */

export type Scale = "sm" | "md" | "lg";
export type Density = "compact" | "balanced" | "spacious";
export type RadiusToken = "sharp" | "soft" | "rounded" | "pill";
export type BorderStyle = "none" | "subtle" | "defined";
export type Alignment = "left" | "center";

export interface DesignProfile {
  family: FamilyId;
  family_scores: Record<FamilyId, number>;
  visual_energy: number; // 0-100 deterministic
  trust_weight: number; // 0-100 deterministic
  media_weight: number; // 0-100 deterministic
  cta_pressure: number; // 0-100 deterministic
}

/* ------------------------------------------------------- recipe: design */

export interface RecipePalette {
  background: string;
  surface: string;
  text: string;
  text_muted: string;
  accent: string;
  accent_contrast: string;
  border: string;
}

export const FONT_TOKENS = [
  "sans-geometric",
  "sans-neutral",
  "sans-humanist",
  "serif-display",
  "serif-text",
] as const;
export type FontToken = (typeof FONT_TOKENS)[number];

export const FONT_WEIGHTS = [400, 500, 600, 700] as const;
export type FontWeight = (typeof FONT_WEIGHTS)[number];

export interface RecipeTypography {
  heading_family: FontToken;
  body_family: FontToken;
  heading_weight: FontWeight;
  body_weight: FontWeight;
  heading_scale: Scale;
  body_scale: Scale;
}

export interface RecipeGeometry {
  radius: RadiusToken;
  border_style: BorderStyle;
  density: Density;
}

export type BackgroundType = "solid" | "linear-gradient" | "radial-gradient";

export interface RecipeBackground {
  type: BackgroundType;
  value:
    | { kind: "solid"; color: string }
    | { kind: "linear"; angle: number; from: string; to: string }
    | { kind: "radial"; position: "top" | "center"; from: string; to: string };
}

export interface RecipeAvatar {
  shape: "circle" | "soft-square" | "square";
  ring: "none" | "subtle" | "accent";
  alignment: Alignment;
}

export interface RecipeButton {
  style: "solid" | "outline" | "soft";
  shape: RadiusToken;
  alignment: Alignment;
  icon_position: "left" | "right";
}

export const HERO_MODES = ["avatar_only", "banner_only", "banner_avatar"] as const;
export type HeroMode = (typeof HERO_MODES)[number];

export type CardMediaPosition = "right" | "bottom" | "none";

export interface RecipeCard {
  enabled: boolean;
  media_position: CardMediaPosition;
  image_focal_y: number;
  style: "flat" | "bordered" | "elevated";
  action_style: "text" | "chip";
}

export interface RecipeSpacing {
  section_gap: Density;
  item_gap: Density;
  horizontal_padding: Density;
}

export interface RecipeDesign {
  palette: RecipePalette;
  typography: RecipeTypography;
  geometry: RecipeGeometry;
  background: RecipeBackground;
  avatar: RecipeAvatar;
  button: RecipeButton;
  card: RecipeCard;
  spacing: RecipeSpacing;
}

/* ---------------------------------------------------- recipe: structure */

export interface RecipeStructure {
  hero: {
    enabled: true;
    /** Composition intent, independent of actual asset availability. */
    mode: HeroMode;
    identity_alignment: Alignment;
    show_avatar: boolean;
    show_banner: boolean;
    show_profession: boolean;
    show_bio: boolean;
    show_professional_badge: boolean;
  };
  social_row: { enabled: boolean; position: "after_identity" | "after_primary_action" };
  primary_action: {
    enabled: true;
    presentation: "button" | "professional_card";
    cta_label: CanonicalCtaLabel;
  };
  links: { presentation: "buttons" | "cards" | "mixed"; max_primary_cards: number };
  footer: { enabled: true; style: "minimal" };
}

/* ------------------------------------------------------- semantic blocks */

export const SUPPORTED_BLOCK_TYPES = [
  "hero",
  "identity",
  "social_links",
  "primary_cta",
  "link_list",
  "professional_card",
  "media",
  "footer",
] as const;

/** Reserved for forward compatibility. The V1 generator never emits these. */
export const RESERVED_BLOCK_TYPES = [
  "product",
  "service",
  "booking_widget",
  "form",
  "social_proof",
  "testimonial",
] as const;

export type BlockType =
  | (typeof SUPPORTED_BLOCK_TYPES)[number]
  | (typeof RESERVED_BLOCK_TYPES)[number];

export interface RecipeBlock {
  id: string;
  type: BlockType;
  order: number;
  role: "identity" | "conversion" | "navigation" | "media" | "meta";
}

/* --------------------------------------------------- recipe: conversion */

export const CANONICAL_CTA_LABELS = [
  "Visitar",
  "Ver mi trabajo",
  "Reservar",
  "Más información",
] as const;
export type CanonicalCtaLabel = (typeof CANONICAL_CTA_LABELS)[number];

export interface RecipeConversion {
  primary_goal: PrimaryGoal;
  primary_cta: {
    type: PrimaryActionType;
    label: CanonicalCtaLabel;
    destination: string;
  };
  priority_order: PrimaryActionType[];
}

/* -------------------------------------------------------------- recipe */

export interface PageRecipeV1 {
  meta: {
    recipe_version: "1";
    engine_version: "1";
    source_intent_version: "1";
    generated_at: string;
    family: FamilyId;
    personality: VisualPersonality;
    primary_goal: PrimaryGoal;
  };
  identity: {
    name: string;
    profession: string;
    bio: string;
    avatar: string | null;
    banner: string | null;
  };
  design: RecipeDesign;
  structure: RecipeStructure;
  blocks: RecipeBlock[];
  conversion: RecipeConversion;
}

/* -------------------------------------------------------- capabilities */

export interface RendererCapabilitiesV1 {
  professional_cards: boolean;
  card_media_right: boolean;
  card_media_bottom: boolean;
  professional_badge: boolean;
  radial_background: boolean;
  gradient_background: boolean;
  media_block: boolean;
  social_links: boolean;
  elevated_cards: boolean;
  hero_banner: boolean;
  booking_widget: boolean;
  form_block: boolean;
  product_block: boolean;
}

/* ------------------------------------------------------------- results */

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/* ---------------------------------------------------- user design control */

export const OVERRIDE_KEYS = [
  "hero_mode",
  "links_presentation",
  "identity_alignment",
  "density",
  "card_media_position",
  "visual_family",
] as const;
export type OverrideKey = (typeof OVERRIDE_KEYS)[number];

/**
 * Explicit user control over composition. Any key left undefined stays
 * fully engine-driven. Keys listed in `locked` survive regeneration,
 * deterministic variant changes and safe compatibility passes.
 */
export interface DesignOverridesV1 {
  hero_mode?: HeroMode;
  links_presentation?: "buttons" | "cards" | "mixed";
  identity_alignment?: Alignment;
  density?: Density;
  card_media_position?: "right" | "bottom";
  visual_family?: FamilyId | null;
  locked?: OverrideKey[];
}

/**
 * V1.5.1 — advanced (candidate-only) design selection.
 *
 * Populated exclusively by advanced generation paths. When absent the
 * pipeline behaves exactly like V1/V1.5.
 */
export interface AdvancedSelectionV1 {
  /** Family-safe design axis values. Never crosses family boundaries. */
  axes?: {
    radius?: RadiusToken;
    border_style?: BorderStyle;
    background_type?: BackgroundType;
    avatar_shape?: RecipeAvatar["shape"];
    avatar_ring?: RecipeAvatar["ring"];
    button_style?: RecipeButton["style"];
    button_icon_position?: RecipeButton["icon_position"];
    card_style?: RecipeCard["style"];
    card_action_style?: RecipeCard["action_style"];
    heading_scale?: Scale;
    body_scale?: Scale;
    spacing_rhythm?: Density;
  };
  /** Contrast-validated palette from the approved advanced bank. */
  palette?: RecipePalette;
  /**
   * V1.5.1 — SOFT composition hint (advanced paths only).
   * Never present on baseline V1 calls. Capabilities, content availability,
   * hard compatibility and user locks always win over the hint.
   */
  pattern_hint?: string;
}

export interface EngineOptions {
  capabilities?: Partial<RendererCapabilitiesV1>;
  /** Explicit user design control. */
  overrides?: DesignOverridesV1;
  /**
   * V1.5 — OPTIONAL business/content context. When omitted the engine
   * behaves exactly like V1.
   */
  context?: import("./context").EngineContextV1;
  /** V1.5.1 — OPTIONAL advanced axis/palette selection. */
  advanced?: AdvancedSelectionV1;
  /** Deterministic variant selector. Same variant + intent => same recipe. */
  variant?: number;
  /** Injected only for meta.generated_at. Never influences design. */
  now?: string;
}

export type EngineErrorCode =
  | "INVALID_INTENT"
  | "INVALID_RECIPE"
  | "INVALID_CONTEXT"
  | "INVALID_OPTIONS";

export class EngineError extends Error {
  readonly code: EngineErrorCode;
  readonly issues: ValidationIssue[];
  constructor(code: EngineErrorCode, message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = "EngineError";
    this.code = code;
    this.issues = issues;
  }
}

export type EngineResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string; issues: ValidationIssue[] } };
